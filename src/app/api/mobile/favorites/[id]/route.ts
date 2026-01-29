import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../../_helpers/rl"
import { UserRole } from "@prisma/client"

export async function POST(request: NextRequest, ctx: { params: { id: string } }) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  if (user.role !== UserRole.USER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const activityId = ctx.params.id

  await prisma.favorite.upsert({
    where: { userId_activityId: { userId: user.id, activityId } },
    update: {},
    create: { userId: user.id, activityId },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  if (user.role !== UserRole.USER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const activityId = ctx.params.id

  await prisma.favorite.deleteMany({
    where: { userId: user.id, activityId },
  })

  return NextResponse.json({ ok: true })
}
