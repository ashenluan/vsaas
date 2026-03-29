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
  Clock,
  Sparkles,
  Copy,
  Image as ImageIcon,
  ArrowRight,
  Camera,
} from 'lucide-react';

const COUNT_OPTIONS = [1, 2, 4];

export default function StyleCopyPage() {
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useJobUpdates(activeJobId, (data) => {
    setResult((prev: any) => ({ ...prev, ...data }));
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      setPolling(false);
      setActiveJobId(null);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    setResult(null);
    setReferenceFile(file);
    setReferenceImage(null);
    const reader = new FileReader();
    reader.onload = () => setReferencePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setReferenceImage(null);
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleGenerate = async () => {
    if (!referenceFile && !referenceImage) { setError('请上传参考图片'); return; }
    if (!prompt.trim()) { setError('请描述你想生成的内容'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      let imgUrl = referenceImage;
      if (referenceFile && !imgUrl) {
        const { url } = await uploadToOSS(referenceFile);
        imgUrl = url;
        setReferenceImage(url);
      }

      const job = await generationApi.createImage({
        type: 'STYLE_COPY',
        referenceImage: imgUrl,
        prompt: prompt.trim(),
        count,
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
            <Copy size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">一键仿图</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传参考图片，AI 学习其风格并生成类似风格的新图片
          </p>
        </div>

        {/* Reference image */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Camera size={15} className="text-muted-foreground" />
            上传参考图（风格来源）
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {referencePreview ? (
            <div className="relative inline-block">
              <img src={referencePreview} alt="参考图" className="max-h-[280px] rounded-lg border border-border object-contain" />
              <button
                onClick={clearReference}
                className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
            >
              <Upload size={28} className="mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">选择参考图片</p>
              <p className="mt-1 text-xs text-muted-foreground/60">AI 将学习该图片的风格</p>
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles size={15} className="text-amber-500" />
            描述新图片内容
          </label>
          <textarea
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
            rows={4}
            maxLength={1000}
            placeholder="描述你希望生成的内容，AI 会保留参考图的风格来生成..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <PromptPolishButton prompt={prompt} type="image" onPolished={setPrompt} />
            <span className="text-xs text-muted-foreground/60">{prompt.length}/1000</span>
          </div>
        </div>

        {/* Count */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-foreground">生成数量</label>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={cn(
                  'cursor-pointer rounded-lg border px-5 py-2 text-sm font-medium transition-all',
                  count === c
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50'
                )}
              >
                {c} 张
              </button>
            ))}
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
             polling ? <><Loader2 size={18} className="animate-spin" /> 生成中...</> :
             <><Wand2 size={18} /> 一键仿图</>}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            消耗 <span className="font-semibold text-primary">{5 * count}</span> 积分
            {count > 1 && <span className="text-muted-foreground/60"> (5 × {count})</span>}
          </p>
        </div>

        {/* Result */}
        {result && result.status === 'COMPLETED' && result.output && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">仿图结果</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(result.output.images || [result.output]).map((img: any, i: number) => {
                const url = img.url || img.imageUrl || img;
                if (!url || typeof url !== 'string') return null;
                return (
                  <div key={i} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`结果 ${i + 1}`} className="aspect-square w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <a href={url} download target="_blank" rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-white">
                        <Download size={12} /> 下载
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result && result.status === 'FAILED' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
              <AlertCircle size={18} className="shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">生成失败</p>
                <p className="text-xs text-destructive/70">{result.errorMsg || '请重试'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
