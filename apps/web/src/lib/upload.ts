import { storageApi } from './api';

export async function uploadToOSS(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; key: string }> {
  // 1. Get presigned URL from backend
  const { url, key, publicUrl, headers } = await storageApi.getUploadUrl(
    file.name,
    file.type,
  );

  // 2. Upload directly to OSS
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);

    Object.entries(headers).forEach(([k, v]) => {
      xhr.setRequestHeader(k, v as string);
    });

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });

  return { url: publicUrl, key };
}
