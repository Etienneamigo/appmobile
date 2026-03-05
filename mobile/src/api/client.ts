import { secureStorage } from '../storage/secureStore';
import { ApiError } from '../types';
import { config } from '../config';

const BASE_URL = config.BASE_URL;
const __DEV__ = process.env.NODE_ENV !== 'production';

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

// Auth-check endpoints: only these should trigger global logout on 401
const AUTH_CHECK_ENDPOINTS = ['/api/mobile/me', '/api/mobile/login'];

const isAuthCheckEndpoint = (endpoint: string): boolean =>
  AUTH_CHECK_ENDPOINTS.some(e => endpoint === e || endpoint.startsWith(e + '?'));

// Endpoints whose request body should never appear in logs (contains credentials)
const SENSITIVE_ENDPOINTS = ['/api/mobile/login', '/api/auth/register'];

/**
 * Map HTTP status to user-friendly French message.
 */
const getUserFriendlyMessage = (status: number, serverMessage?: string): string => {
  // Use backend message if it's not a generic error
  if (serverMessage && serverMessage !== 'Internal Server Error' && serverMessage !== 'Bad Request') {
    return serverMessage;
  }
  switch (status) {
    case 400: return 'Données invalides. Vérifiez les champs du formulaire.';
    case 401: return 'Session expirée. Veuillez vous reconnecter.';
    case 403: return 'Vous n\'avez pas les droits pour cette action.';
    case 404: return 'Ressource introuvable.';
    case 409: return 'Conflit : cette donnée existe déjà ou est en cours d\'utilisation.';
    case 422: return 'Données incomplètes ou invalides.';
    case 429: return 'Trop de requêtes. Veuillez patienter quelques instants.';
    default:
      if (status >= 500) return 'Erreur serveur. Veuillez réessayer plus tard.';
      return serverMessage || 'Une erreur est survenue.';
  }
};

export const apiClient = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, skipAuth = false } = options;

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

    const fetchConfig: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      fetchConfig.body = JSON.stringify(body);
    }

    const url = `${BASE_URL}${endpoint}`;

    // Dev logging: request (redact sensitive endpoints like login/register)
    if (__DEV__) {
      const isSensitive = SENSITIVE_ENDPOINTS.some(e => endpoint.startsWith(e));
      console.log(`[API] ${method} ${endpoint}`, body && !isSensitive ? JSON.stringify(body).slice(0, 500) : '');
    }

    try {
      const response = await fetch(url, fetchConfig);

      if (response.status === 401) {
        // Only trigger global logout for auth-check endpoints (token validation)
        // For data endpoints, just throw the error so screens can handle it gracefully
        if (isAuthCheckEndpoint(endpoint) && onUnauthorized) {
          onUnauthorized();
        }
        const error: ApiError = {
          message: 'Session expirée. Veuillez vous reconnecter.',
          status: 401,
        };
        throw error;
      }

      if (!response.ok) {
        let serverMessage = '';
        let details: Record<string, string[]> | undefined;
        let zodIssues: Array<{ path: string[]; message: string }> | undefined;
        try {
          const errorData = await response.json();
          serverMessage = errorData.message || errorData.error || '';
          details = errorData.details;
          zodIssues = errorData.issues;
        } catch {
          // Response not JSON
        }

        // Dev logging: error details
        if (__DEV__) {
          console.warn(`[API ERROR] ${response.status} ${method} ${endpoint}`, serverMessage);
          if (zodIssues) {
            console.warn('[API ERROR] Zod issues:', JSON.stringify(zodIssues, null, 2));
          }
        }

        // Build a human-readable message from Zod issues if available
        if (zodIssues && Array.isArray(zodIssues) && zodIssues.length > 0) {
          const firstIssue = zodIssues[0];
          const path = Array.isArray(firstIssue.path) ? firstIssue.path.join('.') : '';
          serverMessage = path
            ? `${serverMessage}\n(${path}: ${firstIssue.message})`
            : serverMessage || firstIssue.message;
        }

        const error: ApiError = {
          message: getUserFriendlyMessage(response.status, serverMessage),
          status: response.status,
          details,
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

      // Dev logging: network error
      if (__DEV__) {
        console.warn(`[API NETWORK ERROR] ${method} ${endpoint}`, (error as Error).message);
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
          'Accept': 'application/json; charset=utf-8',
          'Accept-Charset': 'utf-8',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (response.status === 401) {
        // Don't trigger global logout for upload -- let the screen handle it
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
