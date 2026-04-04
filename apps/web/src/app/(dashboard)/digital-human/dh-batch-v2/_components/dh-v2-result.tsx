'use client';

import { useEffect, useState } from 'react';
import { useWs } from '@/components/ws-provider';
import { CheckCircle2, XCircle, Loader2, Download, Plus } from 'lucide-react';

export function DhV2Result({ result, onNewTask }: { result: any; onNewTask: () => void }) {
  const { subscribe } = useWs();
  const [progress, setProgress] = useState<{ progress: number; message: string; status: string } | null>(null);
  const [job, setJob] = useState(result);

  useEffect(() => {
    if (!job?.id) return;
    return subscribe('dh-batch-v2:progress', (data: any) => {
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

  const outputVideos = job.outputVideos || (job.output as any)?.outputVideos || [];

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="mb-6 text-2xl font-bold">交错混剪</h1>
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
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
              交错混剪任务已开始处理，预计需要较长时间完成。您可以离开此页面，任务将在后台继续执行。
            </p>
          )}

          <div className="mx-auto mb-6 max-w-md rounded-lg bg-muted/50 p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">任务ID</span>
              <span className="font-mono text-xs truncate">{job.id}</span>
              <span className="text-muted-foreground">通道</span>
              <span>{(job.input as any)?.channel === 'A' ? '内置数字人' : '自定义照片'}</span>
            </div>
          </div>

          {/* Output videos */}
          {isCompleted && outputVideos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">生成结果 ({outputVideos.length} 个视频)</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {outputVideos.map((video: any, i: number) => (
                  <div key={i} className="rounded-xl border bg-card overflow-hidden">
                    <video
                      src={video.mediaUrl || video.mediaURL}
                      controls
                      className="aspect-video w-full bg-black"
                    />
                    <div className="flex items-center justify-between p-2">
                      <span className="text-xs text-muted-foreground">视频 {i + 1}</span>
                      <a
                        href={video.mediaUrl || video.mediaURL}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Download size={12} /> 下载
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFailed && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {job.errorMsg || progress?.message || '任务处理失败'}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={onNewTask}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Plus size={14} /> 新建任务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
