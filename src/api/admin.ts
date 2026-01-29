import { apiClient } from './client';
import { AdminStats } from '../types';

interface AdminStatsResponse {
  data: AdminStats;
}

export const adminApi = {
  getStats(): Promise<AdminStatsResponse> {
    return apiClient.get<AdminStatsResponse>('/api/mobile/admin/stats');
  },
};
