import { apiClient } from './client';
import {
  Establishment,
  MyActivity,
  Media,
  UploadResponse,
  MediaKind,
} from '../types';

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
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  coverMediaId?: string | null;
  status?: 'DRAFT' | 'PUBLISHED';
}

export const establishmentApi = {
  get(): Promise<Establishment> {
    return apiClient.get<Establishment>('/api/mobile/establishment');
  },

  update(data: UpdateEstablishmentData): Promise<Establishment> {
    return apiClient.patch<Establishment>('/api/mobile/establishment', data);
  },

  getActivity(): Promise<MyActivity | null> {
    return apiClient.get<MyActivity | null>('/api/mobile/establishment/activity');
  },

  createActivity(data: UpdateActivityData): Promise<{ message: string; data: { id: string; title: string; status: string } }> {
    return apiClient.post('/api/mobile/establishment/activity', data);
  },

  updateActivity(data: UpdateActivityData): Promise<{ message: string; data: { id: string; title: string; status: string; updatedAt: string } }> {
    return apiClient.patch('/api/mobile/establishment/activity', data);
  },

  getMedias(): Promise<Media[]> {
    return apiClient.get<Media[]>('/api/mobile/establishment/media');
  },

  addMedia(data: {
    url: string;
    kind: MediaKind;
    fileName?: string | null;
    fileSize?: number | null;
    cloudflareImageId?: string | null;
    thumbnailUrl?: string | null;
    title?: string | null;
    videoCategory?: string | null;
    sortOrder?: number;
  }): Promise<Media> {
    return apiClient.post<Media>('/api/mobile/establishment/media', data);
  },

  deleteMedia(mediaId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`/api/mobile/establishment/media/${mediaId}`);
  },

  uploadFile(file: { uri: string; name: string; type: string }): Promise<UploadResponse> {
    return apiClient.uploadFile<UploadResponse>('/api/upload', file);
  },
};
