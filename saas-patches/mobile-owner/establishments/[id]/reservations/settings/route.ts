import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "@/app/api/mobile/_helpers/rl"
import { UserRole } from "@prisma/client"
import { z } from "zod"

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

  const settings = await prisma.reservationSettings.findUnique({
    where: { establishmentId: id },
    include: {
      weeklySchedule: { orderBy: { dayOfWeek: "asc" } },
      customFieldDefs: { orderBy: { order: "asc" } },
    },
  })

  const overrides = await prisma.reservationOverride.findMany({
    where: { establishmentId: id },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ settings, overrides })
}

export async function PUT(
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const timeRangeSchema = z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })

  const weeklyScheduleSchema = z.record(z.string(), z.array(timeRangeSchema))

  const customFieldDefSchema = z.object({
    id: z.string().optional(),
    label: z.string().min(1),
    type: z.enum(["TEXT", "TEXTAREA", "NUMBER", "SELECT", "PHONE", "EMAIL", "CHECKBOX"]),
    required: z.boolean().default(false),
    optionsJson: z.array(z.string()).optional(),
    order: z.number().int().default(0),
  })

  const settingsSchema = z.object({
    enabled: z.boolean(),
    showExternalLinkAlso: z.boolean().default(false),
    timezone: z.string().default("Europe/Paris"),
    slotDurationMinutes: z.number().int().min(15).max(480),
    capacityPerSlot: z.number().int().min(1).max(10000),
    minPartySize: z.number().int().min(1),
    maxPartySize: z.number().int().min(1),
    minNoticeMinutes: z.number().int().min(0),
    bookingWindowDays: z.number().int().min(1).max(365),
    cancellationEnabled: z.boolean().default(true),
    cancellationDeadlineHours: z.number().int().min(0),
    confirmationMessage: z.string().optional(),
    cancellationPolicyText: z.string().optional(),
    resourceSelectionMode: z.enum(["HIDDEN", "PICK_RESOURCE_FIRST", "PICK_TIME_FIRST"]).default("HIDDEN"),
    weeklySchedule: weeklyScheduleSchema.default({}),
    customFieldDefs: z.array(customFieldDefSchema).default([]),
  })

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      {
        error: firstIssue.message,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
          code: i.code,
        })),
      },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Upsert settings
  const settings = await prisma.reservationSettings.upsert({
    where: { establishmentId: id },
    update: {
      enabled: data.enabled,
      showExternalLinkAlso: data.showExternalLinkAlso,
      timezone: data.timezone,
      slotDurationMinutes: data.slotDurationMinutes,
      capacityPerSlot: data.capacityPerSlot,
      minPartySize: data.minPartySize,
      maxPartySize: data.maxPartySize,
      minNoticeMinutes: data.minNoticeMinutes,
      bookingWindowDays: data.bookingWindowDays,
      cancellationEnabled: data.cancellationEnabled,
      cancellationDeadlineHours: data.cancellationDeadlineHours,
      confirmationMessage: data.confirmationMessage ?? null,
      cancellationPolicyText: data.cancellationPolicyText ?? null,
      resourceSelectionMode: data.resourceSelectionMode,
    },
    create: {
      establishmentId: id,
      enabled: data.enabled,
      showExternalLinkAlso: data.showExternalLinkAlso,
      timezone: data.timezone,
      slotDurationMinutes: data.slotDurationMinutes,
      capacityPerSlot: data.capacityPerSlot,
      minPartySize: data.minPartySize,
      maxPartySize: data.maxPartySize,
      minNoticeMinutes: data.minNoticeMinutes,
      bookingWindowDays: data.bookingWindowDays,
      cancellationEnabled: data.cancellationEnabled,
      cancellationDeadlineHours: data.cancellationDeadlineHours,
      confirmationMessage: data.confirmationMessage ?? null,
      cancellationPolicyText: data.cancellationPolicyText ?? null,
      resourceSelectionMode: data.resourceSelectionMode,
    },
  })

  // Sync weekly schedule
  await prisma.weeklySchedule.deleteMany({ where: { settingsId: settings.id } })
  for (const [dayStr, ranges] of Object.entries(data.weeklySchedule)) {
    const dayOfWeek = parseInt(dayStr, 10)
    for (const range of ranges) {
      await prisma.weeklySchedule.create({
        data: {
          settingsId: settings.id,
          dayOfWeek,
          startTime: range.start,
          endTime: range.end,
        },
      })
    }
  }

  // Sync custom field defs
  const existingFieldIds = data.customFieldDefs
    .map((f) => f.id)
    .filter(Boolean) as string[]

  await prisma.reservationCustomFieldDef.deleteMany({
    where: {
      settingsId: settings.id,
      id: { notIn: existingFieldIds },
    },
  })

  for (const field of data.customFieldDefs) {
    if (field.id) {
      await prisma.reservationCustomFieldDef.update({
        where: { id: field.id },
        data: {
          label: field.label,
          type: field.type,
          required: field.required,
          optionsJson: field.optionsJson ?? [],
          order: field.order,
        },
      })
    } else {
      await prisma.reservationCustomFieldDef.create({
        data: {
          settingsId: settings.id,
          label: field.label,
          type: field.type,
          required: field.required,
          optionsJson: field.optionsJson ?? [],
          order: field.order,
        },
      })
    }
  }

  return NextResponse.json({ success: true, settings })
}
