import { apiClient } from './client';
import { FavoriteItem } from '../types';

// Response shape from the backend API - same as activities list
export interface FavoritesListResponse {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  items: FavoriteItem[];
}

interface ToggleFavoriteResponse {
  message: string;
  isFavorite: boolean;
}

export const favoritesApi = {
  list(page = 1, limit = 20): Promise<FavoritesListResponse> {
    return apiClient.get<FavoritesListResponse>(
      `/api/mobile/favorites?page=${page}&limit=${limit}`
    );
  },

  add(activityId: string): Promise<ToggleFavoriteResponse> {
    return apiClient.post<ToggleFavoriteResponse>(
      `/api/mobile/favorites/${activityId}`
    );
  },

  remove(activityId: string): Promise<ToggleFavoriteResponse> {
    return apiClient.delete<ToggleFavoriteResponse>(
      `/api/mobile/favorites/${activityId}`
    );
  },
};
