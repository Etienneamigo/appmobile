import { apiClient } from './client';
import { buildSettingsPayload, buildGenerateSlotsPayload, buildResourcePayload } from '../utils/payload';
import type {
  ReservationSettings,
  ReservationResource,
  SlotInfo,
  Reservation,
  CreateReservationPayload,
  AvailableResourceForSlot,
} from '../types';

// ─── Response shapes ──────────────────────────────────────────────────────────

interface AvailabilityResponse {
  slots: SlotInfo[];
}

interface ResourcesResponse {
  resources: ReservationResource[];
}

interface ResourcesForSlotResponse {
  resources: AvailableResourceForSlot[];
}

interface CreateReservationResponse {
  reservation: Reservation;
}

interface MyReservationsResponse {
  reservations: Reservation[];
}

interface SettingsResponse {
  settings: ReservationSettings | null;
}

// ─── Owner response shapes ───────────────────────────────────────────────────

interface OwnerReservationsResponse {
  reservations: Reservation[];
}

interface SlotResponse {
  slots: Array<{
    id: string;
    startAt: string;
    endAt: string;
    capacity: number;
    isActive: boolean;
    resourceId: string | null;
    resource: { id: string; name: string } | null;
    _count: { reservations: number };
  }>;
}

interface GenerateSlotsResponse {
  count: number;
  created?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const reservationsApi = {
  // ─── Public endpoints ───────────────────────────────────────────────────────

  /** Get reservation settings for an establishment (public - read-only) */
  getSettings(establishmentId: string): Promise<SettingsResponse> {
    return apiClient.get<SettingsResponse>(
      `/api/mobile/establishments/${establishmentId}/reservations/settings`
    );
  },

  /** Get available slots for a date */
  getAvailability(establishmentId: string, date: string): Promise<AvailabilityResponse> {
    return apiClient.get<AvailabilityResponse>(
      `/api/establishments/${establishmentId}/reservations/availability?date=${date}`
    );
  },

  /** Get active resources for an establishment */
  getResources(establishmentId: string): Promise<ResourcesResponse> {
    return apiClient.get<ResourcesResponse>(
      `/api/establishments/${establishmentId}/resources`
    );
  },

  /** Get available resources for a specific slot (PICK_TIME_FIRST flow) */
  getResourcesForSlot(
    establishmentId: string,
    startAt: string,
    partySize: number
  ): Promise<ResourcesForSlotResponse> {
    const params = new URLSearchParams({
      startAt,
      partySize: partySize.toString(),
    });
    return apiClient.get<ResourcesForSlotResponse>(
      `/api/establishments/${establishmentId}/resources/for-slot?${params.toString()}`
    );
  },

  /** Create a reservation */
  create(payload: CreateReservationPayload): Promise<CreateReservationResponse> {
    return apiClient.post<CreateReservationResponse>(
      `/api/establishments/${payload.establishmentId}/reservations`,
      payload
    );
  },

  // ─── User endpoints (mobile JWT) ───────────────────────────────────────────

  /** Get current user's reservations (mobile JWT endpoint) */
  getMyReservations(status: 'upcoming' | 'past'): Promise<MyReservationsResponse> {
    return apiClient.get<MyReservationsResponse>(
      `/api/mobile/me/reservations?status=${status}`
    );
  },

  /** Cancel a reservation (mobile JWT endpoint) */
  cancel(reservationId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `/api/mobile/reservations/${reservationId}/cancel`
    );
  },

  // ─── Owner endpoints (mobile JWT) ──────────────────────────────────────────

  /** Get reservation settings for own establishment (owner) */
  getOwnerSettings(establishmentId: string): Promise<SettingsResponse> {
    return apiClient.get<SettingsResponse>(
      `/api/mobile/owner/establishments/${establishmentId}/reservations/settings`
    );
  },

