import { apiClient } from './client';
import {
  Establishment,
  MyActivity,
  Media,
  UploadResponse,
  MediaKind,
} from '../types';

interface EstablishmentResponse {
  data: Establishment;
}

interface MyActivityResponse {
  data: MyActivity | null;
  message?: string;
}

interface MediaListResponse {
  data: Media[];
}

interface MediaAddResponse {
  message: string;
  data: Media;
}

interface MessageResponse {
  message: string;
}

interface UpdateEstablishmentData {
  name?: string;
  phone?: string | null;
  website?: string | null;
  bookingUrl?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
}

interface UpdateActivityData {
  title?: string;
  description?: string;
  type?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  minPeople?: number | null;
  maxPeople?: number | null;
  durationMinutes?: number | null;
  priceFrom?: number | null;
  scheduleText?: string | null;
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export const establishmentApi = {
  // Establishment
  get(): Promise<EstablishmentResponse> {
    return apiClient.get<EstablishmentResponse>('/api/mobile/establishment');
  },

  update(data: UpdateEstablishmentData): Promise<EstablishmentResponse> {
    return apiClient.patch<EstablishmentResponse>('/api/mobile/establishment', data);
  },

  // Activity
  getActivity(): Promise<MyActivityResponse> {
    return apiClient.get<MyActivityResponse>('/api/mobile/establishment/activity');
  },

  updateActivity(data: UpdateActivityData): Promise<{ message: string; data: { id: string; title: string; status: string; updatedAt: string } }> {
    return apiClient.patch('/api/mobile/establishment/activity', data);
  },

  // Media
  getMedias(): Promise<MediaListResponse> {
    return apiClient.get<MediaListResponse>('/api/mobile/establishment/media');
  },

  addMedia(data: {
    url: string;
    kind: MediaKind;
    fileName?: string | null;
    fileSize?: number | null;
  }): Promise<MediaAddResponse> {
    return apiClient.post<MediaAddResponse>('/api/mobile/establishment/media', data);
  },

  deleteMedia(mediaId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`/api/mobile/establishment/media/${mediaId}`);
  },

  // Upload file (uses /api/upload which is shared with web)
  uploadFile(file: { uri: string; name: string; type: string }): Promise<UploadResponse> {
    return apiClient.uploadFile<UploadResponse>('/api/upload', file);
  },
};
