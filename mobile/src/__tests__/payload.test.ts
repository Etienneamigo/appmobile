import {
  safeParseInt,
  safePositiveInt,
  safeNonNegativeInt,
  cleanOptionalString,
  removeEmpty,
  buildSettingsPayload,
  buildGenerateSlotsPayload,
  filterOrphanSlots,
  buildResourcePayload,
  normalizeWeeklySchedule,
  isValidTimeRange,
  sanitizeWeeklySchedule,
  hasAnyOpenDay,
} from '../utils/payload';

// ─── safeParseInt ─────────────────────────────────────────────────────────────

describe('safeParseInt', () => {
  it('parses valid integers', () => {
    expect(safeParseInt(42)).toBe(42);
    expect(safeParseInt('10')).toBe(10);
    expect(safeParseInt('0')).toBe(0);
  });

  it('returns null for empty/undefined/null', () => {
    expect(safeParseInt(null)).toBeNull();
    expect(safeParseInt(undefined)).toBeNull();
    expect(safeParseInt('')).toBeNull();
  });

  it('returns null for NaN/Infinity', () => {
    expect(safeParseInt(NaN)).toBeNull();
    expect(safeParseInt(Infinity)).toBeNull();
    expect(safeParseInt('abc')).toBeNull();
  });
});

// ─── safePositiveInt ──────────────────────────────────────────────────────────

describe('safePositiveInt', () => {
  it('returns number when >= 1', () => {
    expect(safePositiveInt(5)).toBe(5);
    expect(safePositiveInt('3')).toBe(3);
  });

  it('returns fallback for 0 or negative', () => {
    expect(safePositiveInt(0)).toBe(1);
    expect(safePositiveInt(-5)).toBe(1);
    expect(safePositiveInt(0, 10)).toBe(10);
  });

  it('returns fallback for invalid', () => {
    expect(safePositiveInt(null)).toBe(1);
    expect(safePositiveInt('')).toBe(1);
    expect(safePositiveInt('abc')).toBe(1);
  });
});

// ─── safeNonNegativeInt ───────────────────────────────────────────────────────

describe('safeNonNegativeInt', () => {
  it('returns 0 for zero', () => {
    expect(safeNonNegativeInt(0)).toBe(0);
    expect(safeNonNegativeInt('0')).toBe(0);
  });

  it('returns fallback for negative', () => {
    expect(safeNonNegativeInt(-1)).toBe(0);
  });
});

// ─── cleanOptionalString ──────────────────────────────────────────────────────

describe('cleanOptionalString', () => {
  it('returns trimmed string for non-empty', () => {
    expect(cleanOptionalString('  hello  ')).toBe('hello');
  });

  it('returns undefined for empty/whitespace', () => {
    expect(cleanOptionalString('')).toBeUndefined();
    expect(cleanOptionalString('   ')).toBeUndefined();
    expect(cleanOptionalString(null)).toBeUndefined();
    expect(cleanOptionalString(undefined)).toBeUndefined();
  });
});

// ─── removeEmpty ──────────────────────────────────────────────────────────────

