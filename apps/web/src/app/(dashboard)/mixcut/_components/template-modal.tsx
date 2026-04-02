'use client';

import { useState, useEffect } from 'react';
import { templateApi } from '@/lib/api';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { X, Loader2, Check, LayoutTemplate } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  config: any;
}

export function TemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { updateGlobalConfig, updateSubtitleStyle, updateTitleStyle, setHighlightWords } = useMixcutStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      templateApi.list({ category: activeCategory === '全部' ? undefined : activeCategory, type: 'mixcut', pageSize: 100 }),
      templateApi.categories(),
    ]).then(([res, cats]) => {
      setTemplates(res.items || []);
      setCategories(cats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, activeCategory]);

  const handleApply = (template: Template) => {
    const cfg = template.config;
    if (cfg.globalConfig) updateGlobalConfig(cfg.globalConfig);
    if (cfg.subtitleStyle) updateSubtitleStyle(cfg.subtitleStyle);
    if (cfg.titleStyle) updateTitleStyle(cfg.titleStyle);
    if (cfg.highlightWords) setHighlightWords(cfg.highlightWords);
    setApplied(template.id);
    setTimeout(() => {
      setApplied(null);
      onClose();
    }, 800);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[640px] max-h-[80vh] rounded-xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <LayoutTemplate size={14} className="text-primary" /> 混剪模板库
          </h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b px-5 py-2 scrollbar-thin">
          <button
            onClick={() => setActiveCategory('全部')}
            className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition-all ${
              activeCategory === '全部'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-input hover:bg-accent'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition-all ${
                activeCategory === cat.name
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {cat.name}
              <span className="ml-0.5 text-[9px] opacity-60">{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <LayoutTemplate size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">暂无模板</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">可以通过「保存为模板」创建自己的混剪配置模板</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleApply(t)}
                  className="group relative rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="mb-2 aspect-video overflow-hidden rounded-lg bg-muted">
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt={t.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <LayoutTemplate size={20} className="text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="text-[12px] font-medium line-clamp-1">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.category}</div>
                  {/* Applied indicator */}
                  {applied === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/90">
                      <Check size={24} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
