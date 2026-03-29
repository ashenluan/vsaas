'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-red-600">出错了</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {error.message || '页面加载失败'}
        </p>
        <button
          onClick={reset}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          重试
        </button>
      </div>
    </div>
  );
}
