'use client';

import { useState, useEffect, useRef } from 'react';
import { templateApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon, Video } from 'lucide-react';

interface TemplateCarouselProps {
  type: 'IMAGE' | 'VIDEO';
  onSelect: (prompt: string) => void;
}

export function TemplateCarousel({ type, onSelect }: TemplateCarouselProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    templateApi
      .list({ type: type.includes('VIDEO') ? 'TEXT_TO_VIDEO' : 'TEXT_TO_IMAGE', pageSize: 20 })
      .then((data) => {
        setTemplates(data.items || []);
        setTimeout(checkScroll, 100);
      })
      .catch(() => {});
  }, [type]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  if (templates.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Sparkles size={14} className="text-amber-500" />
          快捷模板
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {templates.map((tpl) => {
          const prompt = tpl.config?.prompt || tpl.description || '';
          return (
            <button
              key={tpl.id}
              onClick={() => onSelect(prompt)}
              className="group flex w-[140px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-background transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {tpl.thumbnail ? (
                  <img
                    src={tpl.thumbnail}
                    alt={tpl.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {type.includes('VIDEO') ? (
                      <Video size={24} className="text-muted-foreground/20" />
                    ) : (
                      <ImageIcon size={24} className="text-muted-foreground/20" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-foreground">使用</span>
                </div>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-foreground">{tpl.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
