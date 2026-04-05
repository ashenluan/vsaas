import { Logger } from '@nestjs/common';

const logger = new Logger('RetryFetch');

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatusCodes?: number[];
}

/** DashScope business error codes that should NOT be retried */
const NON_RETRYABLE_ERROR_CODES = new Set([
  'InvalidParameter',
  'DataInspectionFailed',
  'Arrearage',
  'BadRequest.TooLarge',
  'UnsupportedOperation',
  'InvalidApiKey',
  'AccessDenied',
]);

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry.
 * Retries on network errors and retryable HTTP status codes (429, 5xx).
 * Respects Retry-After header from 429 responses.
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  opts?: RetryOptions,
): Promise<Response> {
  const { maxRetries, baseDelayMs, maxDelayMs, retryableStatusCodes } = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      // 400 errors: check if it's a non-retryable DashScope business error
      if (response.status === 400) {
        // Clone response so caller can still read the body
        const cloned = typeof response.clone === 'function' ? response.clone() : response;
        try {
          const body = await cloned.json() as { code?: string; message?: string };
          if (body.code && NON_RETRYABLE_ERROR_CODES.has(body.code)) {
            logger.warn(
              `Non-retryable DashScope error ${body.code} from ${url.split('?')[0]}: ${body.message || ''}`,
            );
            return response;
          }
        } catch { /* ignore JSON parse errors */ }
      }

      if (!retryableStatusCodes.includes(response.status)) {
        return response;
      }

      // Retryable status code
      if (attempt < maxRetries) {
        let delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);

        // Respect Retry-After header (in seconds)
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) {
            delay = Math.min(parsed * 1000, maxDelayMs);
        }
      }

        // Add jitter (±25%)
        delay = delay * (0.75 + Math.random() * 0.5);

        logger.warn(
          `Retryable status ${response.status} from ${url.split('?')[0]}, ` +
          `attempt ${attempt + 1}/${maxRetries}, retrying in ${Math.round(delay)}ms`,
        );
        await sleep(delay);
        continue;
      }

      // Final attempt also failed with retryable status — return it
      return response;
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs) *
          (0.75 + Math.random() * 0.5);

        logger.warn(
          `Network error fetching ${url.split('?')[0]}: ${error.message}, ` +
          `attempt ${attempt + 1}/${maxRetries}, retrying in ${Math.round(delay)}ms`,
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
}
