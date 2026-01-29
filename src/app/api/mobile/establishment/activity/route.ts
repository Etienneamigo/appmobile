import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../../_helpers/rl"
import { ActivityStatus, ActivityType, UserRole } from "@prisma/client"

function isEnumValue<T extends Record<string,string>>(enm: T, v: any): v is T[keyof T] {
  return Object.values(enm).includes(v)
}

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  if (user.role !== UserRole.ESTABLISHMENT || !user.establishmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const activity = await prisma.activity.findUnique({
    where: { establishmentId: user.establishmentId },
    include: { medias: { orderBy: { createdAt: "asc" } } },
  })

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(activity)
}

export async function PATCH(request: NextRequest) {
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

  let body: any
  try { body = await request.json() } catch { body = {} }

  const data: any = {}
  const fields = [
    "type","title","description","address","city","zipCode","country","lat","lng",
    "minPeople","maxPeople","durationMinutes","priceFrom","scheduleText","tags","status"
  ] as const
  for (const k of fields) {
    if (k in body) data[k] = body[k]
  }

  if ("type" in data && !isEnumValue(ActivityType as any, data.type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  if ("status" in data && !isEnumValue(ActivityStatus as any, data.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  if ("tags" in data) {
    if (!Array.isArray(data.tags) || !data.tags.every((x: any) => typeof x === "string")) {
      return NextResponse.json({ error: "Invalid tags" }, { status: 400 })
    }
    data.tags = { set: data.tags }
  }

  const updated = await prisma.activity.update({
    where: { id: activity.id },
    data,
    include: { medias: { orderBy: { createdAt: "asc" } } },
  })

  return NextResponse.json(updated)
}
