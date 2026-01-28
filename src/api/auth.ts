import { apiClient } from './client';
import { LoginCredentials, LoginResponse, User } from '../types';

export const authApi = {
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/mobile/login', credentials, {
      skipAuth: true,
    });
  },

  getMe(): Promise<User> {
    return apiClient.get<User>('/api/mobile/me');
  },
};
