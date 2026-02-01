import { apiClient } from './client';
import {
  ActivityListItem,
  ActivityDetail,
} from '../types';

// Response shape from the backend API
export interface ActivitiesListResponse {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  items: ActivityListItem[];
}

export interface ActivitiesSearchParams {
  search?: string;
  city?: string;
  type?: string;
  page?: number;
  limit?: number;
  // Geolocation params (V4 - prepared for backend support)
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export const activitiesApi = {
  list(params: ActivitiesSearchParams = {}): Promise<ActivitiesListResponse> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.city) queryParams.append('city', params.city);
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    // V4: Geolocation params (sent to API, backend may not support yet)
    if (params.lat !== undefined) queryParams.append('lat', params.lat.toString());
    if (params.lng !== undefined) queryParams.append('lng', params.lng.toString());
    if (params.radiusKm !== undefined) queryParams.append('radiusKm', params.radiusKm.toString());

    const query = queryParams.toString();
    return apiClient.get<ActivitiesListResponse>(
      `/api/mobile/activities${query ? `?${query}` : ''}`
    );
  },

  getById(id: string): Promise<ActivityDetail> {
    return apiClient.get<ActivityDetail>(`/api/mobile/activities/${id}`);
  },
};
