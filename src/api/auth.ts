import { apiClient } from './client';
import { LoginCredentials, LoginResponse, User } from '../types';

interface MeResponse {
  user: User;
}

export const authApi = {
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/mobile/login', credentials, {
      skipAuth: true,
    });
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<MeResponse>('/api/mobile/me');
    return response.user;
  },
};
