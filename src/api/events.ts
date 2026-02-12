import { apiClient } from './client';
import { Event } from '../types';

interface CreateEventData {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
}

interface UpdateEventData {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
}

export const eventsApi = {
  list(): Promise<Event[]> {
    return apiClient.get<Event[]>('/api/mobile/establishment/events');
  },

  create(data: CreateEventData): Promise<Event> {
    return apiClient.post<Event>('/api/mobile/establishment/events', data);
  },

  update(eventId: string, data: UpdateEventData): Promise<Event> {
    return apiClient.patch<Event>(`/api/mobile/establishment/events/${eventId}`, data);
  },

  delete(eventId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/mobile/establishment/events/${eventId}`);
  },
};
