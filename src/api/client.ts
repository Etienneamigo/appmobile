import { secureStorage } from '../storage/secureStore';
import { ApiError } from '../types';

// Configurable base URL via Expo env, default to wadelo.com
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://wadelo.com';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  retries?: number;
}

let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorized = callback;
};

export { BASE_URL };

/**
 * Normalize media URLs:
 * - /uploads/... -> /api/uploads/...
 * - Relative URLs -> absolute with BASE_URL
 * - imagedelivery.net -> keep as-is
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Already absolute CF URL or full URL
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }

  // Legacy /uploads path
  if (url.startsWith('/uploads/')) {
    return `${BASE_URL}${url.replace('/uploads/', '/api/uploads/')}`;
  }

  // Relative path
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }

  return url;
}

export const apiClient = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, skipAuth = false, retries = 0 } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
      'Accept-Charset': 'utf-8',
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

    const attempt = async (remainingRetries: number): Promise<T> => {
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

        const text = await response.text();
        if (!text) {
          return {} as T;
        }

        return JSON.parse(text) as T;
      } catch (error) {
        if ((error as ApiError).status) {
          throw error;
        }
        if (remainingRetries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attempt(remainingRetries - 1);
        }
        const networkError: ApiError = {
          message: 'Erreur de connexion. Vérifiez votre connexion internet.',
          status: 0,
        };
        throw networkError;
      }
    };

    return attempt(retries);
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
          'Accept': 'application/json; charset=utf-8',
          'Accept-Charset': 'utf-8',
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
        let errorMessage = "Erreur lors de l'upload";
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

  async uploadToExternal(uploadURL: string, file: { uri: string; name: string; type: string }): Promise<any> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw { message: "Erreur lors de l'upload vers Cloudflare", status: response.status } as ApiError;
    }

    return response.json();
  },
};
