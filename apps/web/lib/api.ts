import { getInternalApiUrl } from './config';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getInternalApiUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
