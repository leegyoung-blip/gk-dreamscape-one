export const PUBLIC_PREVIEW_END_ISO = "2026-10-01T00:00:00+08:00";
export const PUBLIC_PREVIEW_END_MS = Date.parse(PUBLIC_PREVIEW_END_ISO);

export function isPublicPreviewActive(now = Date.now()) {
  return now < PUBLIC_PREVIEW_END_MS;
}

export function millisecondsUntilPublicPreviewEnds(now = Date.now()) {
  return Math.max(0, PUBLIC_PREVIEW_END_MS - now);
}
