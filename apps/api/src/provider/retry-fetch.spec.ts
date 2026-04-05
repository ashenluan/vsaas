import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryFetch } from './retry-fetch';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Suppress NestJS logger output during tests
vi.mock('@nestjs/common', () => ({
  Logger: class {
    warn() {}
    log() {}
    error() {}
  },
}));

function makeResponse(status: number, body: any = {}, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

function makeResponseLikeWithoutClone(
  status: number,
  body: any = {},
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as any;
}

describe('retryFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('返回成功响应，不重试', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await retryFetch('https://api.example.com/test');

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('非重试状态码（如 400）直接返回', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(400, { error: 'bad request' }));

    const res = await retryFetch('https://api.example.com/test');

    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('400 的 DashScope 业务错误码直接返回，不重试', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(400, { code: 'InvalidParameter', message: 'bad request' }),
    );

    const res = await retryFetch('https://api.example.com/test');

    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('没有 clone 的非标准 400 响应对象也会直接返回', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponseLikeWithoutClone(400, {
        code: 'InvalidParameter',
        message: 'bad request',
      }),
    );

    const res = await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 0,
    });

    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('遇到 500 后重试并最终成功', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(500))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('遇到 429 后重试并最终成功', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    mockFetch
      .mockResolvedValueOnce(makeResponse(429, {}, { 'retry-after': '1' }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 5000,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    setTimeoutSpy.mockRestore();
    randomSpy.mockRestore();
  });

  it('网络错误后重试并成功', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(makeResponse(200));

    const res = await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('所有重试用尽后抛出网络错误', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      retryFetch('https://api.example.com/test', undefined, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 100,
      }),
    ).rejects.toThrow('ECONNREFUSED');

    expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('所有重试用尽后返回最后的 5xx 响应', async () => {
    mockFetch.mockResolvedValue(makeResponse(503));

    const res = await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 1,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(res.status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it('maxRetries=0 时不重试', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));

    await expect(
      retryFetch('https://api.example.com/test', undefined, { maxRetries: 0 }),
    ).rejects.toThrow('fail');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('透传 RequestInit 参数', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200));

    await retryFetch('https://api.example.com/test', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer xxx' },
      body: JSON.stringify({ data: 1 }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Authorization': 'Bearer xxx' },
      }),
    );
  });
});
