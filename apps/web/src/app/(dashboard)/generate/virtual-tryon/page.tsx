'use client';

import { useState, useRef } from 'react';
import { generationApi } from '@/lib/api';
import { useJobUpdates } from '@/components/ws-provider';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Upload,
  X,
  Loader2,
  Wand2,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shirt,
  User,
  Image as ImageIcon,
  ArrowRight,
  Camera,
  Sparkles,
  Settings2,
} from 'lucide-react';

interface UploadSlot {
  file: File | null;
  preview: string | null;
  url: string | null;
}

const emptySlot: UploadSlot = { file: null, preview: null, url: null };

export default function VirtualTryOnPage() {
  const [personImage, setPersonImage] = useState<UploadSlot>(emptySlot);
  const [topGarment, setTopGarment] = useState<UploadSlot>(emptySlot);
  const [bottomGarment, setBottomGarment] = useState<UploadSlot>(emptySlot);
  const [tryonModel, setTryonModel] = useState<'aitryon' | 'aitryon-plus'>('aitryon');
  const [resolution, setResolution] = useState<number>(-1);
  const [restoreFace, setRestoreFace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const personInputRef = useRef<HTMLInputElement>(null);
  const topInputRef = useRef<HTMLInputElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);

  const creditCost = tryonModel === 'aitryon-plus' ? 12 : 8;

  useJobUpdates(activeJobId, (data) => {
    setResult((prev: any) => ({ ...prev, ...data }));
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      setPolling(false);
      setActiveJobId(null);
    }
  });

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadSlot>>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setter({ file, preview: reader.result as string, url: null });
    reader.readAsDataURL(file);
  };

  const clearSlot = (setter: React.Dispatch<React.SetStateAction<UploadSlot>>) => {
    setter(emptySlot);
  };

  const handleGenerate = async () => {
    if (!personImage.file && !personImage.url) { setError('请上传人物照片'); return; }
    if (!topGarment.file && !topGarment.url && !bottomGarment.file && !bottomGarment.url) {
      setError('请至少上传一件服装（上装或下装）');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Upload images in parallel
      const uploads: Promise<void>[] = [];

      let personUrl = personImage.url;
      if (personImage.file && !personUrl) {
        uploads.push(
          uploadToOSS(personImage.file).then(({ url }) => {
            personUrl = url;
            setPersonImage(prev => ({ ...prev, url }));
          }),
        );
      }

      let topUrl = topGarment.url;
      if (topGarment.file && !topUrl) {
        uploads.push(
          uploadToOSS(topGarment.file).then(({ url }) => {
            topUrl = url;
            setTopGarment(prev => ({ ...prev, url }));
          }),
        );
      }

      let bottomUrl = bottomGarment.url;
      if (bottomGarment.file && !bottomUrl) {
        uploads.push(
          uploadToOSS(bottomGarment.file).then(({ url }) => {
            bottomUrl = url;
            setBottomGarment(prev => ({ ...prev, url }));
          }),
        );
      }

      await Promise.all(uploads);

      const job = await generationApi.createImage({
        type: 'VIRTUAL_TRYON',
        personImage: personUrl,
        topGarmentUrl: topUrl || undefined,
        bottomGarmentUrl: bottomUrl || undefined,
        tryonModel,
        resolution,
        restoreFace,
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

  const renderUploadSlot = (
    label: string,
    icon: React.ReactNode,
    slot: UploadSlot,
    setter: React.Dispatch<React.SetStateAction<UploadSlot>>,
    inputRef: React.RefObject<HTMLInputElement | null>,
    hint: string,
    subHint: string,
    height: string = 'h-[220px]',
  ) => (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, setter)}
        className="hidden"
      />
      {slot.preview ? (
        <div className="relative">
          <img
            src={slot.preview}
            alt={label}
            className={cn(height, 'w-full rounded-lg border border-border object-cover')}
          />
          <button
            onClick={() => clearSlot(setter)}
            className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            height,
            'flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5',
          )}
        >
          <div className="mb-2 text-muted-foreground/40">{icon}</div>
          <p className="text-sm text-muted-foreground">{hint}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">{subHint}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Shirt size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">一键换装</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传人物照片和服装图片，AI 智能合成换装效果
          </p>
        </div>

        {/* Model selector */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles size={15} className="text-muted-foreground" />
            模型选择
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTryonModel('aitryon')}
              className={cn(
                'cursor-pointer rounded-lg border-2 p-3 text-left transition-all',
                tryonModel === 'aitryon'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <div className="text-sm font-semibold text-foreground">基础版</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">aitryon · 速度快，效果好</div>
              <div className="mt-1.5 text-xs font-medium text-primary">8 积分</div>
            </button>
            <button
              onClick={() => setTryonModel('aitryon-plus')}
              className={cn(
                'cursor-pointer rounded-lg border-2 p-3 text-left transition-all',
                tryonModel === 'aitryon-plus'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                Plus 版
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">推荐</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">aitryon-plus · 更高质量</div>
              <div className="mt-1.5 text-xs font-medium text-primary">12 积分</div>
            </button>
          </div>
        </div>

        {/* Upload area */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <User size={15} className="text-muted-foreground" />
            人物照片
          </label>
          {renderUploadSlot(
            '',
            <User size={28} />,
            personImage,
            setPersonImage,
            personInputRef,
            '上传人物全身照',
            '清晰正面全身照效果最佳',
            'h-[260px]',
          )}
        </div>

        {/* Garment uploads */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {renderUploadSlot(
              '上装',
              <Shirt size={15} className="text-muted-foreground" />,
              topGarment,
              setTopGarment,
              topInputRef,
              '上传上装图片',
              '上衣、外套、T恤等',
              'h-[200px]',
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {renderUploadSlot(
              '下装',
              <Shirt size={15} className="text-muted-foreground" />,
              bottomGarment,
              setBottomGarment,
              bottomInputRef,
              '上传下装图片',
              '裤子、裙子等',
              'h-[200px]',
            )}
          </div>
        </div>
        <p className="-mt-3 text-[11px] text-muted-foreground">至少上传一件服装（上装或下装），也可同时上传</p>

        {/* Options */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Settings2 size={15} className="text-muted-foreground" />
            高级选项
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Resolution */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">输出分辨率</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value={-1}>原始分辨率</option>
                <option value={1024}>1024px</option>
                <option value={1280}>1280px</option>
              </select>
            </div>
            {/* Restore face */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">人脸修复</label>
              <button
                onClick={() => setRestoreFace(!restoreFace)}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all',
                  restoreFace
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-muted-foreground',
                )}
              >
                <span>{restoreFace ? '已开启' : '未开启'}</span>
                <div
                  className={cn(
                    'h-5 w-9 rounded-full transition-all',
                    restoreFace ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 bg-white transition-all',
                      restoreFace ? 'translate-x-4 border-primary' : 'translate-x-0 border-muted',
                    )}
                  />
                </div>
              </button>
            </div>
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
             <><Wand2 size={18} /> 一键换装</>}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            消耗 <span className="font-semibold text-primary">{creditCost}</span> 积分
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">换装结果</h2>
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
            </div>

            {polling && (
              <div className="mb-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: '45%' }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">AI 正在处理换装，请稍候...</p>
              </div>
            )}

            {result.status === 'COMPLETED' && result.output && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Original */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">原图</p>
                  <img src={personImage.preview || personImage.url || ''} alt="原图" className="w-full rounded-lg border border-border object-cover" />
                </div>
                {/* Result */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">换装效果</p>
                  <div className="group relative">
                    <img
                      src={result.output.url || result.output.imageUrl}
                      alt="换装结果"
                      className="w-full rounded-lg border border-border object-cover"
                    />
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={result.output.url || result.output.imageUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-white"
                      >
                        <Download size={12} /> 下载
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.status === 'FAILED' && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
                <AlertCircle size={18} className="shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">换装失败</p>
                  <p className="text-xs text-destructive/70">{result.errorMsg || '请检查图片质量后重试'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
