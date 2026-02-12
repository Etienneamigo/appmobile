import { apiClient } from './client';
import { ActivityListItem, ActivityDetail } from '../types';

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
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: 'distance' | 'popularity' | 'newest';
  adminPick?: boolean;
  zone2Tags?: string;
}

export const activitiesApi = {
  list(params: ActivitiesSearchParams = {}): Promise<ActivitiesListResponse> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.city) queryParams.append('city', params.city);
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.lat != null) queryParams.append('lat', params.lat.toString());
    if (params.lng != null) queryParams.append('lng', params.lng.toString());
    if (params.radiusKm != null) queryParams.append('radiusKm', params.radiusKm.toString());
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.adminPick) queryParams.append('adminPick', 'true');
    if (params.zone2Tags) queryParams.append('zone2Tags', params.zone2Tags);

    const query = queryParams.toString();
    return apiClient.get<ActivitiesListResponse>(
      `/api/mobile/activities${query ? `?${query}` : ''}`
    );
  },

  getById(id: string): Promise<ActivityDetail> {
    return apiClient.get<ActivityDetail>(`/api/mobile/activities/${id}`);
  },

  /**
   * Get popular activities for a location (progressive radius)
   */
  async getPopular(lat: number, lng: number, city: string, limit = 8): Promise<ActivityListItem[]> {
    const radii = [10, 25, 50];
    for (const radius of radii) {
      try {
        const res = await this.list({
          lat,
          lng,
          radiusKm: radius,
          sort: 'popularity',
          limit,
          city,
        });
        if (res.items.length >= 3) return res.items;
      } catch {
        continue;
      }
    }
    // Fallback: no radius filter
    try {
      const res = await this.list({ sort: 'popularity', limit, city });
      return res.items;
    } catch {
      return [];
    }
  },

  /**
   * Get evening activities (zone2Tags: soiree, after-work)
   */
  async getEvening(lat: number, lng: number, city: string, limit = 8): Promise<ActivityListItem[]> {
    const radii = [10, 25, 50];
    for (const radius of radii) {
      try {
        const res = await this.list({
          lat,
          lng,
          radiusKm: radius,
          zone2Tags: 'soiree,after-work',
          limit,
          city,
        });
        if (res.items.length >= 2) return res.items;
      } catch {
        continue;
      }
    }
    try {
      const res = await this.list({ zone2Tags: 'soiree,after-work', limit, city });
      return res.items;
    } catch {
      return [];
    }
  },

  /**
   * Get admin pick activities (Coup de coeur Wadelo)
   */
  async getAdminPicks(lat?: number, lng?: number, limit = 8): Promise<ActivityListItem[]> {
    try {
      const res = await this.list({
        adminPick: true,
        lat,
        lng,
        radiusKm: lat ? 50 : undefined,
        limit,
      });
      return res.items;
    } catch {
      return [];
    }
  },
};
