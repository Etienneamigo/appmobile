import { apiClient } from './client';
import { AdminStats } from '../types';

// Backend returns AdminStats directly, not wrapped in { data: ... }
export const adminApi = {
  getStats(): Promise<AdminStats> {
    return apiClient.get<AdminStats>('/api/mobile/admin/stats');
  },
};
