import { apiClient } from './client';
import { FeedVideo } from '../types';

interface FeedResponse {
  videos: FeedVideo[];
  nextCursor: string | null;
  seed: number;
  hasMore: boolean;
}

export const feedApi = {
  getVideos(params?: {
    cursor?: string;
    seed?: number;
    lat?: number;
    lng?: number;
    radius?: string;
    limit?: number;
  }): Promise<FeedResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params?.limit || 10));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.seed) searchParams.set('seed', params.seed.toString());
    if (params?.lat) searchParams.set('lat', params.lat.toString());
    if (params?.lng) searchParams.set('lng', params.lng.toString());
    if (params?.radius) searchParams.set('radius', params.radius);

    return apiClient.get<FeedResponse>(`/api/feed/videos?${searchParams.toString()}`);
  },
};
