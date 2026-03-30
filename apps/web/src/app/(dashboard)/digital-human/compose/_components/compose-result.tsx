'use client';

import { useEffect, useState } from 'react';
import { useWs } from '@/components/ws-provider';
import { CheckCircle2, XCircle, Loader2, Download, Plus } from 'lucide-react';

export function ComposeResult({ result, onNewTask }: { result: any; onNewTask: () => void }) {
  const { subscribe } = useWs();
  const [progress, setProgress] = useState<{ progress: number; message: string; status: string } | null>(null);
  const [job, setJob] = useState(result);

  useEffect(() => {
    if (!job?.id) return;
    return subscribe('compose:progress', (data: any) => {
      if (data.jobId === job.id) {
        setProgress({ progress: data.progress, message: data.message, status: data.status });
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setJob((prev: any) => ({ ...prev, status: data.status, outputVideos: data.outputVideos }));
        }
      }
    });
  }, [job?.id, subscribe]);

  const status = progress?.status || job.status;
  const isProcessing = status === 'PENDING' || status === 'PROCESSING';
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="mb-6 text-2xl font-bold">批量混剪</h1>
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {/* 状态图标 */}
          <div className="mb-4 flex justify-center">
            {isCompleted ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            ) : isFailed ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
          </div>

          <h2 className="mb-2 text-center text-xl font-semibold">
            {isCompleted ? '任务完成' : isFailed ? '任务失败' : '任务处理中'}
          </h2>

          {/* 进度条 */}
          {isProcessing && progress && (
            <div className="mx-auto mb-6 max-w-md">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{progress.message}</span>
                <span className="tabular-nums font-medium">{progress.progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {!progress && isProcessing && (
            <p className="mb-6 text-center text-sm text-muted-foreground">
              批量混剪任务已开始处理，预计需要较长时间完成。您可以离开此页面，任务将在后台继续执行。
            </p>
          )}

          {/* 任务信息 */}
          <div className="mx-auto mb-6 max-w-md rounded-lg bg-muted/50 p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">任务ID</span>
              <span className="font-mono text-xs truncate">{job.id}</span>
              <span className="text-muted-foreground">状态</span>
              <span className="font-medium">{progress?.status || job.status || 'PENDING'}</span>
              <span className="text-muted-foreground">视频数量</span>
              <span className="font-medium">{(job.input as any)?.videoCount || '---'}</span>
            </div>
            {progress?.message && (
              <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{progress.message}</p>
            )}
          </div>

          {/* 输出视频列表 */}
          {isCompleted && job.outputVideos?.length > 0 && (
            <div className="mx-auto mb-6 max-w-lg">
              <h3 className="mb-3 text-sm font-semibold">生成的视频 ({job.outputVideos.length} 条)</h3>
              <div className="space-y-2">
                {job.outputVideos.map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">视频 {i + 1}</p>
                        {v.duration && <p className="text-[10px] text-muted-foreground">{v.duration}s</p>}
                      </div>
                    </div>
                    {v.mediaURL && (
                      <a
                        href={v.mediaURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Download size={12} /> 下载
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-center">
            <button
              onClick={onNewTask}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} /> 创建新任务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
