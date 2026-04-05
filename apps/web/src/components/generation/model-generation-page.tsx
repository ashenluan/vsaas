'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { generationApi } from '@/lib/api';
import { useJobUpdates, useWs } from '@/components/ws-provider';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PromptPolishButton } from '@/components/prompt-polish-button';
import { TemplateCarousel } from '@/components/template-carousel';
import {
  Upload,
  X,
  Download,
  Clock,
  Loader2,
  Wand2,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Play,
  Copy,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Reusable option-selector (pill buttons)                           */
/* ------------------------------------------------------------------ */

export function OptionSelector<T extends string | number>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon?: string;
  options: { label: string; value: T; desc?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4">
      <label className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon && <span>{icon}</span>}
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={cn(
              'cursor-pointer rounded-lg border px-4 py-2 text-center transition-all duration-200',
              value === opt.value
                ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50',
            )}
          >
            <div className={cn('text-sm font-medium', value === opt.value && 'text-primary')}>
              {opt.label}
            </div>
            {opt.desc && (
              <div className={cn(
                'mt-0.5 text-[10px]',
                value === opt.value ? 'text-primary/70' : 'text-muted-foreground',
              )}>
                {opt.desc}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main shared page component                                        */
/* ------------------------------------------------------------------ */

export interface ModelGenerationPageProps {
  /** Display name shown in title */
  modelName: string;
  /** Subtitle description */
  modelDesc: string;
  /** Description tags shown next to title (e.g. "队列模式", "自动配音") */
  descTags?: string[];
  /** Title emoji icon */
  titleIcon?: string;
  /** Fixed provider id sent to backend */
  providerId: string;
  /** image or video — determines API endpoint and result display */
  type: 'image' | 'video';
  /** Lucide icon for the title (fallback if no titleIcon) */
  icon: React.ElementType;
  /** Build the API payload. Called at generate-time with the prompt & optional reference image URL. */
  buildPayload: (prompt: string, negativePrompt: string, referenceImage?: string) => any;
  /** Render model-specific parameter controls (duration, resolution, etc.) */
  renderParameters: () => React.ReactNode;
  /** Return estimated credit cost for the current parameter state */
  estimateCost: () => number;
  /** Show negative-prompt toggle (image models) */
  showNegativePrompt?: boolean;
  /** Custom placeholder for the prompt textarea */
  promptPlaceholder?: string;
  /** Max reference images allowed (default 1) */
  maxReferenceImages?: number;
  /** Upload area label override */
  uploadLabel?: string;
  /** Upload area hint text */
  uploadHint?: string;
}

export function ModelGenerationPage({
  modelName,
  modelDesc,
  descTags,
  titleIcon,
  providerId,
  type,
  icon: Icon,
  buildPayload,
  renderParameters,
  estimateCost,
  showNegativePrompt = false,
  promptPlaceholder,
  maxReferenceImages = 1,
  uploadLabel,
  uploadHint,
}: ModelGenerationPageProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const genType = type === 'image' ? 'IMAGE' : 'VIDEO';

  const { connected: wsConnected } = useWs();

  /* ---- WebSocket updates ---- */
  useJobUpdates(activeJobId, (data) => {
    setResult((prev: any) => ({ ...prev, ...data }));
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      setPolling(false);
      setActiveJobId(null);
      if (data.status === 'COMPLETED') refreshHistory();
    }
  });

  const refreshHistory = useCallback(() => {
    generationApi.list({ type: genType, provider: providerId }).then((d: any) => {
      setHistory((d.items || []).slice(0, 20));
    }).catch(() => {});
  }, [genType, providerId]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  /* ---- Polling fallback ---- */
  const pollJob = useCallback(
    async (jobId: string) => {
      setPolling(true);
      const maxAttempts = type === 'video' ? 180 : 120;
      const interval = type === 'video' ? 5000 : 3000;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, interval));
        try {
          const job = await generationApi.get(jobId);
          setResult(job);
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            setPolling(false);
            if (job.status === 'COMPLETED') refreshHistory();
            return;
          }
        } catch {
          break;
        }
      }
      setPolling(false);
    },
    [type, refreshHistory],
  );

  /* ---- Reference image handling ---- */
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

  /* ---- Generate ---- */
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(type === 'image' ? '请输入图片描述' : '请输入视频描述');
      return;
    }
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
      const payload = buildPayload(prompt.trim(), negativePrompt.trim(), imgUrl || undefined);
      const job =
        type === 'image'
          ? await generationApi.createImage(payload)
          : await generationApi.createVideo(payload);
      setResult(job);
      setActiveJobId(job.id);
      setLoading(false);
      // Only start polling if WebSocket is not connected
      if (!wsConnected) pollJob(job.id);
    } catch (err: any) {
      setError(err.message || '生成失败');
      setLoading(false);
    }
  };

  /* ---- Render ---- */
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="space-y-4">
        {/* ===== Title ===== */}
        <div className="mb-2">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            {titleIcon ? (
              <span className="text-xl">{titleIcon}</span>
            ) : (
              <Icon size={22} className="text-primary" />
            )}
            {modelName}
          </h1>
          {descTags && descTags.length > 0 ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {descTags.map((tag, i) => (
                <span key={i}>
                  {i > 0 && <span className="mr-1.5 text-border">·</span>}
                  {tag}
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{modelDesc}</p>
          )}
        </div>

        {/* ===== Reference image upload ===== */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <span>📷</span>
            {uploadLabel || (type === 'video' ? '上传场景/产品图（可选）' : '参考图片（可选' + (maxReferenceImages > 1 ? `，最多${maxReferenceImages}张` : '') + '）')}
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
              <img
                src={referencePreview}
                alt="参考图"
                className="h-[160px] rounded-lg border border-border object-cover"
              />
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
              className="flex h-[140px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Upload size={26} className="mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {type === 'video' ? '选择场景/产品图' : '点击上传或拖拽图片'}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <ClipboardPaste size={11} />
                按 Ctrl+V 粘贴图片
              </p>
            </div>
          )}
          {uploadHint && (
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              💡 {uploadHint}
            </p>
          )}
        </div>

        {/* ===== Prompt area ===== */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>✨</span>
              提示词
            </label>
            <div className="flex items-center gap-1.5">
              {type === 'video' && (
                <button
                  className="cursor-pointer rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  title="基于视频反推提示词"
                >
                  视频复刻
                </button>
              )}
              <PromptPolishButton prompt={prompt} type={type} onPolished={setPrompt} />
            </div>
          </div>
          <textarea
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
            rows={type === 'video' ? 5 : 4}
            maxLength={2000}
            placeholder={
              promptPlaceholder ||
              (type === 'image'
                ? '描述你想要生成的图片内容，越详细效果越好...'
                : '描述如何将图片变成视频，例如：\n让画面中的角色动起来，自然的动作\n相机缓慢推进，突出画面细节\n添加动态光影效果，营造氛围感')
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showNegativePrompt && (
                <button
                  onClick={() => setShowNegative(!showNegative)}
                  className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showNegative ? '收起反向描述' : '+ 反向描述'}
                </button>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/50">{prompt.length} / 2000</span>
          </div>
          {showNegativePrompt && showNegative && (
            <textarea
              className="mt-2 w-full resize-none rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
              rows={2}
              maxLength={2000}
              placeholder="描述你不想出现的内容..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
          )}
        </div>

        {/* ===== Quick templates ===== */}
        <TemplateCarousel type={genType} onSelect={setPrompt} />

        {/* ===== Model-specific parameters ===== */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {renderParameters()}
        </div>

        {/* ===== Generate button ===== */}
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
            className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-md transition-all hover:shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> 提交中...
              </>
            ) : polling ? (
              <>
                <Loader2 size={18} className="animate-spin" /> 生成中...
              </>
            ) : (
              <>
                <Wand2 size={18} /> {type === 'image' ? '生成图片' : '生成视频'}
              </>
            )}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            本次消耗 <span className="font-semibold text-primary">{estimateCost()}</span> 积分
          </p>
        </div>

        {/* ===== Result area ===== */}
        {result && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">生成结果</h2>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  result.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : result.status === 'FAILED'
                      ? 'bg-destructive/10 text-destructive'
                      : result.status === 'PROCESSING'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
                )}
              >
                {result.status === 'COMPLETED' ? (
                  <><CheckCircle2 size={12} /> 已完成</>
                ) : result.status === 'FAILED' ? (
                  <><AlertCircle size={12} /> 失败</>
                ) : result.status === 'PROCESSING' ? (
                  <><Loader2 size={12} className="animate-spin" /> 生成中</>
                ) : (
                  <><Clock size={12} /> 排队中</>
                )}
              </span>
              {result.creditsUsed > 0 && (
                <span className="text-xs text-muted-foreground">
                  消耗 {result.creditsUsed} 积分
                </span>
              )}
            </div>

            {polling && (
              <div className="mb-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full animate-pulse rounded-full bg-primary"
                    style={{ width: type === 'video' ? '45%' : '60%' }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {type === 'video'
                    ? '视频生成需要较长时间，请耐心等待...'
                    : '正在生成，请耐心等待...'}
                </p>
              </div>
            )}

            {/* Image result */}
            {result.status === 'COMPLETED' && result.output && type === 'image' && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {(Array.isArray(result.output.images)
                  ? result.output.images
                  : [result.output.url]
                )
                  .filter(Boolean)
                  .map((url: string, i: number) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
                    >
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

            {/* Video result */}
            {result.status === 'COMPLETED' && result.output && type === 'video' && (
              <div className="max-w-2xl">
                {(result.output.url || result.output.videoUrl) && (
                  <div className="group relative overflow-hidden rounded-xl border border-border shadow-sm">
                    <video
                      src={result.output.url || result.output.videoUrl}
                      controls
                      className="w-full"
                    />
                    <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={result.output.url || result.output.videoUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-white"
                      >
                        <Download size={12} /> 下载
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.status === 'FAILED' && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
                <AlertCircle size={18} className="shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">生成失败</p>
                  <p className="text-xs text-destructive/70">
                    {result.errorMsg || '请稍后重试'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== History / 我的作品 ===== */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              {type === 'image' ? '我的作品' : '生成记录'}
            </h3>
          </div>
          <div className="p-4">
            {history.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground/50">
                请登录后查看生成记录
              </div>
            ) : type === 'image' ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {history.map((item: any) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    {item.status === 'COMPLETED' &&
                    (item.output?.images?.[0] || item.output?.url) ? (
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
            ) : (
              <div className="space-y-2">
                {history.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      {item.status === 'COMPLETED' ? (
                        <Play size={14} className="text-emerald-500" />
                      ) : item.status === 'FAILED' ? (
                        <AlertCircle size={14} className="text-destructive" />
                      ) : (
                        <Loader2 size={14} className="animate-spin text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-foreground">
                        {(item.input as any)?.prompt || '未知'}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : item.status === 'FAILED'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary',
                      )}
                    >
                      {item.status === 'COMPLETED'
                        ? '完成'
                        : item.status === 'FAILED'
                          ? '失败'
                          : '处理中'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