describe('removeEmpty', () => {
  it('removes undefined keys', () => {
    expect(removeEmpty({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });

  it('removes NaN keys', () => {
    expect(removeEmpty({ a: NaN, b: 2 })).toEqual({ b: 2 });
  });

  it('keeps null and 0 and empty string', () => {
    expect(removeEmpty({ a: null, b: 0, c: '' })).toEqual({ a: null, b: 0, c: '' });
  });
});

// ─── buildSettingsPayload ─────────────────────────────────────────────────────

describe('buildSettingsPayload', () => {
  it('produces a valid payload from a form with numeric strings', () => {
    const form = {
      id: 'some-id',
      establishmentId: 'est-123',
      enabled: true,
      showExternalLinkAlso: false,
      timezone: 'Europe/Paris',
      slotDurationMinutes: '60', // string from TextInput
      capacityPerSlot: '10',
      minPartySize: '1',
      maxPartySize: '8',
      minNoticeMinutes: '30',
      bookingWindowDays: '14',
      cancellationEnabled: true,
      cancellationDeadlineHours: '24',
      confirmationMessage: 'Merci',
      cancellationPolicyText: '',
      resourceSelectionMode: 'HIDDEN',
      customFieldDefs: [],
    };

    const payload = buildSettingsPayload(form as any);

    // Should not contain id or establishmentId
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('establishmentId');

    // Should have correct types
    expect(typeof payload.slotDurationMinutes).toBe('number');
    expect(payload.slotDurationMinutes).toBe(60);
    expect(payload.capacityPerSlot).toBe(10);
    expect(payload.minPartySize).toBe(1);
    // maxPartySize should equal capacityPerSlot (unified field)
    expect(payload.maxPartySize).toBe(10);
    expect(payload.minNoticeMinutes).toBe(30);
    expect(payload.bookingWindowDays).toBe(14);
    expect(payload.cancellationDeadlineHours).toBe(24);
    expect(payload.confirmationMessage).toBe('Merci');
    expect(payload.cancellationPolicyText).toBeUndefined(); // empty string -> undefined
    expect(payload.weeklySchedule).toEqual({});
    expect(payload.customFieldDefs).toEqual([]);
  });

  it('handles all-empty/invalid values with safe defaults', () => {
    const payload = buildSettingsPayload({});

    expect(payload.enabled).toBe(false);
    expect(payload.timezone).toBe('Europe/Paris');
    expect(payload.slotDurationMinutes).toBe(60);
    expect(payload.capacityPerSlot).toBe(1);
    expect(payload.minPartySize).toBe(1);
    expect(payload.maxPartySize).toBe(1);
    expect(payload.minNoticeMinutes).toBe(0);
    expect(payload.bookingWindowDays).toBe(30);
    expect(payload.resourceSelectionMode).toBe('HIDDEN');
  });

  it('protects against NaN from parseInt on undefined/empty', () => {
    const form = {
      slotDurationMinutes: undefined,
      capacityPerSlot: '',
      minPartySize: NaN,
    };
    const payload = buildSettingsPayload(form as any);

    expect(Number.isFinite(payload.slotDurationMinutes)).toBe(true);
    expect(Number.isFinite(payload.capacityPerSlot as number)).toBe(true);
    expect(Number.isFinite(payload.minPartySize as number)).toBe(true);
  });

  it('converts Prisma weeklySchedule array to record format', () => {
    const form = {
      enabled: true,
      weeklySchedule: [
        { dayOfWeek: 0, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 0, startTime: '14:00', endTime: '18:00' },
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 3, startTime: '10:00', endTime: '16:00' },
      ],
    };

    const payload = buildSettingsPayload(form as any);
    const ws = payload.weeklySchedule as Record<string, Array<{ start: string; end: string }>>;

    // Should be a record keyed by day number
    expect(ws['0']).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ]);
    expect(ws['1']).toEqual([{ start: '09:00', end: '17:00' }]);
    expect(ws['3']).toEqual([{ start: '10:00', end: '16:00' }]);
    // Days not present should be absent
    expect(ws['2']).toBeUndefined();
  });

  it('passes through already-record weeklySchedule format', () => {
    const form = {
      enabled: true,
      weeklySchedule: {
        '1': [{ start: '08:00', end: '12:00' }],
        '5': [{ start: '10:00', end: '22:00' }],
      },
    };

    const payload = buildSettingsPayload(form as any);
    const ws = payload.weeklySchedule as Record<string, Array<{ start: string; end: string }>>;

    expect(ws['1']).toEqual([{ start: '08:00', end: '12:00' }]);
    expect(ws['5']).toEqual([{ start: '10:00', end: '22:00' }]);
  });

  it('sets maxPartySize = capacityPerSlot (unified field)', () => {
    const form = {
      capacityPerSlot: 20,
      maxPartySize: 5, // should be ignored, capacityPerSlot wins
    };

    const payload = buildSettingsPayload(form as any);
    expect(payload.capacityPerSlot).toBe(20);
    expect(payload.maxPartySize).toBe(20);
  });
});

// ─── buildGenerateSlotsPayload ────────────────────────────────────────────────

