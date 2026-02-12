import { apiClient } from './client';
import { FeedResponse } from '../types';

export const feedApi = {
  getVideos(params: {
    cursor?: string;
    limit?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    seed?: number;
  } = {}): Promise<FeedResponse> {
    const queryParams = new URLSearchParams();
    if (params.cursor) queryParams.append('cursor', params.cursor);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.lat != null) queryParams.append('lat', params.lat.toString());
    if (params.lng != null) queryParams.append('lng', params.lng.toString());
    if (params.radius != null) queryParams.append('radius', params.radius.toString());
    if (params.seed != null) queryParams.append('seed', params.seed.toString());

    const query = queryParams.toString();
    return apiClient.get<FeedResponse>(
      `/api/feed/videos${query ? `?${query}` : ''}`,
      { skipAuth: true }
    );
  },
};