  /** Save reservation settings (owner) - sanitizes payload to match backend Zod schema */
  saveOwnerSettings(establishmentId: string, data: unknown): Promise<{ success: boolean }> {
    const cleanPayload = buildSettingsPayload(data as Record<string, unknown>);
    return apiClient.put<{ success: boolean }>(
      `/api/mobile/owner/establishments/${establishmentId}/reservations/settings`,
      cleanPayload
    );
  },

  /** List reservations for own establishment (owner) */
  getOwnerReservations(
    establishmentId: string,
    filters?: { dateFrom?: string; dateTo?: string; status?: string }
  ): Promise<OwnerReservationsResponse> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return apiClient.get<OwnerReservationsResponse>(
      `/api/mobile/owner/establishments/${establishmentId}/reservations${qs ? `?${qs}` : ''}`
    );
  },

  /** Cancel a reservation as owner */
  cancelAsOwner(reservationId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `/api/mobile/owner/reservations/${reservationId}/cancel`
    );
  },

  // ─── Owner resource endpoints ──────────────────────────────────────────────

  /** List resources for own establishment (owner - includes inactive) */
  getOwnerResources(establishmentId: string): Promise<ResourcesResponse> {
    return apiClient.get<ResourcesResponse>(
      `/api/mobile/owner/establishments/${establishmentId}/resources`
    );
  },

  /** Create a resource - sanitizes payload to match backend Zod schema */
  createResource(establishmentId: string, data: Partial<ReservationResource>): Promise<{ resource: ReservationResource }> {
    const cleanPayload = buildResourcePayload(data as Record<string, unknown>);
    return apiClient.post<{ resource: ReservationResource }>(
      `/api/mobile/owner/establishments/${establishmentId}/resources`,
      cleanPayload
    );
  },

  /** Update a resource - sanitizes payload to match backend Zod schema */
  updateResource(establishmentId: string, resourceId: string, data: Partial<ReservationResource>): Promise<{ resource: ReservationResource }> {
    const cleanPayload = buildResourcePayload(data as Record<string, unknown>);
    return apiClient.patch<{ resource: ReservationResource }>(
      `/api/mobile/owner/establishments/${establishmentId}/resources/${resourceId}`,
      cleanPayload
    );
  },

  /** Delete a resource */
  deleteResource(establishmentId: string, resourceId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `/api/mobile/owner/establishments/${establishmentId}/resources/${resourceId}`
    );
  },

  // ─── Owner slot endpoints ─────────────────────────────────────────────────

  /** List slots for own establishment */
  getOwnerSlots(
    establishmentId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SlotResponse> {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    return apiClient.get<SlotResponse>(
      `/api/mobile/owner/establishments/${establishmentId}/slots${qs ? `?${qs}` : ''}`
    );
  },

  /** Create a slot */
  createSlot(
    establishmentId: string,
    data: { startAt: string; endAt: string; capacity: number; isActive?: boolean; resourceId?: string | null }
  ): Promise<{ slot: unknown }> {
    return apiClient.post<{ slot: unknown }>(
      `/api/mobile/owner/establishments/${establishmentId}/slots`,
      data
    );
  },

  /** Generate slots from weekly schedule - uses dateFrom/dateTo as required by backend */
  generateSlots(establishmentId: string, days?: number): Promise<GenerateSlotsResponse> {
    const payload = buildGenerateSlotsPayload(days ?? 30);
    return apiClient.post<GenerateSlotsResponse>(
      `/api/mobile/owner/establishments/${establishmentId}/slots`,
      payload
    );
  },

  /** Toggle slot active status */
  updateSlot(
    establishmentId: string,
    slotId: string,
    data: { isActive?: boolean; capacity?: number }
  ): Promise<{ slot: unknown }> {
    return apiClient.patch<{ slot: unknown }>(
      `/api/mobile/owner/establishments/${establishmentId}/slots/${slotId}`,
      data
    );
  },

  /** Delete a slot */
  deleteSlot(establishmentId: string, slotId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `/api/mobile/owner/establishments/${establishmentId}/slots/${slotId}`
    );
  },
};
