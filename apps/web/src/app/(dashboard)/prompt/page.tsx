'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { templateApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Search,
  Image as ImageIcon,
  Video,
  Sparkles,
  Eye,
  Copy,
  ArrowRight,
  Loader2,
} from 'lucide-react';

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
  '公共服务',
];

export default function PromptLibraryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await templateApi.list({
        category: category === '全部' ? undefined : category,
        search: search || undefined,
        page,
        pageSize: 20,
      });
      setTemplates(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleCopy = async (template: any) => {
    const prompt = template.config?.prompt || template.description || '';
    await navigator.clipboard.writeText(prompt);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = (template: any) => {
    const prompt = template.config?.prompt || template.description || '';
    const type = template.type;
    if (type === 'TEXT_TO_VIDEO' || type === 'IMAGE_TO_VIDEO') {
      router.push(`/generate/grok-video?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push(`/generate/grok-image?prompt=${encodeURIComponent(prompt)}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={22} className="text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">AI 提示词广场</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          探索精选提示词范例，每条都配有实际案例，助你快速掌握 AI 创作技巧
        </p>
      </div>

      {/* Search */}
      <div className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索提示词..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
          />
        </div>
        <button
          onClick={handleSearch}
          className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          搜索
        </button>
      </div>

      {/* Categories */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={cn(
              'cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
              category === cat
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="mb-4 text-xs text-muted-foreground">
        共 {total} 个提示词
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
          <Sparkles size={40} strokeWidth={1} className="mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">暂无提示词</p>
          <p className="mt-1 text-xs text-muted-foreground/60">管理员可在后台添加提示词模板</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square overflow-hidden bg-muted">
                {tpl.thumbnail ? (
                  tpl.type?.includes('VIDEO') ? (
                    <video
                      src={tpl.thumbnail}
                      className="h-full w-full object-cover"
                      muted
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                  ) : (
                    <img src={tpl.thumbnail} alt={tpl.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {tpl.type?.includes('VIDEO') ? (
                      <Video size={32} className="text-muted-foreground/20" />
                    ) : (
                      <ImageIcon size={32} className="text-muted-foreground/20" />
                    )}
                  </div>
                )}
                {/* Type badge */}
                <div className="absolute left-2 top-2">
                  <span className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm',
                    tpl.type?.includes('VIDEO')
                      ? 'bg-blue-500/80 text-white'
                      : 'bg-amber-500/80 text-white',
                  )}>
                    {tpl.type?.includes('VIDEO') ? '视频' : '图片'}
                  </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleCopy(tpl)}
                    className="cursor-pointer rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow transition-colors hover:bg-white"
                  >
                    <Copy size={12} className="mr-1 inline" />
                    {copiedId === tpl.id ? '已复制' : '复制'}
                  </button>
                  <button
                    onClick={() => handleUse(tpl)}
                    className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                  >
                    使用 <ArrowRight size={12} className="ml-0.5 inline" />
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="truncate text-sm font-medium text-foreground">{tpl.name}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {tpl.category && <span className="rounded bg-muted px-1.5 py-0.5">{tpl.category}</span>}
                  {tpl.config?.provider && <span>{tpl.config.provider}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
