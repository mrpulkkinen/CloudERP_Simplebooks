export function nowIso() {
  return new Date().toISOString();
}

export function ensureDateInput(value, fallback = new Date()) {
  if (!value) return fallback.toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date.toISOString();
}
