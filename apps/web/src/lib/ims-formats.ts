/**
 * IMS (智能媒体服务) 官方支持的剪辑格式
 * 参考: https://help.aliyun.com/zh/ims/developer-reference/file-format-1
 */

/** 支持的视频输入格式 */
export const IMS_VIDEO_EXTENSIONS = [
  'mkv', 'webm', 'mp4', 'mpeg', 'avi', 'asf', 'mov', 'wmv', '3gp', 'rm', 'rmvb', 'flv', 'f4v',
] as const;

/** 支持的音频输入格式 */
export const IMS_AUDIO_EXTENSIONS = [
  'm4a', 'mp3', 'wma', 'aac', 'wav', 'ra', 'ogg', 'ape', 'flac',
] as const;

/** 支持的图片输入格式 */
export const IMS_IMAGE_EXTENSIONS = [
  'bmp', 'tiff', 'tif', 'gif', 'png', 'jpeg', 'jpg', 'webp',
] as const;

/** 支持的字幕格式 */
export const IMS_SUBTITLE_EXTENSIONS = ['srt', 'ass'] as const;

/** 支持的字体格式 */
export const IMS_FONT_EXTENSIONS = ['ttf', 'woff', 'otf'] as const;

/** 支持的视频输出格式 */
export const IMS_OUTPUT_VIDEO_EXTENSIONS = ['mp4', 'm3u8', 'webm'] as const;

// ---------- MIME type mappings ----------

const VIDEO_MIME_MAP: Record<string, string> = {
  mkv: 'video/x-matroska', webm: 'video/webm', mp4: 'video/mp4', mpeg: 'video/mpeg',
  avi: 'video/x-msvideo', asf: 'video/x-ms-asf', mov: 'video/quicktime',
  wmv: 'video/x-ms-wmv', '3gp': 'video/3gpp', rm: 'application/vnd.rn-realmedia',
  rmvb: 'application/vnd.rn-realmedia-vbr', flv: 'video/x-flv', f4v: 'video/x-f4v',
};

const AUDIO_MIME_MAP: Record<string, string> = {
  m4a: 'audio/mp4', mp3: 'audio/mpeg', wma: 'audio/x-ms-wma', aac: 'audio/aac',
  wav: 'audio/wav', ra: 'audio/x-realaudio', ogg: 'audio/ogg',
  ape: 'audio/x-ape', flac: 'audio/flac',
};

const IMAGE_MIME_MAP: Record<string, string> = {
  bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff', gif: 'image/gif',
  png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp',
};

/** HTML input accept string for video files */
export const IMS_VIDEO_ACCEPT = IMS_VIDEO_EXTENSIONS.map((e) => VIDEO_MIME_MAP[e] || `.${e}`).join(',');

/** HTML input accept string for audio files */
export const IMS_AUDIO_ACCEPT = IMS_AUDIO_EXTENSIONS.map((e) => AUDIO_MIME_MAP[e] || `.${e}`).join(',');

/** HTML input accept string for image files */
export const IMS_IMAGE_ACCEPT = IMS_IMAGE_EXTENSIONS.map((e) => IMAGE_MIME_MAP[e] || `.${e}`).join(',');

/** HTML input accept string for all media (image + video) */
export const IMS_MEDIA_ACCEPT = `${IMS_IMAGE_ACCEPT},${IMS_VIDEO_ACCEPT}`;

/** HTML input accept string for all types (image + video + audio) */
export const IMS_ALL_ACCEPT = `${IMS_IMAGE_ACCEPT},${IMS_VIDEO_ACCEPT},${IMS_AUDIO_ACCEPT}`;

// ---------- Validation helpers ----------

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/** Check if a file is a supported IMS image */
export function isImsImage(file: File): boolean {
  const ext = getExtension(file.name);
  return (IMS_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/** Check if a file is a supported IMS video */
export function isImsVideo(file: File): boolean {
  const ext = getExtension(file.name);
  return (IMS_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

/** Check if a file is a supported IMS audio */
export function isImsAudio(file: File): boolean {
  const ext = getExtension(file.name);
  return (IMS_AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

/** Check if a file is any supported IMS media type */
export function isImsSupportedMedia(file: File): boolean {
  return isImsImage(file) || isImsVideo(file) || isImsAudio(file);
}

/** Get human-readable format list string */
export function getImsFormatHint(type: 'image' | 'video' | 'audio' | 'media' | 'all'): string {
  switch (type) {
    case 'image':
      return 'JPG, PNG, WebP, GIF, BMP, TIFF';
    case 'video':
      return 'MP4, MOV, AVI, MKV, WebM, FLV, 3GP, MPEG, RMVB';
    case 'audio':
      return 'MP3, WAV, AAC, M4A, FLAC, OGG, WMA, APE';
    case 'media':
      return 'JPG, PNG, WebP, GIF, BMP, MP4, MOV, AVI, MKV, WebM, FLV';
    case 'all':
      return 'JPG, PNG, WebP, MP4, MOV, AVI, MP3, WAV, AAC, FLAC';
  }
}

/**
 * Validate a file and return error message if unsupported.
 * Returns null if valid.
 */
export function validateImsFile(
  file: File,
  allowedTypes: ('image' | 'video' | 'audio')[],
): string | null {
  const ext = getExtension(file.name);
  const checks: { type: string; exts: readonly string[] }[] = [];

  if (allowedTypes.includes('image')) checks.push({ type: '图片', exts: IMS_IMAGE_EXTENSIONS });
  if (allowedTypes.includes('video')) checks.push({ type: '视频', exts: IMS_VIDEO_EXTENSIONS });
  if (allowedTypes.includes('audio')) checks.push({ type: '音频', exts: IMS_AUDIO_EXTENSIONS });

  const allExts = checks.flatMap((c) => [...c.exts]);

  if (!allExts.includes(ext)) {
    const typeNames = checks.map((c) => c.type).join('/');
    return `不支持的${typeNames}格式: .${ext}。IMS 支持的格式: ${allExts.map((e) => e.toUpperCase()).join(', ')}`;
  }

  return null;
}
