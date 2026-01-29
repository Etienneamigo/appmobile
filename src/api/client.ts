import { secureStorage } from '../storage/secureStore';
import { ApiError } from '../types';

const BASE_URL = 'https://maisonapee.com';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorized = callback;
};

export const apiClient = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, skipAuth = false } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    if (!skipAuth) {
      const token = await secureStorage.getToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const url = `${BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        if (onUnauthorized) {
          onUnauthorized();
        }
        const error: ApiError = {
          message: 'Session expirée. Veuillez vous reconnecter.',
          status: 401,
        };
        throw error;
      }

      if (!response.ok) {
        let errorMessage = 'Une erreur est survenue';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Response not JSON
        }
        const error: ApiError = {
          message: errorMessage,
          status: response.status,
        };
        throw error;
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      const networkError: ApiError = {
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
        status: 0,
      };
      throw networkError;
    }
  },

  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  async uploadFile<T>(endpoint: string, file: { uri: string; name: string; type: string }): Promise<T> {
    const token = await secureStorage.getToken();

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const url = `${BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (response.status === 401) {
        if (onUnauthorized) {
          onUnauthorized();
        }
        const error: ApiError = {
          message: 'Session expirée. Veuillez vous reconnecter.',
          status: 401,
        };
        throw error;
      }

      if (!response.ok) {
        let errorMessage = 'Erreur lors de l\'upload';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Response not JSON
        }
        const error: ApiError = {
          message: errorMessage,
          status: response.status,
        };
        throw error;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      const networkError: ApiError = {
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
        status: 0,
      };
      throw networkError;
    }
  },
};
