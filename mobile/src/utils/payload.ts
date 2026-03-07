/**
 * Payload sanitization helpers.
 * Cleans data before sending to the API to prevent Zod validation errors.
 */

/**
 * Safely parse a string to an integer.
 * Returns null if the value is empty, undefined, NaN, or not a finite number.
 */
export function safeParseInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Safely parse a string to a positive integer (>= 1).
 * Returns fallback if the result is < 1.
 */
export function safePositiveInt(value: unknown, fallback: number = 1): number {
  const n = safeParseInt(value);
  return n !== null && n >= 1 ? n : fallback;
}

/**
 * Safely parse a non-negative integer (>= 0).
 */
export function safeNonNegativeInt(value: unknown, fallback: number = 0): number {
  const n = safeParseInt(value);
  return n !== null && n >= 0 ? n : fallback;
}

/**
 * Cleans an optional string: returns undefined if empty/whitespace.
 */
export function cleanOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Removes keys with undefined/null/NaN values from an object (shallow).
 */
export function removeEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    (result as any)[key] = value;
  }
  return result;
}

/**
 * Convert weeklySchedule from Prisma array format to backend Record format.
 *
 * Real Prisma schema: WeeklySchedule { dayOfWeek: Int, openRanges: Json }
 * where openRanges = [{start:"HH:mm", end:"HH:mm"}, ...]
 *
 * Prisma GET returns: [{dayOfWeek: 1, openRanges: [{start:"09:00",end:"17:00"}]}, ...]
 * Backend PUT expects: {"1": [{start: "09:00", end: "17:00"}], ...}
 *
 * Handles:
 * - null/undefined → {}
 * - JSON string → parsed then normalized
 * - Prisma array [{dayOfWeek, openRanges: [{start,end}]}] → Record
 * - Legacy Prisma array [{dayOfWeek, startTime, endTime}] → Record
 * - Already-record {dayStr: [{start, end}]} → passthrough with normalization
 * - openRanges as JSON string per entry → parsed
 * - Filters out ranges where start === end (closed-day markers)
 */
export function normalizeWeeklySchedule(raw: unknown): Record<string, { start: string; end: string }[]> {
  if (raw === null || raw === undefined) return {};

  // Handle JSON string (e.g. openRanges stored as string)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return normalizeWeeklySchedule(parsed);
    } catch {
      return {};
    }
  }

  if (typeof raw !== 'object') return {};

  // Already in record format (keys are day numbers as strings)
  if (!Array.isArray(raw)) {
    const result: Record<string, { start: string; end: string }[]> = {};
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      // openRanges might be a JSON string per day
      let ranges: unknown[] | undefined;
      if (typeof val === 'string') {
        try { ranges = JSON.parse(val); } catch { /* skip */ }
      } else if (Array.isArray(val)) {
        ranges = val;
      }
      if (!Array.isArray(ranges)) continue;

      const validRanges = ranges
        .filter((r: any) => r && typeof r === 'object')
        .map((r: any) => ({
          start: extractTime(r.start, r.startTime),
          end: extractTime(r.end, r.endTime),
        }))
        .filter(r => r.start !== r.end); // filter closed-day markers

      if (validRanges.length > 0) {
        result[key] = validRanges;
      }
    }
    return result;
  }

  // Prisma array format: [{dayOfWeek, openRanges: [{start,end}]}, ...]
  // Also supports legacy format: [{dayOfWeek, startTime, endTime}, ...]
  const result: Record<string, { start: string; end: string }[]> = {};
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const day = String(entry.dayOfWeek ?? entry.day ?? '');
    if (day === '' || day === 'undefined') continue;

    // Real Prisma schema: openRanges is a Json field containing [{start, end}]
    const openRanges = entry.openRanges;
    if (openRanges != null) {
      // openRanges can be a JSON array or a JSON string
      let ranges: unknown[];
      if (typeof openRanges === 'string') {
        try { ranges = JSON.parse(openRanges); } catch { continue; }
      } else if (Array.isArray(openRanges)) {
        ranges = openRanges;
      } else {
        continue;
      }
      for (const r of ranges) {
        if (!r || typeof r !== 'object') continue;
        const start = extractTime((r as any).start, (r as any).startTime);
        const end = extractTime((r as any).end, (r as any).endTime);
        if (start === end) continue;
        if (!result[day]) result[day] = [];
        result[day].push({ start, end });
      }
      continue;
    }

    // Legacy fallback: startTime/endTime as direct fields
    const start = extractTime(entry.start, entry.startTime);
    const end = extractTime(entry.end, entry.endTime);
    if (start === end) continue;
    if (!result[day]) result[day] = [];
    result[day].push({ start, end });
  }
  return result;
}

/**
 * Extract a valid HH:MM time string from potential field values.
 * Prefers `primary` over `fallback`, returns '00:00' only as last resort.
 */
function extractTime(primary: unknown, fallback: unknown): string {
  for (const val of [primary, fallback]) {
    if (typeof val === 'string' && val.length >= 4) {
      // Accept HH:MM or HH:MM:SS
      const match = val.match(/^(\d{2}:\d{2})/);
      if (match) return match[1];
    }
  }
  return '00:00';
}

/**
 * Build a clean settings payload matching the backend Zod schema:
 *   enabled: boolean
 *   showExternalLinkAlso: boolean
 *   timezone: string
 *   slotDurationMinutes: int >= 15
 *   capacityPerSlot: int >= 1
 *   minPartySize: int >= 1
 *   maxPartySize: int >= 1
 *   minNoticeMinutes: int >= 0
 *   bookingWindowDays: int >= 1
 *   cancellationEnabled: boolean
 *   cancellationDeadlineHours: int >= 0
 *   confirmationMessage?: string
 *   cancellationPolicyText?: string
 *   resourceSelectionMode: enum
 *   weeklySchedule: Record<string, {start, end}[]>
 *   customFieldDefs: array
 */
