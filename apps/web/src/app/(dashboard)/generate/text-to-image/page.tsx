'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { generationApi } from '@/lib/api';
import { useJobUpdates } from '@/components/ws-provider';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PromptPolishButton } from '@/components/prompt-polish-button';
import { TemplateCarousel } from '@/components/template-carousel';
import {
  Sparkles,
  Upload,
  X,
  Download,
  Clock,
  Loader2,
  ImageIcon,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Camera,
  ClipboardPaste,
} from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '1:1', desc: '头像/社交', w: 1024, h: 1024, ratio: 1 },
  { label: '16:9', desc: '横屏/广告', w: 1280, h: 720, ratio: 16 / 9 },
  { label: '9:16', desc: '竖屏/短视频', w: 720, h: 1280, ratio: 9 / 16 },
  { label: '4:3', desc: '传统/展示', w: 1024, h: 768, ratio: 4 / 3 },
  { label: '3:4', desc: '海报/肖像', w: 768, h: 1024, ratio: 3 / 4 },
];

const COUNT_OPTIONS = [1, 2, 4];

export default function TextToImagePage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [ratioIdx, setRatioIdx] = useState(0);
  const [count, setCount] = useState(1);
  const [providers, setProviders] = useState<{ id: string; name: string; creditCost?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'mine' | 'public'>('mine');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useJobUpdates(activeJobId, (data) => {
    setResult((prev: any) => ({ ...prev, ...data }));
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      setPolling(false);
      setActiveJobId(null);
      if (data.status === 'COMPLETED') {
        generationApi.list({ type: 'IMAGE' }).then((d: any) => {
          setHistory((d.items || []).slice(0, 20));
        }).catch(() => {});
      }
    }
  });

  useEffect(() => {
    generationApi.getProviders().then((data: any) => {
      const imgs = data.image || [];
      setProviders(imgs);
      if (imgs.length > 0) setProviderId(imgs[0].id);
    }).catch(() => {});

    generationApi.list({ type: 'IMAGE' }).then((data: any) => {
      setHistory((data.items || []).slice(0, 20));
    }).catch(() => {});
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    setPolling(true);
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const job = await generationApi.get(jobId);
        setResult(job);
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          setPolling(false);
          if (job.status === 'COMPLETED') {
            generationApi.list({ type: 'IMAGE' }).then((data: any) => {
              setHistory((data.items || []).slice(0, 20));
            }).catch(() => {});
          }
          return;
        }
      } catch { break; }
    }
    setPolling(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setReferencePreview(reader.result as string);
    reader.readAsDataURL(file);
    setReferenceFile(file);
    setReferenceImage(null);
  };

  const clearReference = () => {
    setReferenceImage(null);
    setReferenceFile(null);
    setReferencePreview(null);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        setError('');
        const reader = new FileReader();
        reader.onload = () => setReferencePreview(reader.result as string);
        reader.readAsDataURL(file);
        setReferenceFile(file);
        setReferenceImage(null);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('请输入图片描述'); return; }
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
      const size = ASPECT_RATIOS[ratioIdx];
      const job = await generationApi.createImage({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: size.w,
        height: size.h,
        providerId,
        count,
        referenceImage: imgUrl || undefined,
      });
      setResult(job);
      setActiveJobId(job.id);
      setLoading(false);
      pollJob(job.id);
    } catch (err: any) {
      setError(err.message || '生成失败');
      setLoading(false);
    }
  };

  const estimatedCost = count * (providers.find(p => p.id === providerId)?.creditCost || 5);

  return (
    <div className="mx-auto w-full max-w-full">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Main workspace */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-foreground">AI 图片生成</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              队列模式 · 提交即返回 · 后台自动处理 · 失败自动重试
            </p>
          </div>

          {/* Quick templates */}
          <TemplateCarousel type="IMAGE" onSelect={setPrompt} />

          {/* Upload area */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Camera size={15} className="text-muted-foreground" />
              上传参考图（可选）
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {referencePreview ? (
              <div className="relative inline-block">
                <img src={referencePreview} alt="参考图" className="h-[180px] rounded-lg border border-border object-cover" />
                <button
                  onClick={clearReference}
                  className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md transition-colors hover:bg-foreground/80"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
              >
                <Upload size={28} className="mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">点击上传或拖拽图片</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <ClipboardPaste size={11} />
                  按 Ctrl+V 粘贴图片
                </p>
              </div>
            )}
          </div>

          {/* Prompt area */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Sparkles size={15} className="text-amber-500" />
              提示词
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
              rows={4}
              maxLength={2000}
              placeholder="描述你想要生成的图片内容，越详细效果越好..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNegative(!showNegative)}
                  className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showNegative ? '收起反向描述' : '+ 反向描述'}
                </button>
                <PromptPolishButton prompt={prompt} type="image" onPolished={setPrompt} />
              </div>
              <span className="text-xs text-muted-foreground/60">{prompt.length} / 2000</span>
            </div>
            {showNegative && (
              <textarea
                className="mt-2 w-full resize-none rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
                rows={2}
                maxLength={2000}
                placeholder="描述你不想出现的内容..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
            )}
          </div>

          {/* Parameter cards */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {/* Aspect ratio */}
            <div className="mb-5">
              <label className="mb-3 block text-sm font-medium text-foreground">图片比例</label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRatioIdx(i)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-4 py-2.5 text-center transition-all duration-200',
                      ratioIdx === i
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn('text-sm font-medium', ratioIdx === i && 'text-primary')}>{r.label}</div>
                    <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model selection */}
            <div className="mb-5">
              <label className="mb-3 block text-sm font-medium text-foreground">生成模型</label>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProviderId(p.id)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-4 py-2.5 text-left transition-all duration-200',
                      providerId === p.id
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn('text-sm font-medium', providerId === p.id && 'text-primary')}>{p.name}</div>
                    {p.creditCost && (
                      <div className="text-[10px] text-muted-foreground">{p.creditCost} 积分/张</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">生成数量</label>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-5 py-2 text-sm font-medium transition-all duration-200',
                      count === n
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50'
                    )}
                  >
                    {n}张
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <Button
              onClick={handleGenerate}
              disabled={loading || polling}
              className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> 提交中...</>
              ) : polling ? (
                <><Loader2 size={18} className="animate-spin" /> 生成中...</>
              ) : (
                <><Wand2 size={18} /> 生成图片</>
              )}
            </Button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              本次消耗 <span className="font-semibold text-primary">{estimatedCost}</span> 积分
            </p>
          </div>

          {/* Result area */}
          {result && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-sm font-semibold text-foreground">生成结果</h2>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  result.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                  result.status === 'FAILED' ? 'bg-destructive/10 text-destructive' :
                  result.status === 'PROCESSING' ? 'bg-primary/10 text-primary' :
                  'bg-amber-50 text-amber-600'
                )}>
                  {result.status === 'COMPLETED' ? <><CheckCircle2 size={12} /> 已完成</> :
                   result.status === 'FAILED' ? <><AlertCircle size={12} /> 失败</> :
                   result.status === 'PROCESSING' ? <><Loader2 size={12} className="animate-spin" /> 生成中</> :
                   <><Clock size={12} /> 排队中</>}
                </span>
                {result.creditsUsed > 0 && (
                  <span className="text-xs text-muted-foreground">消耗 {result.creditsUsed} 积分</span>
                )}
              </div>

              {polling && (
                <div className="mb-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: '60%' }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">正在生成，请耐心等待...</p>
                </div>
              )}

              {result.status === 'COMPLETED' && result.output && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {(Array.isArray(result.output.images) ? result.output.images : [result.output.url]).filter(Boolean).map((url: string, i: number) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                      <img src={url} alt={`生成图片 ${i + 1}`} className="w-full" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <a
                          href={url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-white"
                        >
                          <Download size={12} /> 下载
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.status === 'FAILED' && (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
                  <AlertCircle size={18} className="shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">生成失败</p>
                    <p className="text-xs text-destructive/70">{result.errorMsg || '请稍后重试'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar: History */}
        <div className="hidden xl:block">
          <div className="sticky top-0 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-4 border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">生成记录</h3>
            </div>
            <div className="flex border-b border-border">
              {(['mine', 'public'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryTab(tab)}
                  className={cn(
                    'flex-1 cursor-pointer py-2.5 text-xs font-medium transition-colors',
                    historyTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'mine' ? '我的' : '公共'}
                </button>
              ))}
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-3">
              {history.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground/50">
                  暂无生成记录
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {history.map((item: any) => (
                    <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                      {item.status === 'COMPLETED' && (item.output?.images?.[0] || item.output?.url) ? (
                        <img
                          src={item.output.images?.[0] || item.output.url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground/50">
                          {item.status === 'FAILED' ? '失败' : '...'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
