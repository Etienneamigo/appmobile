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
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
  pageSize?: number;
}

export const activitiesApi = {
  list(params: ActivitiesSearchParams = {}): Promise<ActivitiesListResponse> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.city) queryParams.append('city', params.city);
    if (params.type) queryParams.append('type', params.type);
    if (params.lat != null) queryParams.append('lat', params.lat.toString());
    if (params.lng != null) queryParams.append('lng', params.lng.toString());
    if (params.radiusKm != null) queryParams.append('radiusKm', params.radiusKm.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const query = queryParams.toString();
    return apiClient.get<ActivitiesListResponse>(
      `/api/mobile/activities${query ? `?${query}` : ''}`
    );
  },

  // Alias used by SearchScreen
  search(params: ActivitiesSearchParams = {}): Promise<ActivitiesListResponse> {
    return this.list(params);
  },

  getById(id: string): Promise<ActivityDetail> {
    return apiClient.get<ActivityDetail>(`/api/mobile/activities/${id}`);
  },
};
