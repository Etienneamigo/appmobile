import { apiClient } from './client';
import {
  ActivityListItem,
  ActivityDetail,
  Pagination,
} from '../types';

interface ActivitiesListResponse {
  data: ActivityListItem[];
  pagination: Pagination;
}

interface ActivityDetailResponse {
  data: ActivityDetail;
}

export interface ActivitiesSearchParams {
  search?: string;
  city?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const activitiesApi = {
  list(params: ActivitiesSearchParams = {}): Promise<ActivitiesListResponse> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.city) queryParams.append('city', params.city);
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiClient.get<ActivitiesListResponse>(
      `/api/mobile/activities${query ? `?${query}` : ''}`
    );
  },

  getById(id: string): Promise<ActivityDetailResponse> {
    return apiClient.get<ActivityDetailResponse>(`/api/mobile/activities/${id}`);
  },
};
