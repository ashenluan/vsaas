import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** Default signed URL expiration: 7 days */
const SIGNED_URL_EXPIRES = 7 * 24 * 3600;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly cdnDomain: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('OSS_BUCKET', 'vsaas');
    this.region = this.config.get<string>('OSS_REGION', 'oss-cn-hangzhou');
    this.accessKeyId = this.config.get<string>('ALIYUN_ACCESS_KEY_ID', '');
    this.accessKeySecret = this.config.get<string>('ALIYUN_ACCESS_KEY_SECRET', '');
    this.cdnDomain = this.config.get<string>('CDN_DOMAIN', '');
  }

  getPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): {
    url: string;
    key: string;
    headers: Record<string, string>;
  } {
    const date = new Date();
    const expires = Math.floor(date.getTime() / 1000) + expiresIn;
    const host = `https://${this.bucket}.${this.region}.aliyuncs.com`;

    const stringToSign = `PUT\n\n${contentType}\n${expires}\n/${this.bucket}/${key}`;
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret)
      .update(stringToSign)
      .digest('base64');

    const url = `${host}/${key}?OSSAccessKeyId=${encodeURIComponent(this.accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;

    return {
      url,
      key,
      headers: { 'Content-Type': contentType },
    };
  }

  getPublicUrl(key: string, expiresIn: number = SIGNED_URL_EXPIRES): string {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }
    // Bucket has Block Public Access enabled, so we return signed URLs
    return this.getSignedReadUrl(key, expiresIn);
  }

  getSignedReadUrl(key: string, expiresIn: number = SIGNED_URL_EXPIRES): string {
    const host = `https://${this.bucket}.${this.region}.aliyuncs.com`;
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret)
      .update(`GET\n\n\n${expires}\n/${this.bucket}/${key}`)
      .digest('base64');
    return `${host}/${key}?OSSAccessKeyId=${encodeURIComponent(this.accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
  }

  /**
   * If the URL belongs to our OSS bucket and is unsigned, return a signed version.
   * Already-signed URLs or external URLs are returned as-is.
   */
  ensureSignedUrl(url: string, expiresIn: number = SIGNED_URL_EXPIRES): string {
    try {
      const parsed = new URL(url);
      // Already signed?
      if (parsed.searchParams.has('OSSAccessKeyId') || parsed.searchParams.has('Signature')) {
        return url;
      }
      // Belongs to our bucket?
      const expectedHost = `${this.bucket}.${this.region}.aliyuncs.com`;
      if (parsed.hostname !== expectedHost) {
        return url; // external URL, return as-is
      }
      const key = parsed.pathname.replace(/^\//, '');
      return this.getSignedReadUrl(key, expiresIn);
    } catch {
      return url;
    }
  }

  /**
   * Download content from an external URL and re-upload to our OSS bucket.
   * Returns the unsigned OSS URL of the uploaded file.
   */
  async copyExternalToOss(sourceUrl: string, prefix: string, ext: string): Promise<string> {
    const key = this.generateKey(prefix, `copy.${ext}`);
    const contentType = ext === 'mp4' ? 'video/mp4' : ext === 'mp3' ? 'audio/mpeg' : 'application/octet-stream';

    // Download from source
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download from source: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    this.logger.log(`Downloaded ${buffer.length} bytes from external URL for re-upload`);

    // Upload to our OSS bucket
    const host = `https://${this.bucket}.${this.region}.aliyuncs.com`;
    const date = new Date().toUTCString();
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret)
      .update(`PUT\n\n${contentType}\n${date}\n/${this.bucket}/${key}`)
      .digest('base64');

    const uploadResp = await fetch(`${host}/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Date': date,
        'Authorization': `OSS ${this.accessKeyId}:${signature}`,
      },
      body: buffer,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      throw new Error(`OSS re-upload failed: ${uploadResp.status} ${errText.slice(0, 200)}`);
    }

    const ossUrl = `${host}/${key}`;
    this.logger.log(`Re-uploaded to OSS: ${ossUrl}`);
    return ossUrl;
  }

  /** Plain unsigned OSS URL — use for IMS output targets, not for user-facing display */
  getOssUrl(key: string): string {
    return `https://${this.bucket}.${this.region}.aliyuncs.com/${key}`;
  }

  generateKey(prefix: string, filename: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '/');
    const rand = crypto.randomBytes(8).toString('hex');
    // 安全提取扩展名：去除路径分隔符，只取最后一段的扩展名
    const safeName = filename.replace(/[\\/]/g, '_').replace(/\.\.+/g, '_');
    const ext = safeName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    return `${prefix}/${dateStr}/${rand}.${ext}`;
  }

  /**
   * 验证 URL 是否在当前 OSS Region 内
   * IMS 要求素材 Region 与 API Region 一致，否则会有跨区域传输延迟
   */
  validateOssRegion(url: string): { valid: boolean; region?: string; message?: string } {
    try {
      const parsed = new URL(url);
      const hostParts = parsed.hostname.split('.');
      // Pattern: bucket.oss-cn-xxx.aliyuncs.com
      const regionPart = hostParts.find((p) => p.startsWith('oss-'));
      if (!regionPart) {
        return { valid: true }; // Not an OSS URL, skip validation
      }
      if (regionPart === this.region) {
        return { valid: true, region: regionPart };
      }
      return {
        valid: false,
        region: regionPart,
        message: `素材 Region (${regionPart}) 与当前配置 (${this.region}) 不一致，可能导致跨区域传输延迟`,
      };
    } catch {
      return { valid: true }; // Can't parse URL, skip validation
    }
  }

  getRegion(): string {
    return this.region;
  }

  getBucket(): string {
    return this.bucket;
  }
}
