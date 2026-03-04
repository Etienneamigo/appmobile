import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  const { id } = await ctx.params

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { settings: true },
  })

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
  }

  // Verify the user owns this reservation
  if (reservation.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ error: "Reservation is already cancelled" }, { status: 400 })
  }

  // Check cancellation policy
  const settings = reservation.settings
  if (!settings.cancellationEnabled) {
    return NextResponse.json(
      { error: "Cancellations are not allowed for this establishment" },
      { status: 400 }
    )
  }

  const deadline = new Date(
    reservation.startAt.getTime() - settings.cancellationDeadlineHours * 3600 * 1000
  )
  if (new Date() > deadline) {
    return NextResponse.json(
      { error: `Cancellation deadline has passed (${settings.cancellationDeadlineHours}h before start)` },
      { status: 400 }
    )
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
