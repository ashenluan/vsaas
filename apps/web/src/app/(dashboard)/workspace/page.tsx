'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { generationApi, userApi, templateApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Image as ImageIcon,
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
  Search,
  Scissors,
  ScanSearch,
  Shirt,
  Paintbrush,
  Copy,
  Type,
  Hand,
  Blend,
  ChevronLeft,
  ChevronRight,
  Play,
  Wallet,
  Crown,
  Flame,
  Star,
  ExternalLink,
} from 'lucide-react';

// ==================== Quick Tool Cards ====================
const quickTools = [
  {
    title: 'Grok 图片',
    desc: '高质量AI图片生成',
    href: '/generate/grok-image',
    icon: ImageIcon,
    gradient: 'from-blue-500 to-indigo-600',
    badge: '爆火',
    badgeColor: 'bg-orange-500',
  },
  {
    title: 'Grok 视频',
    desc: '创意AI视频生成',
    href: '/generate/grok-video',
    icon: Video,
    gradient: 'from-emerald-500 to-teal-600',
    badge: '热门',
    badgeColor: 'bg-blue-600',
  },
  {
    title: '一键成片',
    desc: '分镜多场景成片',
    href: '/generate/storyboard',
    icon: Scissors,
    gradient: 'from-purple-500 to-violet-600',
    badge: 'new',
    badgeColor: 'bg-purple-500',
  },
  {
    title: '图生图',
    desc: '参考图片生成',
    href: '/generate/image-to-image',
    icon: Palette,
    gradient: 'from-fuchsia-500 to-pink-600',
  },
  {
    title: '图生视频',
    desc: '图片驱动视频',
    href: '/generate/image-to-video',
    icon: Film,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    title: '一键换装',
    desc: 'AI智能换装',
    href: '/generate/virtual-tryon',
    icon: Shirt,
    gradient: 'from-rose-500 to-red-600',
    badge: 'new',
    badgeColor: 'bg-emerald-500',
  },
  {
    title: '数字人',
    desc: '声音克隆+视频',
    href: '/digital-human',
    icon: UserCircle,
    gradient: 'from-cyan-500 to-blue-600',
    badge: 'new',
    badgeColor: 'bg-emerald-500',
  },
  {
    title: '视频反推',
    desc: '智能分析提示词',
    href: '/generate/reverse',
    icon: ScanSearch,
    gradient: 'from-slate-500 to-gray-600',
    badge: 'new',
    badgeColor: 'bg-violet-500',
  },
];

// ==================== More Tools (collapsed) ====================
const moreTools = [
  { title: '局部编辑', href: '/generate/inpaint', icon: Paintbrush },
  { title: '一键仿图', href: '/generate/style-copy', icon: Copy },
  { title: '无损改字', href: '/generate/text-edit', icon: Type },
  { title: '手持产品', href: '/generate/handheld', icon: Hand },
  { title: '多图融合', href: '/generate/multi-fusion', icon: Blend },
  { title: '批量混剪', href: '/digital-human/compose', icon: Clapperboard },
];

// ==================== Template Categories ====================
const CATEGORIES = [
  '全部',
  '装修设计',
  '服饰换装',
  '餐饮美食',
  '人像摄影',
  '电商产品',
  '美容美发',
  '文旅宣传',
  '口播带货',
  '头像表情包',
  '文娱生活',
  '商业创作',
];

