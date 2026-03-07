import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { z } from "zod"

/**
 * Real Prisma schema for WeeklySchedule:
 *   model WeeklySchedule {
 *     id         String   @id @default(cuid())
 *     settingsId String
 *     dayOfWeek  Int      // 0=Dimanche … 6=Samedi
 *     openRanges Json     // [{start:"HH:mm", end:"HH:mm"}]
 *     settings   ReservationSettings @relation(...)
 *     @@unique([settingsId, dayOfWeek])
 *   }
 */

const timeRangeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
})

const weeklyScheduleSchema = z.record(z.string(), z.array(timeRangeSchema))

const customFieldDefSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(["TEXT", "TEXTAREA", "NUMBER", "SELECT", "PHONE", "EMAIL", "CHECKBOX"]),
  required: z.boolean().default(false),
  optionsJson: z.array(z.string()).optional(),
  order: z.number().int().default(0),
})

const settingsSchema = z.object({
  enabled: z.boolean(),
  showExternalLinkAlso: z.boolean().default(false),
  timezone: z.string().default("Europe/Paris"),
  slotDurationMinutes: z.number().int().min(15).max(480),
  capacityPerSlot: z.number().int().min(1).max(10000),
  minPartySize: z.number().int().min(1),
  maxPartySize: z.number().int().min(1),
  minNoticeMinutes: z.number().int().min(0),
  bookingWindowDays: z.number().int().min(1).max(365),
  cancellationEnabled: z.boolean().default(true),
  cancellationDeadlineHours: z.number().int().min(0),
  confirmationMessage: z.string().optional(),
  cancellationPolicyText: z.string().optional(),
  resourceSelectionMode: z.enum(["HIDDEN", "PICK_RESOURCE_FIRST", "PICK_TIME_FIRST"]).default("HIDDEN"),
  weeklySchedule: weeklyScheduleSchema.default({}),
  customFieldDefs: z.array(customFieldDefSchema).default([]),
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

  const settings = await prisma.reservationSettings.findUnique({
    where: { establishmentId: id },
    include: {
      weeklySchedule: { orderBy: { dayOfWeek: "asc" } },
      customFieldDefs: { orderBy: { order: "asc" } },
    },
  })

  const overrides = await prisma.reservationOverride.findMany({
    where: { establishmentId: id },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ settings, overrides })
}

export async function PUT(
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

  const parsed = settingsSchema.safeParse(body)
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

  const { weeklySchedule, customFieldDefs, ...settingsData } = parsed.data

  await prisma.$transaction(async (tx) => {
    const settings = await tx.reservationSettings.upsert({
      where: { establishmentId: id },
      create: { establishmentId: id, ...settingsData },
      update: settingsData,
    })

    // Sync weekly schedule using openRanges Json field (real Prisma schema)
    await tx.weeklySchedule.deleteMany({ where: { settingsId: settings.id } })
    const scheduleEntries = Object.entries(weeklySchedule)
      .filter(([, ranges]) => ranges.length > 0)
      .map(([day, ranges]) => ({
        settingsId: settings.id,
        dayOfWeek: parseInt(day, 10),
        openRanges: ranges as unknown as Prisma.InputJsonValue,
      }))
    if (scheduleEntries.length > 0) {
      await tx.weeklySchedule.createMany({ data: scheduleEntries })
    }

    // Sync custom field defs
    const existingIds = customFieldDefs.filter((f) => f.id).map((f) => f.id as string)
    await tx.reservationCustomFieldDef.deleteMany({
      where: { settingsId: settings.id, id: { notIn: existingIds } },
    })
    for (const field of customFieldDefs) {
      const optionsJson = field.optionsJson?.length
        ? (field.optionsJson as Prisma.InputJsonValue)
        : Prisma.JsonNull
      const fieldData = {
        settingsId: settings.id,
        label: field.label,
        type: field.type,
        required: field.required,
        optionsJson,
        order: field.order,
      }
      if (field.id) {
        await tx.reservationCustomFieldDef.update({ where: { id: field.id }, data: fieldData })
      } else {
        await tx.reservationCustomFieldDef.create({ data: fieldData })
      }
    }
  })

  // Return fresh settings with weeklySchedule included
  const updated = await prisma.reservationSettings.findUnique({
    where: { establishmentId: id },
    include: {
      weeklySchedule: { orderBy: { dayOfWeek: "asc" } },
      customFieldDefs: { orderBy: { order: "asc" } },
    },
  })

  return NextResponse.json({ settings: updated })
}