describe('buildGenerateSlotsPayload', () => {
  it('produces action=generate with dateFrom and dateTo', () => {
    const payload = buildGenerateSlotsPayload(30);

    expect(payload.action).toBe('generate');
    expect(payload.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload).not.toHaveProperty('days'); // backend doesn't accept 'days'
  });

  it('dateTo is after dateFrom', () => {
    const payload = buildGenerateSlotsPayload(7);
    expect(payload.dateTo! > payload.dateFrom!).toBe(true);
  });
});

// ─── filterOrphanSlots ────────────────────────────────────────────────────────

describe('filterOrphanSlots', () => {
  const slots = [
    { id: '1', resourceId: 'res-1', startAt: '2026-03-05T10:00:00Z' },
    { id: '2', resourceId: null, startAt: '2026-03-05T10:00:00Z' },
    { id: '3', resourceId: 'res-2', startAt: '2026-03-05T11:00:00Z' },
    { id: '4', resourceId: null, startAt: '2026-03-05T11:00:00Z' },
  ];

  it('filters out slots with null resourceId when establishment has resources', () => {
    const filtered = filterOrphanSlots(slots, true);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(s => s.resourceId !== null)).toBe(true);
  });

  it('keeps all slots when establishment has no resources', () => {
    const filtered = filterOrphanSlots(slots, false);
    expect(filtered).toHaveLength(4);
  });

  it('works with empty array', () => {
    expect(filterOrphanSlots([], true)).toEqual([]);
    expect(filterOrphanSlots([], false)).toEqual([]);
  });
});

// ─── buildResourcePayload ─────────────────────────────────────────────────────

describe('buildResourcePayload', () => {
  it('builds clean payload for resource without custom rules', () => {
    const payload = buildResourcePayload({
      name: 'Piste 1',
      capacity: '6',
      isActive: true,
      description: '  Grande piste  ',
      useCustomRules: false,
    });

    expect(payload.name).toBe('Piste 1');
    expect(payload.capacity).toBe(6);
    expect(payload.isActive).toBe(true);
    expect(payload.description).toBe('Grande piste');
    expect(payload.useCustomRules).toBe(false);
    expect(payload.minPartySizeOverride).toBeNull();
    expect(payload.maxPartySizeOverride).toBeNull();
    expect(payload.slotDurationMinutesOverride).toBeNull();
    expect(payload.bookingWindowDaysOverride).toBeNull();
  });

  it('builds clean payload with custom rules', () => {
    const payload = buildResourcePayload({
      name: 'Salle VIP',
      capacity: '10',
      isActive: true,
      description: '',
      useCustomRules: true,
      minPartySizeOverride: '2',
      maxPartySizeOverride: '8',
      slotDurationMinutesOverride: '90',
      bookingWindowDaysOverride: '7',
    });

    expect(payload.useCustomRules).toBe(true);
    expect(payload.minPartySizeOverride).toBe(2);
    expect(payload.maxPartySizeOverride).toBe(8);
    expect(payload.slotDurationMinutesOverride).toBe(90);
    expect(payload.bookingWindowDaysOverride).toBe(7);
    expect(payload.description).toBeNull(); // empty string -> null
  });

  it('nullifies invalid override values', () => {
    const payload = buildResourcePayload({
      name: 'Test',
      capacity: '1',
      useCustomRules: true,
      minPartySizeOverride: '0', // too small
      slotDurationMinutesOverride: '5', // less than 15 min
    });

    expect(payload.minPartySizeOverride).toBeNull();
    expect(payload.slotDurationMinutesOverride).toBeNull();
  });
});

// ─── isValidTimeRange ────────────────────────────────────────────────────────

describe('isValidTimeRange', () => {
  it('returns true when start !== end', () => {
    expect(isValidTimeRange('09:00', '18:00')).toBe(true);
    expect(isValidTimeRange('00:00', '23:59')).toBe(true);
  });

  it('returns false when start === end (e.g. 00:00–00:00)', () => {
    expect(isValidTimeRange('00:00', '00:00')).toBe(false);
    expect(isValidTimeRange('12:00', '12:00')).toBe(false);
  });
});

// ─── sanitizeWeeklySchedule ──────────────────────────────────────────────────

