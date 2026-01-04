import { cookies } from 'next/headers';

import { getInternalApiUrl } from './config';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getInternalApiUrl();
  const headers = new Headers(init?.headers);

  if (typeof window === 'undefined') {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
