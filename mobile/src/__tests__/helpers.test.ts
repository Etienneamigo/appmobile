/**
 * Unit tests for booking helpers and resource selection mode mapping.
 *
 * These are framework-agnostic tests that validate the core business logic.
 * Run with: npx ts-node src/__tests__/helpers.test.ts
 * Or integrate with jest once configured.
 */

import type { ReservationResource, ReservationSettings, ResourceSelectionMode } from '../types';

// ─── Helper functions (extracted from BookingModal) ─────────────────────────

const getEffectiveRules = (
  resource: ReservationResource | null,
  settings: ReservationSettings
) => {
  if (!resource || !resource.useCustomRules) {
    return {
      minPartySize: settings.minPartySize,
      maxPartySize: settings.maxPartySize,
      slotDurationMinutes: settings.slotDurationMinutes,
      bookingWindowDays: settings.bookingWindowDays,
    };
  }
  return {
    minPartySize: resource.minPartySizeOverride ?? settings.minPartySize,
    maxPartySize: resource.maxPartySizeOverride ?? settings.maxPartySize,
    slotDurationMinutes: resource.slotDurationMinutesOverride ?? settings.slotDurationMinutes,
    bookingWindowDays: resource.bookingWindowDaysOverride ?? settings.bookingWindowDays,
  };
};

const generateDateOptions = (bookingWindowDays: number): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < Math.min(bookingWindowDays, 30); i++) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const isValidBookingUrl = (url: string): boolean => {
  return /^https?:\/\//i.test(url);
};

const getInitialStep = (mode: ResourceSelectionMode): string => {
  return mode === 'PICK_RESOURCE_FIRST' ? 'resource' : 'date';
};

const isAuthCheckEndpoint = (endpoint: string): boolean => {
  const AUTH_CHECK_ENDPOINTS = ['/api/mobile/me', '/api/mobile/login'];
  return AUTH_CHECK_ENDPOINTS.some(e => endpoint === e || endpoint.startsWith(e + '?'));
};

// ─── Test runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
  }
}

// ─── Test data ──────────────────────────────────────────────────────────────

const defaultSettings: ReservationSettings = {
  id: 'settings-1',
  establishmentId: 'est-1',
  enabled: true,
  showExternalLinkAlso: false,
  timezone: 'Europe/Paris',
  slotDurationMinutes: 60,
  capacityPerSlot: 10,
  minPartySize: 1,
  maxPartySize: 10,
  minNoticeMinutes: 120,
  bookingWindowDays: 30,
  cancellationEnabled: true,
  cancellationDeadlineHours: 24,
  confirmationMessage: null,
  cancellationPolicyText: null,
  resourceSelectionMode: 'HIDDEN',
  customFieldDefs: [],
};

const resourceNoOverrides: ReservationResource = {
  id: 'res-1',
  establishmentId: 'est-1',
  name: 'Salle A',
  capacity: 20,
  isActive: true,
  description: null,
  imageUrl: null,
  useCustomRules: false,
  minPartySizeOverride: null,
  maxPartySizeOverride: null,
  slotDurationMinutesOverride: null,
  bookingWindowDaysOverride: null,
};

const resourceWithOverrides: ReservationResource = {
  ...resourceNoOverrides,
  id: 'res-2',
  name: 'Salle VIP',
  useCustomRules: true,
  minPartySizeOverride: 2,
  maxPartySizeOverride: 6,
  slotDurationMinutesOverride: 90,
  bookingWindowDaysOverride: 14,
};

