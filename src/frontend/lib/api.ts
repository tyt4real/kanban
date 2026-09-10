import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();

export function useApiQuery<T>(key: string[], path: string, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get<T>(path),
    enabled,
  });
}

export function useApiMutation<T, TVariables>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  options?: {
    onSuccess?: (data: T) => void;
    invalidateKeys?: string[][];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: TVariables) => api.request<T>(method, path, variables),
    onSuccess: (data) => {
      options?.onSuccess?.(data);
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}