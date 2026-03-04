import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"

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
  const status = searchParams.get("status")

  const where: Record<string, unknown> = { establishmentId: id }

  if (status) {
    where.status = status
  }

  if (dateFrom || dateTo) {
    where.startAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      user: { select: { email: true, name: true } },
      slot: { select: { id: true, startAt: true, endAt: true } },
      resource: { select: { id: true, name: true } },
      customValues: { include: { fieldDef: true } },
    },
    orderBy: { startAt: "asc" },
  })

  return NextResponse.json({ reservations })
}