describe('sanitizeWeeklySchedule', () => {
  it('removes ranges where start === end', () => {
    const schedule = {
      '1': [{ start: '09:00', end: '18:00' }, { start: '00:00', end: '00:00' }],
      '2': [{ start: '00:00', end: '00:00' }],
      '3': [{ start: '10:00', end: '17:00' }],
    };
    const result = sanitizeWeeklySchedule(schedule);

    expect(result['1']).toEqual([{ start: '09:00', end: '18:00' }]);
    expect(result['2']).toBeUndefined(); // day removed entirely
    expect(result['3']).toEqual([{ start: '10:00', end: '17:00' }]);
  });

  it('returns empty object for all-closed schedule', () => {
    const schedule = {
      '0': [{ start: '00:00', end: '00:00' }],
      '1': [{ start: '12:00', end: '12:00' }],
    };
    expect(sanitizeWeeklySchedule(schedule)).toEqual({});
  });

  it('keeps valid ranges untouched', () => {
    const schedule = {
      '5': [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '22:00' }],
    };
    expect(sanitizeWeeklySchedule(schedule)).toEqual(schedule);
  });
});

// ─── hasAnyOpenDay ───────────────────────────────────────────────────────────

describe('hasAnyOpenDay', () => {
  it('returns true when at least one valid range exists', () => {
    expect(hasAnyOpenDay({ '1': [{ start: '09:00', end: '18:00' }] })).toBe(true);
  });

  it('returns false for empty schedule', () => {
    expect(hasAnyOpenDay({})).toBe(false);
  });

  it('returns false when all ranges are invalid (start === end)', () => {
    expect(hasAnyOpenDay({
      '0': [{ start: '00:00', end: '00:00' }],
      '3': [{ start: '12:00', end: '12:00' }],
    })).toBe(false);
  });
});

// ─── normalizeWeeklySchedule ─────────────────────────────────────────────────

describe('normalizeWeeklySchedule', () => {
  it('converts Prisma array format to record format', () => {
    const prismaFormat = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '22:00' },
    ];
    const result = normalizeWeeklySchedule(prismaFormat);

    expect(result['1']).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ]);
    expect(result['5']).toEqual([{ start: '10:00', end: '22:00' }]);
  });

  it('passes through already-record format', () => {
    const record = {
      '2': [{ start: '08:00', end: '16:00' }],
    };
    const result = normalizeWeeklySchedule(record);
    expect(result['2']).toEqual([{ start: '08:00', end: '16:00' }]);
  });

  it('returns empty object for null/undefined', () => {
    expect(normalizeWeeklySchedule(null)).toEqual({});
    expect(normalizeWeeklySchedule(undefined)).toEqual({});
  });

  it('returns empty object for empty array', () => {
    expect(normalizeWeeklySchedule([])).toEqual({});
  });

  it('handles JSON string input (openRanges as string)', () => {
    const jsonStr = JSON.stringify([
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
    ]);
    const result = normalizeWeeklySchedule(jsonStr);
    expect(result['1']).toEqual([{ start: '10:00', end: '19:00' }]);
    expect(result['3']).toEqual([{ start: '08:00', end: '17:00' }]);
  });

  it('handles JSON string record format', () => {
    const jsonStr = JSON.stringify({
      '1': [{ start: '10:00', end: '19:00' }],
    });
    const result = normalizeWeeklySchedule(jsonStr);
    expect(result['1']).toEqual([{ start: '10:00', end: '19:00' }]);
  });

  it('returns empty for invalid JSON string', () => {
    expect(normalizeWeeklySchedule('not-json')).toEqual({});
  });

  it('filters out start===end ranges (closed-day markers) from Prisma array', () => {
    const prismaFormat = [
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 2, startTime: '00:00', endTime: '00:00' },
      { dayOfWeek: 3, startTime: '12:00', endTime: '12:00' },
    ];
    const result = normalizeWeeklySchedule(prismaFormat);
    expect(result['1']).toEqual([{ start: '10:00', end: '19:00' }]);
    expect(result['2']).toBeUndefined();
    expect(result['3']).toBeUndefined();
  });

  it('filters out start===end ranges from record format', () => {
    const record = {
      '1': [{ start: '09:00', end: '18:00' }, { start: '00:00', end: '00:00' }],
      '2': [{ start: '00:00', end: '00:00' }],
    };
    const result = normalizeWeeklySchedule(record);
    expect(result['1']).toEqual([{ start: '09:00', end: '18:00' }]);
    expect(result['2']).toBeUndefined();
  });

  it('handles record with openRanges as string per day', () => {
    const record = {
      '1': JSON.stringify([{ start: '10:00', end: '19:00' }]),
      '4': JSON.stringify([{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }]),
    };
    const result = normalizeWeeklySchedule(record);
    expect(result['1']).toEqual([{ start: '10:00', end: '19:00' }]);
    expect(result['4']).toEqual([
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ]);
  });

  it('handles Prisma entries with id and settingsId fields', () => {
    const prismaFormat = [
      { id: 'abc', settingsId: 'xyz', dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
    ];
    const result = normalizeWeeklySchedule(prismaFormat);
    expect(result['1']).toEqual([{ start: '10:00', end: '19:00' }]);
  });

  it('closed day with no valid ranges produces empty result for that day', () => {
    const prismaFormat = [
      { dayOfWeek: 0, startTime: '00:00', endTime: '00:00' },
    ];
    const result = normalizeWeeklySchedule(prismaFormat);
    expect(result).toEqual({});
  });
});

