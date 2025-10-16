function readEnv(key: string): string | undefined {
  return process.env[key];
}

export function getInternalApiUrl(): string {
  return (
    readEnv('INTERNAL_API_URL') ??
    readEnv('NEXT_PUBLIC_API_URL') ??
    'http://localhost:5010'
  );
}
