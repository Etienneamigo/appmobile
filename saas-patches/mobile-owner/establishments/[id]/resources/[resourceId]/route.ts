import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"
import { z } from "zod"

const updateResourceSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  useCustomRules: z.boolean().optional(),
  minPartySizeOverride: z.number().int().min(1).optional().nullable(),
  maxPartySizeOverride: z.number().int().min(1).optional().nullable(),
  slotDurationMinutesOverride: z.number().int().min(15).max(480).optional().nullable(),
  bookingWindowDaysOverride: z.number().int().min(1).max(365).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; resourceId: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id, resourceId } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || user.establishmentId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await prisma.reservationResource.findFirst({
    where: { id: resourceId, establishmentId: id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateResourceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const resource = await prisma.reservationResource.update({
    where: { id: resourceId },
    data: parsed.data,
  })

  return NextResponse.json({ resource })
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; resourceId: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id, resourceId } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || user.establishmentId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await prisma.reservationResource.findFirst({
    where: { id: resourceId, establishmentId: id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 })
  }

  await prisma.reservationResource.delete({ where: { id: resourceId } })

  return NextResponse.json({ success: true })
}
