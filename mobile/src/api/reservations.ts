import { apiClient } from './client';
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

// ─── API ──────────────────────────────────────────────────────────────────────

export const reservationsApi = {
  /** Get reservation settings for an establishment (public fields needed for booking) */
  getSettings(establishmentId: string): Promise<SettingsResponse> {
    return apiClient.get<SettingsResponse>(
      `/api/establishments/${establishmentId}/reservations/settings`
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

  /** Get current user's reservations */
  getMyReservations(status: 'upcoming' | 'past'): Promise<MyReservationsResponse> {
    return apiClient.get<MyReservationsResponse>(
      `/api/me/reservations?status=${status}`
    );
  },

  /** Cancel a reservation */
  cancel(reservationId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `/api/reservations/${reservationId}/cancel`
    );
  },
};
