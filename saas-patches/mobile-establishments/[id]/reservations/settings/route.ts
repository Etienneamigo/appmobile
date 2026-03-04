import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const { id } = await ctx.params

  const settings = await prisma.reservationSettings.findUnique({
    where: { establishmentId: id },
    select: {
      enabled: true,
      timezone: true,
      slotDurationMinutes: true,
      capacityPerSlot: true,
      minPartySize: true,
      maxPartySize: true,
      minNoticeMinutes: true,
      bookingWindowDays: true,
      resourceSelectionMode: true,
      customFieldDefs: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          required: true,
          optionsJson: true,
          order: true,
        },
      },
      showExternalLinkAlso: true,
      confirmationMessage: true,
      cancellationPolicyText: true,
      cancellationEnabled: true,
      cancellationDeadlineHours: true,
    },
  })

  if (!settings) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 })
  }

  return NextResponse.json({ settings })
}
