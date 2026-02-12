import { apiClient } from './client';
import { LoginCredentials, LoginResponse, RegisterCredentials, RegisterResponse, User } from '../types';

interface MeResponse {
  user: User;
}

export const authApi = {
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/mobile/login', credentials, {
      skipAuth: true,
    });
  },

  register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/api/auth/register', credentials, {
      skipAuth: true,
    });
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<MeResponse>('/api/mobile/me');
    return response.user;
  },
};
