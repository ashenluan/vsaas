'use client';

import { useState, useEffect } from 'react';
import { generationApi } from '@/lib/api';
import {
  Video,
  Download,
  Trash2,
  Play,
  Clock,
  Loader2,
  FolderOpen,
  MoreVertical,
  Eye,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WorksPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadWorks = () => {
    setLoading(true);
    generationApi.list({ type: 'DIGITAL_HUMAN', page: 1 })
      .then((data: any) => {
        const items = data.items || [];
        setWorks(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWorks(); }, []);

  const filteredWorks = works.filter((w) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return w.status === 'COMPLETED';
    if (filter === 'processing') return w.status === 'PENDING' || w.status === 'PROCESSING';
    if (filter === 'failed') return w.status === 'FAILED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">已完成</span>;
      case 'PROCESSING':
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"><Loader2 size={10} className="animate-spin" /> 生成中</span>;
      case 'FAILED':
        return <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">失败</span>;
      default:
        return <span className="inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">{status}</span>;
    }
  };

  const getVideoUrl = (work: any) => {
    return work.output?.videoUrl || work.output?.url || work.output?.videos?.[0]?.url;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">作品管理</h1>
          <p className="mt-1 text-sm text-slate-500">查看和管理已生成的数字人视频</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadWorks} className="rounded-xl gap-1.5 font-medium">
            <RefreshCcw size={14} /> 刷新
          </Button>
          <Button size="sm" asChild className="rounded-xl gap-1.5 font-bold">
            <Link href="/digital-human/create">创作视频</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'completed', label: '已完成' },
          { key: 'processing', label: '生成中' },
          { key: 'failed', label: '失败' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition-all',
              filter === f.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card overflow-hidden">
              <div className="aspect-[9/16] bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FolderOpen size={32} className="text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">暂无作品</h3>
          <p className="text-sm text-slate-500 mb-6">选择数字人形象，输入文案即可生成口播视频</p>
          <Button asChild className="rounded-xl font-bold">
            <Link href="/digital-human/create">开始创作</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWorks.map((work) => {
            const videoUrl = getVideoUrl(work);
            return (
              <div key={work.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                {/* Video/Thumbnail */}
                <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">
                  {work.status === 'COMPLETED' && videoUrl ? (
                    <>
                      <video
                        src={videoUrl}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPlayingId(work.id)}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg hover:bg-white transition-colors"
                        >
                          <Play size={20} fill="currentColor" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
                      {work.status === 'FAILED' ? (
                        <><span className="text-red-400">生成失败</span></>
                      ) : (
                        <><Loader2 size={24} className="animate-spin" /><span className="text-sm">生成中...</span></>
                      )}
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute left-2 top-2">
                    {getStatusBadge(work.status)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-700" title={work.input?.text || work.input?.name}>
                    {work.input?.name || work.input?.text?.slice(0, 30) || '数字人视频'}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={12} />
                    {new Date(work.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {work.status === 'COMPLETED' && videoUrl && (
                    <div className="mt-2 flex gap-1.5">
                      <a
                        href={videoUrl}
                        download
                        className="flex-1 rounded-lg bg-primary/10 px-2 py-1.5 text-center text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Download size={12} className="inline mr-1" /> 下载
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 全屏播放弹窗 */}
      {playingId && (() => {
        const work = works.find((w) => w.id === playingId);
        const videoUrl = work ? getVideoUrl(work) : null;
        if (!videoUrl) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPlayingId(null)}>
            <div className="relative max-h-[90vh] max-w-[500px] w-full" onClick={(e) => e.stopPropagation()}>
              <video src={videoUrl} controls autoPlay className="w-full rounded-2xl" />
              <button
                onClick={() => setPlayingId(null)}
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
