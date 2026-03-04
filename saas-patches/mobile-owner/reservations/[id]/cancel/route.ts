import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id } = await ctx.params

  if (user.role !== UserRole.ESTABLISHMENT || !user.establishmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  })

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
  }

  // Verify the reservation belongs to the owner's establishment
  if (reservation.establishmentId !== user.establishmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ error: "Reservation is already cancelled" }, { status: 400 })
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