// ─── normalizeWeeklySchedule integration scenario ────────────────────────────

describe('normalizeWeeklySchedule integration', () => {
  it('builds correct form values from realistic API response (not 00:00)', () => {
    // Simulate a realistic API response from GET owner settings
    const apiResponse = {
      settings: {
        id: 'settings-123',
        establishmentId: 'est-456',
        enabled: true,
        weeklySchedule: [
          { id: 'ws-1', settingsId: 'settings-123', dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
          { id: 'ws-2', settingsId: 'settings-123', dayOfWeek: 2, startTime: '10:00', endTime: '19:00' },
          { id: 'ws-3', settingsId: 'settings-123', dayOfWeek: 3, startTime: '10:00', endTime: '19:00' },
          { id: 'ws-4', settingsId: 'settings-123', dayOfWeek: 4, startTime: '10:00', endTime: '19:00' },
          { id: 'ws-5', settingsId: 'settings-123', dayOfWeek: 5, startTime: '10:00', endTime: '19:00' },
        ],
      },
    };

    const schedule = normalizeWeeklySchedule(apiResponse.settings.weeklySchedule);

    // Verify no day has 00:00
    for (const [day, ranges] of Object.entries(schedule)) {
      for (const range of ranges) {
        expect(range.start).not.toBe('00:00');
        expect(range.end).not.toBe('00:00');
        expect(range.start).toBe('10:00');
        expect(range.end).toBe('19:00');
      }
    }

    // Should have 5 days (Mon-Fri)
    expect(Object.keys(schedule)).toHaveLength(5);
    expect(schedule['1']).toBeDefined();
    expect(schedule['5']).toBeDefined();
    expect(schedule['0']).toBeUndefined(); // Sunday not set
    expect(schedule['6']).toBeUndefined(); // Saturday not set
  });
});

// ─── buildSettingsPayload sanitizes schedule ─────────────────────────────────

describe('buildSettingsPayload schedule sanitization', () => {
  it('removes 00:00-00:00 ranges from weeklySchedule', () => {
    const form = {
      enabled: true,
      weeklySchedule: {
        '1': [{ start: '09:00', end: '18:00' }],
        '2': [{ start: '00:00', end: '00:00' }],
      },
    };
    const payload = buildSettingsPayload(form as any);
    const ws = payload.weeklySchedule as Record<string, Array<{ start: string; end: string }>>;

    expect(ws['1']).toEqual([{ start: '09:00', end: '18:00' }]);
    expect(ws['2']).toBeUndefined();
  });

  it('treats a day with only start===end as closed (removed)', () => {
    const form = {
      enabled: true,
      weeklySchedule: [
        { dayOfWeek: 0, startTime: '10:00', endTime: '10:00' },
      ],
    };
    const payload = buildSettingsPayload(form as any);
    const ws = payload.weeklySchedule as Record<string, Array<{ start: string; end: string }>>;

    expect(ws['0']).toBeUndefined();
  });
});