export function buildSettingsPayload(form: Record<string, unknown>): Record<string, unknown> {
  const capacityPerSlot = safePositiveInt(form.capacityPerSlot, 1);

  return {
    enabled: Boolean(form.enabled),
    showExternalLinkAlso: Boolean(form.showExternalLinkAlso),
    timezone: typeof form.timezone === 'string' && form.timezone.length > 0
      ? form.timezone
      : 'Europe/Paris',
    slotDurationMinutes: safePositiveInt(form.slotDurationMinutes, 60),
    capacityPerSlot,
    minPartySize: safePositiveInt(form.minPartySize, 1),
    // maxPartySize = capacityPerSlot (single source of truth on mobile)
    maxPartySize: capacityPerSlot,
    minNoticeMinutes: safeNonNegativeInt(form.minNoticeMinutes, 0),
    bookingWindowDays: safePositiveInt(form.bookingWindowDays, 30),
    cancellationEnabled: Boolean(form.cancellationEnabled),
    cancellationDeadlineHours: safeNonNegativeInt(form.cancellationDeadlineHours, 0),
    confirmationMessage: cleanOptionalString(form.confirmationMessage),
    cancellationPolicyText: cleanOptionalString(form.cancellationPolicyText),
    resourceSelectionMode: ['HIDDEN', 'PICK_RESOURCE_FIRST', 'PICK_TIME_FIRST'].includes(
      form.resourceSelectionMode as string
    )
      ? form.resourceSelectionMode
      : 'HIDDEN',
    // Convert Prisma array format to Record<string, {start, end}[]> and remove invalid ranges
    weeklySchedule: sanitizeWeeklySchedule(normalizeWeeklySchedule(form.weeklySchedule)),
    customFieldDefs: Array.isArray(form.customFieldDefs)
      ? form.customFieldDefs.map((f: any) => ({
          ...(f.id ? { id: f.id } : {}),
          label: String(f.label || ''),
          type: f.type || 'TEXT',
          required: Boolean(f.required),
          optionsJson: Array.isArray(f.optionsJson) ? f.optionsJson : undefined,
          order: safeNonNegativeInt(f.order, 0),
        }))
      : [],
  };
}

/**
 * Build a clean generate-slots payload matching the backend Zod schema.
 * The backend expects: { action: 'generate', dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD' }
 */
export function buildGenerateSlotsPayload(days: number = 30): Record<string, unknown> {
  const now = new Date();
  const dateFrom = toISODateStr(now);
  const end = new Date(now);
  end.setDate(end.getDate() + Math.max(1, days));
  const dateTo = toISODateStr(end);

  return {
    action: 'generate',
    dateFrom,
    dateTo,
  };
}

function toISODateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Filter orphan slots: remove slots with resourceId=null when the establishment has resources.
 */
export function filterOrphanSlots<T extends { resourceId: string | null }>(
  slots: T[],
  hasResources: boolean,
): T[] {
  if (!hasResources) return slots;
  return slots.filter(slot => slot.resourceId !== null);
}

/**
 * Check if a time range is valid (start !== end).
 * A range where start === end (e.g. 00:00–00:00) is considered invalid/closed.
 */
export function isValidTimeRange(start: string, end: string): boolean {
  return start !== end;
}

/**
 * Filter out invalid ranges (start === end) from a weekly schedule record.
 * Returns only days with at least one valid range; days with no valid ranges are omitted.
 */
export function sanitizeWeeklySchedule(
  schedule: Record<string, { start: string; end: string }[]>
): Record<string, { start: string; end: string }[]> {
  const result: Record<string, { start: string; end: string }[]> = {};
  for (const [day, ranges] of Object.entries(schedule)) {
    const valid = ranges.filter(r => isValidTimeRange(r.start, r.end));
    if (valid.length > 0) {
      result[day] = valid;
    }
  }
  return result;
}

/**
 * Check whether a weekly schedule has at least one valid open day.
 */
export function hasAnyOpenDay(
  schedule: Record<string, { start: string; end: string }[]>
): boolean {
  return Object.values(schedule).some(
    ranges => ranges.some(r => isValidTimeRange(r.start, r.end))
  );
}

/**
 * Build a clean resource payload matching the backend Zod schema.
 */
export function buildResourcePayload(form: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: String(form.name || ''),
    capacity: safePositiveInt(form.capacity, 1),
    isActive: Boolean(form.isActive ?? true),
    description: cleanOptionalString(form.description) ?? null,
    useCustomRules: Boolean(form.useCustomRules),
  };

  if (payload.useCustomRules) {
    const minOverride = safeParseInt(form.minPartySizeOverride);
    const maxOverride = safeParseInt(form.maxPartySizeOverride);
    const durationOverride = safeParseInt(form.slotDurationMinutesOverride);
    const windowOverride = safeParseInt(form.bookingWindowDaysOverride);
    payload.minPartySizeOverride = minOverride !== null && minOverride >= 1 ? minOverride : null;
    payload.maxPartySizeOverride = maxOverride !== null && maxOverride >= 1 ? maxOverride : null;
    payload.slotDurationMinutesOverride = durationOverride !== null && durationOverride >= 15 ? durationOverride : null;
    payload.bookingWindowDaysOverride = windowOverride !== null && windowOverride >= 1 ? windowOverride : null;
  } else {
    payload.minPartySizeOverride = null;
    payload.maxPartySizeOverride = null;
    payload.slotDurationMinutesOverride = null;
    payload.bookingWindowDaysOverride = null;
  }

  return payload;
}