export default function WorkspacePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({ images: 0, videos: 0, total: 0 });
  const [showMoreTools, setShowMoreTools] = useState(false);

  // Template gallery state
  const [category, setCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatePage, setTemplatePage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);

  const toolsScrollRef = useRef<HTMLDivElement>(null);

  // Fetch user data
  useEffect(() => {
    generationApi.list({ page: 1 }).then((data: any) => {
      const items = data.items || [];
      const images = items.filter((j: any) => j.type?.includes('IMAGE')).length;
      const videos = items.filter((j: any) => j.type?.includes('VIDEO')).length;
      setStats({ images, videos, total: data.total || items.length });
    }).catch(() => {});

    userApi.getCredits().then((c: any) => setBalance(typeof c === 'number' ? c : c?.balance ?? null)).catch(() => {});
  }, []);

  // Fetch template categories
  useEffect(() => {
    templateApi.categories().then((cats) => {
      setCategories(cats || []);
    }).catch(() => {});
  }, []);

  // Fetch templates when category/search/page changes
  useEffect(() => {
    setLoadingTemplates(true);
    templateApi.list({
      category: category === '全部' ? undefined : category,
      search: searchQuery || undefined,
      page: templatePage,
      pageSize: 24,
    }).then((data) => {
      setTemplates(data.items || []);
      setTotalTemplates(data.total || 0);
      setLoadingTemplates(false);
    }).catch(() => {
      setLoadingTemplates(false);
    });
  }, [category, searchQuery, templatePage]);

  const scrollTools = (dir: 'left' | 'right') => {
    if (toolsScrollRef.current) {
      const amount = dir === 'left' ? -300 : 300;
      toolsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* ==================== Hero Banner ==================== */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-white md:text-3xl">
              欢迎使用 青柚
              <span className="ml-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Sparkles size={12} className="mr-1" />
                AI 创作平台
              </span>
            </h1>
            <p className="max-w-lg text-sm text-white/80">
              一站式 AI 图片 · 视频 · 数字人创作工具，支持 Qwen、Grok、Sora、Veo 等多模型
            </p>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            {/* Stats pills */}
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Wallet size={18} className="text-amber-300" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60">积分</p>
                <p className="text-lg font-bold leading-tight text-white">{balance ?? '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <TrendingUp size={18} className="text-emerald-300" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60">累计生成</p>
                <p className="text-lg font-bold leading-tight text-white">{stats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Zap size={18} className="text-sky-300" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60">图/视频</p>
                <p className="text-lg font-bold leading-tight text-white">
                  {stats.images}<span className="text-white/40">/</span>{stats.videos}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== Quick Tools ==================== */}
      <div className="relative mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">功能菜单</h2>
          <button
            onClick={() => setShowMoreTools(!showMoreTools)}
            className="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showMoreTools ? '收起' : '更多工具'}
          </button>
        </div>

        {/* Tool scroll area */}
        <div className="relative group">
          <button
            onClick={() => scrollTools('left')}
            className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer rounded-full bg-white p-1.5 shadow-lg border border-border text-slate-400 hover:text-slate-700 transition-colors group-hover:flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            ref={toolsScrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group/card relative flex min-w-[160px] cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Badge */}
                  {tool.badge && (
                    <span className={cn(
                      'absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white',
                      tool.badgeColor || 'bg-blue-500'
                    )}>
                      {tool.badge}
                    </span>
                  )}
                  {/* Icon */}
                  <div className={cn(
                    'mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm',
                    tool.gradient
                  )}>
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{tool.title}</span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">{tool.desc}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => scrollTools('right')}
            className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer rounded-full bg-white p-1.5 shadow-lg border border-border text-slate-400 hover:text-slate-700 transition-colors group-hover:flex items-center justify-center"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* More tools (expanded) */}
        {showMoreTools && (
          <div className="mt-3 flex flex-wrap gap-2">
            {moreTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                >
                  <Icon size={16} className="text-muted-foreground" />
                  {tool.title}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== Template / Prompt Gallery ==================== */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">提示词广场</h2>
            <Link
              href="/prompt"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
            >
              更多提示词 <ArrowRight size={12} />
            </Link>
          </div>
          {/* Search bar */}
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="搜索提示词..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setTemplatePage(1);
              }}
              className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setTemplatePage(1);
              }}
              className={cn(
                'cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200',
                category === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template grid */}
        {loadingTemplates ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="aspect-[4/5] bg-muted" />
                <div className="p-3">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
            <Sparkles size={44} strokeWidth={1} className="mb-4 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">暂无模板</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {searchQuery ? '没有找到匹配的模板，试试其他关键词' : '该分类暂无模板，请选择其他分类'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {templates.map((tpl: any) => {
                const isVideo = tpl.category?.includes('视频') ||
                  tpl.name?.includes('视频') ||
                  (tpl.config as any)?.type === 'video';
                return (
                  <Link
                    key={tpl.id}
                    href={`/prompt?template=${tpl.id}`}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      {tpl.thumbnail ? (
                        <img
                          src={tpl.thumbnail}
                          alt={tpl.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <ImageIcon size={32} className="text-slate-300" />
                        </div>
                      )}
                      {/* Type badge */}
                      <div className="absolute left-2 top-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm',
                          isVideo ? 'bg-emerald-500/90' : 'bg-blue-500/90'
                        )}>
                          {isVideo ? <><Play size={9} /> 视频</> : '图片'}
                        </span>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                          <ExternalLink size={12} /> 查看详情
                        </span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-2.5">
                      <p className="truncate text-xs font-medium text-foreground">{tpl.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalTemplates > 24 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={templatePage <= 1}
                  onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                  className="cursor-pointer gap-1 text-xs"
                >
                  <ChevronLeft size={14} /> 上一页
                </Button>
                <span className="text-xs text-muted-foreground">
                  第 {templatePage} 页 / 共 {Math.ceil(totalTemplates / 24)} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={templatePage >= Math.ceil(totalTemplates / 24)}
                  onClick={() => setTemplatePage((p) => p + 1)}
                  className="cursor-pointer gap-1 text-xs"
                >
                  下一页 <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
