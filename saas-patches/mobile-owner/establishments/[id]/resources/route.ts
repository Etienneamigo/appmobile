import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"
import { z } from "zod"

const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.number().int().min(1),
  isActive: z.boolean().default(true),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  useCustomRules: z.boolean().default(false),
  minPartySizeOverride: z.number().int().min(1).optional().nullable(),
  maxPartySizeOverride: z.number().int().min(1).optional().nullable(),
  slotDurationMinutesOverride: z.number().int().min(15).max(480).optional().nullable(),
  bookingWindowDaysOverride: z.number().int().min(1).max(365).optional().nullable(),
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

  const resources = await prisma.reservationResource.findMany({
    where: { establishmentId: id },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ resources })
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

  const parsed = createResourceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const resource = await prisma.reservationResource.create({
    data: {
      establishmentId: id,
      ...parsed.data,
    },
  })

  return NextResponse.json({ resource }, { status: 201 })
}
