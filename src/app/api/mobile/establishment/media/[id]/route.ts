import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../../../_helpers/rl"
import { UserRole } from "@prisma/client"

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  if (user.role !== UserRole.ESTABLISHMENT || !user.establishmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const activity = await prisma.activity.findUnique({
    where: { establishmentId: user.establishmentId },
    select: { id: true },
  })
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const id = ctx.params.id
  const media = await prisma.media.findUnique({ where: { id }, select: { id: true, activityId: true } })
  if (!media || media.activityId !== activity.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.media.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
