export function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function lower(value: string): string {
  return normalizeSpace(value).toLowerCase();
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function asNonEmpty(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
