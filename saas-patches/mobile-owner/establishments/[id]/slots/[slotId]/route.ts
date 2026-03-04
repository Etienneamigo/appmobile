import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"
import { z } from "zod"

const updateSlotSchema = z.object({
  isActive: z.boolean().optional(),
  capacity: z.number().int().min(1).optional(),
})

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; slotId: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id, slotId } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || user.establishmentId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await prisma.reservationSlot.findFirst({
    where: { id: slotId, establishmentId: id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSlotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const slot = await prisma.reservationSlot.update({
    where: { id: slotId },
    data: parsed.data,
  })

  return NextResponse.json({ slot })
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; slotId: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id, slotId } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || user.establishmentId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await prisma.reservationSlot.findFirst({
    where: { id: slotId, establishmentId: id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  }

  // Check for existing reservations
  const reservationCount = await prisma.reservation.count({
    where: { slotId, status: "CONFIRMED" },
  })

  if (reservationCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete slot with confirmed reservations" },
      { status: 400 }
    )
  }

  await prisma.reservationSlot.delete({ where: { id: slotId } })

  return NextResponse.json({ success: true })
}