const resourcePartialOverrides: ReservationResource = {
  ...resourceNoOverrides,
  id: 'res-3',
  name: 'Salle B',
  useCustomRules: true,
  minPartySizeOverride: 3,
  maxPartySizeOverride: null, // Falls back to settings
  slotDurationMinutesOverride: null, // Falls back to settings
  bookingWindowDaysOverride: 7,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

console.log('\n=== getEffectiveRules tests ===');

{
  const rules = getEffectiveRules(null, defaultSettings);
  assertEqual(rules.minPartySize, 1, 'null resource -> uses settings minPartySize');
  assertEqual(rules.maxPartySize, 10, 'null resource -> uses settings maxPartySize');
  assertEqual(rules.slotDurationMinutes, 60, 'null resource -> uses settings slotDuration');
  assertEqual(rules.bookingWindowDays, 30, 'null resource -> uses settings bookingWindow');
}

{
  const rules = getEffectiveRules(resourceNoOverrides, defaultSettings);
  assertEqual(rules.minPartySize, 1, 'resource without custom rules -> uses settings');
  assertEqual(rules.maxPartySize, 10, 'resource without custom rules -> settings maxParty');
}

{
  const rules = getEffectiveRules(resourceWithOverrides, defaultSettings);
  assertEqual(rules.minPartySize, 2, 'resource with overrides -> uses override minPartySize');
  assertEqual(rules.maxPartySize, 6, 'resource with overrides -> uses override maxPartySize');
  assertEqual(rules.slotDurationMinutes, 90, 'resource with overrides -> uses override duration');
  assertEqual(rules.bookingWindowDays, 14, 'resource with overrides -> uses override bookingWindow');
}

{
  const rules = getEffectiveRules(resourcePartialOverrides, defaultSettings);
  assertEqual(rules.minPartySize, 3, 'partial overrides -> uses override minPartySize');
  assertEqual(rules.maxPartySize, 10, 'partial overrides -> falls back to settings maxPartySize');
  assertEqual(rules.slotDurationMinutes, 60, 'partial overrides -> falls back to settings duration');
  assertEqual(rules.bookingWindowDays, 7, 'partial overrides -> uses override bookingWindow');
}

console.log('\n=== generateDateOptions tests ===');

{
  const dates = generateDateOptions(7);
  assertEqual(dates.length, 7, 'generates 7 dates for 7-day window');
  assert(dates[0].match(/^\d{4}-\d{2}-\d{2}$/) !== null, 'dates are ISO format YYYY-MM-DD');
}

{
  const dates = generateDateOptions(45);
  assertEqual(dates.length, 30, 'caps at 30 dates even if window is 45');
}

{
  const dates = generateDateOptions(1);
  assertEqual(dates.length, 1, 'generates 1 date for 1-day window');
}

console.log('\n=== resourceSelectionMode mapping tests ===');

{
  assertEqual(getInitialStep('HIDDEN'), 'date', 'HIDDEN mode -> starts at date step');
  assertEqual(getInitialStep('PICK_RESOURCE_FIRST'), 'resource', 'PICK_RESOURCE_FIRST -> starts at resource step');
  assertEqual(getInitialStep('PICK_TIME_FIRST'), 'date', 'PICK_TIME_FIRST -> starts at date step');
}

console.log('\n=== URL validation tests ===');

{
  assert(isValidBookingUrl('https://example.com'), 'https URL is valid');
  assert(isValidBookingUrl('http://example.com'), 'http URL is valid');
  assert(isValidBookingUrl('HTTPS://EXAMPLE.COM'), 'uppercase HTTPS is valid');
  assert(!isValidBookingUrl('ftp://example.com'), 'ftp URL is invalid');
  assert(!isValidBookingUrl('example.com'), 'bare domain is invalid');
  assert(!isValidBookingUrl(''), 'empty string is invalid');
  assert(!isValidBookingUrl('javascript:alert(1)'), 'javascript: URL is invalid');
}

console.log('\n=== 401 handler endpoint detection tests ===');

{
  assert(isAuthCheckEndpoint('/api/mobile/me'), '/api/mobile/me is an auth check endpoint');
  assert(isAuthCheckEndpoint('/api/mobile/login'), '/api/mobile/login is an auth check endpoint');
  assert(!isAuthCheckEndpoint('/api/mobile/me/reservations'), '/api/mobile/me/reservations is NOT an auth check endpoint');
  assert(!isAuthCheckEndpoint('/api/me/reservations'), '/api/me/reservations is NOT an auth check endpoint');
  assert(!isAuthCheckEndpoint('/api/establishments/123/reservations'), 'establishment endpoint is NOT auth check');
  assert(!isAuthCheckEndpoint('/api/mobile/favorites'), 'favorites is NOT auth check');
  assert(isAuthCheckEndpoint('/api/mobile/me?foo=bar'), '/api/mobile/me with query params IS auth check');
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
