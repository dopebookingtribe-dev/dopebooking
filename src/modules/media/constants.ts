// Shared by the browser uploader and the server checks.
// Must match the public-media bucket's allowed types and size limit.
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
