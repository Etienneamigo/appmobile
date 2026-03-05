import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"
import { getAvailableSlots } from "@/lib/availability"
import { z } from "zod"

const createSlotSchema = z.object({
  action: z.literal("generate").optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  capacity: z.number().int().min(1).optional(),
  resourceId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().default(true),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || user.establishmentId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const where: Record<string, unknown> = { establishmentId: id }

  if (dateFrom || dateTo) {
    where.startAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }

  const slots = await prisma.reservationSlot.findMany({
    where,
    include: {
      resource: { select: { id: true, name: true } },
      _count: { select: { reservations: true } },
    },
    orderBy: { startAt: "asc" },
  })

  return NextResponse.json({ slots })
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || user.establishmentId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSlotSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      {
        error: firstIssue.message,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
          code: i.code,
        })),
      },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Generate slots from schedule
  if (data.action === "generate") {
    if (!data.dateFrom || !data.dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo are required for generate action" },
        { status: 400 }
      )
    }

    const settings = await prisma.reservationSettings.findUnique({
      where: { establishmentId: id },
      include: {
        weeklySchedule: true,
      },
    })

    if (!settings) {
      return NextResponse.json(
        { error: "Reservation settings not found" },
        { status: 404 }
      )
    }

    const overrides = await prisma.reservationOverride.findMany({
      where: {
        establishmentId: id,
        date: {
          gte: new Date(data.dateFrom),
          lte: new Date(data.dateTo),
        },
      },
    })

    // Generate slots based on weekly schedule
    const generatedSlots: Array<{
      establishmentId: string
      startAt: Date
      endAt: Date
      capacity: number
      resourceId: string | null
      isActive: boolean
      source: "AUTO"
    }> = []

    const startDate = new Date(data.dateFrom)
    const endDate = new Date(data.dateTo)
    const slotDuration = settings.slotDurationMinutes

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      const dayOfWeek = d.getDay()

      // Check for override
      const override = overrides.find((o) => o.date.toISOString().slice(0, 10) === dateStr)
      if (override?.isClosed) continue

      const scheduleEntries = settings.weeklySchedule.filter(
        (ws) => ws.dayOfWeek === dayOfWeek
      )
      if (scheduleEntries.length === 0 && !override) continue

      const ranges = override?.customOpenRanges
        ? (override.customOpenRanges as Array<{ start: string; end: string }>)
        : scheduleEntries.map((ws) => ({ start: ws.startTime, end: ws.endTime }))

      const capacity = override?.customCapacity ?? settings.capacityPerSlot

      for (const range of ranges) {
        const [sh, sm] = range.start.split(":").map(Number)
        const [eh, em] = range.end.split(":").map(Number)
        const rangeStartMin = sh * 60 + sm
        const rangeEndMin = eh * 60 + em

        for (let min = rangeStartMin; min + slotDuration <= rangeEndMin; min += slotDuration) {
          const slotStart = new Date(d)
          slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000)

          generatedSlots.push({
            establishmentId: id,
            startAt: new Date(slotStart),
            endAt: new Date(slotEnd),
            capacity,
            resourceId: data.resourceId ?? null,
            isActive: true,
            source: "AUTO",
          })
        }
      }
    }

    if (generatedSlots.length === 0) {
      return NextResponse.json({ message: "No slots to generate", count: 0 })
    }

    const result = await prisma.reservationSlot.createMany({
      data: generatedSlots,
      skipDuplicates: true,
    })

    return NextResponse.json({ success: true, count: result.count }, { status: 201 })
  }

  // Create a single manual slot
  if (!data.startAt || !data.endAt || !data.capacity) {
    return NextResponse.json(
      { error: "startAt, endAt, and capacity are required for manual slot creation" },
      { status: 400 }
    )
  }

  const slot = await prisma.reservationSlot.create({
    data: {
      establishmentId: id,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      capacity: data.capacity,
      resourceId: data.resourceId ?? null,
      isActive: data.isActive,
      source: "MANUAL",
    },
  })

  return NextResponse.json({ slot }, { status: 201 })
}
