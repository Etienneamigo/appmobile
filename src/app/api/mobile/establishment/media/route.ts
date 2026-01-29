import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../../_helpers/rl"
import { MediaKind, UserRole } from "@prisma/client"

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
    select: { id: true },
  })
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const medias = await prisma.media.findMany({
    where: { activityId: activity.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ items: medias })
}

export async function POST(request: NextRequest) {
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

  const { kind, url, fileName, fileSize } = body

  if (!isEnumValue(MediaKind as any, kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 })
  if (!url || typeof url !== "string") return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  if (fileName && typeof fileName !== "string") return NextResponse.json({ error: "Invalid fileName" }, { status: 400 })
  if (fileSize && typeof fileSize !== "number") return NextResponse.json({ error: "Invalid fileSize" }, { status: 400 })

  const created = await prisma.media.create({
    data: {
      activityId: activity.id,
      kind,
      url,
      fileName: fileName || null,
      fileSize: fileSize || null,
    },
  })

  return NextResponse.json(created)
}
