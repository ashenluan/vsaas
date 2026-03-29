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
} from 'lucide-react';

interface UploadSlot {
  file: File | null;
  preview: string | null;
  url: string | null;
}

export default function VirtualTryOnPage() {
  const [personImage, setPersonImage] = useState<UploadSlot>({ file: null, preview: null, url: null });
  const [clothingImage, setClothingImage] = useState<UploadSlot>({ file: null, preview: null, url: null });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const personInputRef = useRef<HTMLInputElement>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);

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
    setter({ file: null, preview: null, url: null });
  };

  const handleGenerate = async () => {
    if (!personImage.file && !personImage.url) { setError('请上传人物照片'); return; }
    if (!clothingImage.file && !clothingImage.url) { setError('请上传服装图片'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Upload images
      let personUrl = personImage.url;
      if (personImage.file && !personUrl) {
        const { url } = await uploadToOSS(personImage.file);
        personUrl = url;
        setPersonImage(prev => ({ ...prev, url }));
      }

      let clothingUrl = clothingImage.url;
      if (clothingImage.file && !clothingUrl) {
        const { url } = await uploadToOSS(clothingImage.file);
        clothingUrl = url;
        setClothingImage(prev => ({ ...prev, url }));
      }

      const job = await generationApi.createImage({
        type: 'VIRTUAL_TRYON',
        personImage: personUrl,
        clothingImage: clothingUrl,
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
            <Shirt size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">一键换装</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传人物照片和服装图片，AI 智能合成换装效果
          </p>
        </div>

        {/* Upload area */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Person image */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <User size={15} className="text-muted-foreground" />
              人物照片
            </label>
            <input
              ref={personInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, setPersonImage)}
              className="hidden"
            />
            {personImage.preview ? (
              <div className="relative">
                <img
                  src={personImage.preview}
                  alt="人物"
                  className="h-[260px] w-full rounded-lg border border-border object-cover"
                />
                <button
                  onClick={() => clearSlot(setPersonImage)}
                  className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => personInputRef.current?.click()}
                className="flex h-[260px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
              >
                <User size={32} className="mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">上传人物全身照</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">清晰正面照效果最佳</p>
              </div>
            )}
          </div>

          {/* Clothing image */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Shirt size={15} className="text-muted-foreground" />
              服装图片
            </label>
            <input
              ref={clothingInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, setClothingImage)}
              className="hidden"
            />
            {clothingImage.preview ? (
              <div className="relative">
                <img
                  src={clothingImage.preview}
                  alt="服装"
                  className="h-[260px] w-full rounded-lg border border-border object-cover"
                />
                <button
                  onClick={() => clearSlot(setClothingImage)}
                  className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => clothingInputRef.current?.click()}
                className="flex h-[260px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
              >
                <Shirt size={32} className="mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">上传服装图片</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">纯色背景平铺图效果最佳</p>
              </div>
            )}
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
            消耗 <span className="font-semibold text-primary">10</span> 积分
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
