'use client';

import { useState, useRef } from 'react';
import { generationApi } from '@/lib/api';
import { useJobUpdates } from '@/components/ws-provider';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PromptPolishButton } from '@/components/prompt-polish-button';
import {
  Upload,
  X,
  Loader2,
  Wand2,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';

interface ImageSlot {
  id: string;
  file: File | null;
  preview: string | null;
  url: string | null;
}

function createSlot(): ImageSlot {
  return { id: Math.random().toString(36).slice(2, 10), file: null, preview: null, url: null };
}

const FUSION_MODES = [
  { label: '智能融合', value: 'auto', desc: 'AI自动选择最佳方式' },
  { label: '风格统一', value: 'style', desc: '统一多图风格' },
  { label: '场景合成', value: 'scene', desc: '将多个元素合成到一个场景' },
  { label: '拼贴创意', value: 'collage', desc: '创意拼贴组合' },
];

export default function MultiFusionPage() {
  const [images, setImages] = useState<ImageSlot[]>([createSlot(), createSlot()]);
  const [prompt, setPrompt] = useState('');
  const [fusionMode, setFusionMode] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useJobUpdates(activeJobId, (data) => {
    setResult((prev: any) => ({ ...prev, ...data }));
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      setPolling(false);
      setActiveJobId(null);
    }
  });

  const handleFileChange = (slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImages(prev => prev.map(s =>
        s.id === slotId ? { ...s, file, preview: reader.result as string, url: null } : s
      ));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (id: string) => {
    if (images.length <= 2) {
      setImages(prev => prev.map(s => s.id === id ? createSlot() : s));
    } else {
      setImages(prev => prev.filter(s => s.id !== id));
    }
  };

  const addSlot = () => {
    if (images.length >= 6) { setError('最多支持6张图片'); return; }
    setImages(prev => [...prev, createSlot()]);
  };

  const handleGenerate = async () => {
    const filledImages = images.filter(s => s.file || s.url);
    if (filledImages.length < 2) { setError('请至少上传2张图片'); return; }
    if (!prompt.trim()) { setError('请描述融合效果'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Upload all images
      const urls: string[] = [];
      for (const img of filledImages) {
        if (img.url) {
          urls.push(img.url);
        } else if (img.file) {
          const { url } = await uploadToOSS(img.file);
          setImages(prev => prev.map(s => s.id === img.id ? { ...s, url } : s));
          urls.push(url);
        }
      }

      const job = await generationApi.createImage({
        type: 'MULTI_FUSION',
        images: urls,
        fusionMode,
        prompt: prompt.trim(),
      });

      setResult(job);
      setActiveJobId(job.id);
      setPolling(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || '生成失败');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Layers size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">多图融合</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传多张图片，AI 智能融合生成全新创意图片
          </p>
        </div>

        {/* Upload images */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ImageIcon size={15} className="text-muted-foreground" />
              上传图片（2-6张）
            </label>
            <button
              onClick={addSlot}
              disabled={images.length >= 6}
              className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={12} /> 添加
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((slot) => (
              <div key={slot.id}>
                <input
                  ref={(el) => { fileInputRefs.current[slot.id] = el; }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(slot.id, e)}
                  className="hidden"
                />
                {slot.preview ? (
                  <div className="relative">
                    <img
                      src={slot.preview}
                      alt="素材"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                    <button
                      onClick={() => removeImage(slot.id)}
                      className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-foreground p-0.5 text-card shadow-md hover:bg-foreground/80"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRefs.current[slot.id]?.click()}
                    className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <Upload size={20} className="mb-1 text-muted-foreground/40" />
                    <p className="text-[10px] text-muted-foreground/60">添加图片</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fusion mode */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-foreground">融合模式</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FUSION_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setFusionMode(m.value)}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-all',
                  fusionMode === m.value
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-card text-foreground hover:border-primary/30'
                )}
              >
                <div className={cn('text-xs font-medium', fusionMode === m.value && 'text-primary')}>{m.label}</div>
                <div className="text-[10px] text-muted-foreground">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles size={15} className="text-amber-500" />
            描述融合效果
          </label>
          <textarea
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
            rows={3}
            maxLength={1000}
            placeholder="描述你希望的融合效果，例如：将这些元素融合到一个温馨的室内场景中..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <PromptPolishButton prompt={prompt} type="image" onPolished={setPrompt} />
            <span className="text-xs text-muted-foreground/60">{prompt.length}/1000</span>
          </div>
        </div>

        {/* Generate */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <Button
            onClick={handleGenerate}
            disabled={loading || polling}
            className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> 上传中...</> :
             polling ? <><Loader2 size={18} className="animate-spin" /> 融合中...</> :
             <><Wand2 size={18} /> 开始融合</>}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            消耗 <span className="font-semibold text-primary">10</span> 积分
          </p>
        </div>

        {/* Result */}
        {result && result.status === 'COMPLETED' && result.output && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">融合结果</h3>
            </div>
            <div className="group relative max-w-lg">
              <img
                src={result.output.url || result.output.imageUrl}
                alt="融合结果"
                className="w-full rounded-lg border border-border"
              />
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <a href={result.output.url || result.output.imageUrl} download target="_blank" rel="noreferrer"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-white">
                  <Download size={12} /> 下载
                </a>
              </div>
            </div>
          </div>
        )}

        {result && result.status === 'FAILED' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
              <AlertCircle size={18} className="shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">融合失败</p>
                <p className="text-xs text-destructive/70">{result.errorMsg || '请重试'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
