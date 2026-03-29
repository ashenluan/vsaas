'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generationApi, userApi } from '@/lib/api';
import {
  Image,
  Palette,
  Video,
  Film,
  UserCircle,
  Clapperboard,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';

const toolCards = [
  {
    title: '文生图',
    desc: '输入文字描述，AI生成高质量图片',
    href: '/generate/text-to-image',
    icon: Image,
    gradient: 'from-blue-500/10 to-indigo-500/10',
    iconColor: 'text-blue-600',
    badge: '热门',
  },
  {
    title: '文生视频',
    desc: '输入文字描述，AI生成视频',
    href: '/generate/text-to-video',
    icon: Video,
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-600',
    badge: '热门',
  },
  {
    title: '图生图',
    desc: '上传参考图，AI进行智能变换',
    href: '/generate/image-to-image',
    icon: Palette,
    gradient: 'from-purple-500/10 to-fuchsia-500/10',
    iconColor: 'text-purple-600',
  },
  {
    title: '图生视频',
    desc: '上传图片作为起始帧，生成动态视频',
    href: '/generate/image-to-video',
    icon: Film,
    gradient: 'from-orange-500/10 to-amber-500/10',
    iconColor: 'text-orange-600',
  },
  {
    title: '数字人',
    desc: '克隆声音，生成数字人视频',
    href: '/digital-human',
    icon: UserCircle,
    gradient: 'from-pink-500/10 to-rose-500/10',
    iconColor: 'text-pink-600',
    badge: 'new',
  },
  {
    title: '批量混剪',
    desc: '批量合成数字人视频',
    href: '/digital-human/compose',
    icon: Clapperboard,
    gradient: 'from-violet-500/10 to-indigo-500/10',
    iconColor: 'text-violet-600',
  },
];

export default function WorkspacePage() {
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({ images: 0, videos: 0, total: 0 });

  useEffect(() => {
    generationApi.list({ page: 1 }).then((data: any) => {
      const items = data.items || [];
      setRecentJobs(items.slice(0, 8));
      const images = items.filter((j: any) => j.type?.includes('IMAGE')).length;
      const videos = items.filter((j: any) => j.type?.includes('VIDEO')).length;
      setStats({ images, videos, total: data.total || items.length });
    }).catch(() => {});

    userApi.getCredits().then((c: any) => setBalance(typeof c === 'number' ? c : c?.balance ?? null)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <Sparkles size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">当前积分</p>
            <p className="text-xl font-bold text-primary">{balance ?? '--'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">累计生成</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <Zap size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">图片 / 视频</p>
            <p className="text-xl font-bold">{stats.images} <span className="text-sm font-normal text-muted-foreground">/</span> {stats.videos}</p>
          </div>
        </div>
      </div>

      {/* Tool cards */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">AI 创作工具</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-background ${tool.iconColor}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{tool.title}</span>
                        {tool.badge && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none text-white ${
                            tool.badge === 'new' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    立即使用 <ArrowRight size={12} className="ml-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent generations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近生成</h2>
          {recentJobs.length > 0 && (
            <Link href="/gallery" className="text-xs text-primary hover:underline">
              查看全部
            </Link>
          )}
        </div>
        {recentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
            <Sparkles size={40} strokeWidth={1} className="mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无生成记录</p>
            <p className="mt-1 text-xs text-muted-foreground/60">选择上方工具，开始你的第一次AI创作</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentJobs.map((job: any) => (
              <div key={job.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                {/* Thumbnail */}
                <div className="relative aspect-square bg-muted">
                  {job.status === 'COMPLETED' && (job.output?.images?.[0] || job.output?.url || job.outputUrl) ? (
                    job.type?.includes('VIDEO') ? (
                      <video
                        src={job.output?.url || job.output?.videoUrl || job.outputUrl}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={job.output?.images?.[0] || job.output?.url || job.outputUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {job.status === 'FAILED' ? (
                        <span className="text-xs text-red-400">生成失败</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Clock size={16} className="animate-pulse text-muted-foreground/40" />
                          <span className="text-[10px] text-muted-foreground/60">处理中</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Type badge */}
                  <div className="absolute left-2 top-2">
                    <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      {job.type === 'TEXT_TO_IMAGE' ? '文生图' :
                       job.type === 'IMAGE_TO_IMAGE' ? '图生图' :
                       job.type === 'TEXT_TO_VIDEO' ? '文生视频' :
                       job.type === 'IMAGE_TO_VIDEO' ? '图生视频' : job.type}
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-xs text-muted-foreground">{job.prompt || '无描述'}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {new Date(job.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
