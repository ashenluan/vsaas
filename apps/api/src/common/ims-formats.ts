/**
 * IMS (智能媒体服务) 官方支持的剪辑格式 — 后端校验用
 * 参考: https://help.aliyun.com/zh/ims/developer-reference/file-format-1
 */

export const IMS_VIDEO_EXTENSIONS = new Set([
  'mkv', 'webm', 'mp4', 'mpeg', 'avi', 'asf', 'mov', 'wmv', '3gp', 'rm', 'rmvb', 'flv', 'f4v',
]);

export const IMS_AUDIO_EXTENSIONS = new Set([
  'm4a', 'mp3', 'wma', 'aac', 'wav', 'ra', 'ogg', 'ape', 'flac',
]);

export const IMS_IMAGE_EXTENSIONS = new Set([
  'bmp', 'tiff', 'tif', 'gif', 'png', 'jpeg', 'jpg', 'webp',
]);

export const IMS_SUBTITLE_EXTENSIONS = new Set(['srt', 'ass']);
export const IMS_FONT_EXTENSIONS = new Set(['ttf', 'woff', 'otf']);

export const IMS_VIDEO_MIMES = new Set([
  'video/mp4', 'video/x-matroska', 'video/webm', 'video/mpeg', 'video/x-msvideo',
  'video/x-ms-asf', 'video/quicktime', 'video/x-ms-wmv', 'video/3gpp',
  'application/vnd.rn-realmedia', 'application/vnd.rn-realmedia-vbr',
  'video/x-flv', 'video/x-f4v',
]);

export const IMS_AUDIO_MIMES = new Set([
  'audio/mp4', 'audio/mpeg', 'audio/x-ms-wma', 'audio/aac', 'audio/wav',
  'audio/x-wav', 'audio/x-realaudio', 'audio/ogg', 'audio/x-ape', 'audio/flac',
]);

export const IMS_IMAGE_MIMES = new Set([
  'image/bmp', 'image/tiff', 'image/gif', 'image/png', 'image/jpeg', 'image/webp',
]);

export const IMS_ALL_MEDIA_MIMES = new Set([
  ...IMS_VIDEO_MIMES, ...IMS_AUDIO_MIMES, ...IMS_IMAGE_MIMES,
]);

/**
 * Validate a URL's file extension against IMS supported formats.
 * Returns null if valid, error string if invalid.
 */
export function validateImsUrl(
  url: string,
  allowedTypes: ('image' | 'video' | 'audio')[],
): string | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';

    const allowed = new Set<string>();
    if (allowedTypes.includes('image')) IMS_IMAGE_EXTENSIONS.forEach((e) => allowed.add(e));
    if (allowedTypes.includes('video')) IMS_VIDEO_EXTENSIONS.forEach((e) => allowed.add(e));
    if (allowedTypes.includes('audio')) IMS_AUDIO_EXTENSIONS.forEach((e) => allowed.add(e));

    if (!allowed.has(ext)) {
      return `不支持的文件格式: .${ext}，IMS 支持: ${[...allowed].map((e) => e.toUpperCase()).join(', ')}`;
    }
    return null;
  } catch {
    return null; // Can't parse URL, skip validation
  }
}

/**
 * Validate a MIME type against IMS supported formats.
 * Returns null if valid, error string if invalid.
 */
export function validateImsMime(
  mimeType: string,
  allowedTypes: ('image' | 'video' | 'audio')[],
): string | null {
  if (!mimeType) return null; // Skip if no mime provided

  const allowed = new Set<string>();
  if (allowedTypes.includes('image')) IMS_IMAGE_MIMES.forEach((m) => allowed.add(m));
  if (allowedTypes.includes('video')) IMS_VIDEO_MIMES.forEach((m) => allowed.add(m));
  if (allowedTypes.includes('audio')) IMS_AUDIO_MIMES.forEach((m) => allowed.add(m));

  if (!allowed.has(mimeType)) {
    return `不支持的 MIME 类型: ${mimeType}`;
  }
  return null;
}
