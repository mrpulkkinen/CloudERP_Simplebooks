const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`API request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as T;
}
