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
    expect(payload.maxPartySize).toBe(8);
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
