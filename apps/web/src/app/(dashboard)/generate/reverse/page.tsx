'use client';

import { useState, useRef } from 'react';
import { aiApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Upload,
  X,
  Loader2,
  Wand2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Video,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  FileVideo,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const ACCEPT_TYPES = {
  video: 'video/mp4,video/webm,video/quicktime',
  image: 'image/jpeg,image/png,image/webp',
};

export default function VideoReversePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'video' | 'image'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const maxSize = mode === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (f.size > maxSize) {
      setError(mode === 'video' ? '视频不能超过100MB' : '图片不能超过10MB');
      return;
    }
    setError('');
    setResult(null);
    setFile(f);

    if (mode === 'image' || f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(f));
    }
  };

  const clearFile = () => {
    if (preview && file?.type.startsWith('video/')) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReverse = async () => {
    if (!file) { setError('请先上传文件'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Upload file first
      const { url } = await uploadToOSS(file);

      // Call AI reverse API
      const data = await aiApi.reversePrompt(url, mode);
      setResult(data.prompt);
    } catch (err: any) {
      setError(err.message || '反推失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUsePrompt = (target: 'image' | 'video') => {
    if (!result) return;
    const path = target === 'video' ? '/generate/grok-video' : '/generate/grok-image';
    router.push(`${path}?prompt=${encodeURIComponent(result)}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-amber-500" />
            <h1 className="text-xl font-bold text-foreground">视频/图片反推</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传视频或图片，AI 自动分析生成对应的提示词描述
          </p>
        </div>

        {/* Mode toggle */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-foreground">选择类型</label>
          <div className="flex gap-2">
            {(['image', 'video'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); clearFile(); }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-3 transition-all flex-1',
                  mode === m
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-card text-foreground hover:border-primary/30'
                )}
              >
                {m === 'image' ? <ImageIcon size={18} /> : <Video size={18} />}
                <div className="text-left">
                  <div className={cn('text-sm font-medium', mode === m && 'text-primary')}>
                    {m === 'image' ? '图片反推' : '视频反推'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {m === 'image' ? '上传图片生成提示词' : '上传视频生成提示词'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-foreground">
            上传{mode === 'image' ? '图片' : '视频'}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_TYPES[mode]}
            onChange={handleFileChange}
            className="hidden"
          />
          {preview ? (
            <div className="relative inline-block w-full">
              {mode === 'image' || file?.type.startsWith('image/') ? (
                <img
                  src={preview}
                  alt="预览"
                  className="max-h-[300px] w-full rounded-lg border border-border object-contain bg-muted"
                />
              ) : (
                <video
                  src={preview}
                  controls
                  className="max-h-[300px] w-full rounded-lg border border-border"
                />
              )}
              <button
                onClick={clearFile}
                className="absolute right-2 top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
            >
              <Upload size={32} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                选择{mode === 'image' ? '图片' : '视频'}文件
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {mode === 'image' ? '支持 JPG、PNG、WebP，最大 10MB' : '支持 MP4、WebM、MOV，最大 100MB'}
              </p>
            </div>
          )}
        </div>

        {/* Reverse button */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <Button
            onClick={handleReverse}
            disabled={loading || !file}
            className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> AI 分析中...</>
            ) : (
              <><Wand2 size={18} /> 开始反推提示词</>
            )}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            消耗 <span className="font-semibold text-primary">5</span> 积分
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">反推结果</h3>
              </div>
              <button
                onClick={handleCopy}
                className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Copy size={12} />
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div className="rounded-lg border border-border bg-white p-4 text-sm leading-relaxed text-foreground">
              {result}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUsePrompt('image')}
                className="cursor-pointer gap-1 text-xs"
              >
                <ImageIcon size={14} /> 用于生图 <ArrowRight size={12} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUsePrompt('video')}
                className="cursor-pointer gap-1 text-xs"
              >
                <Video size={14} /> 用于生视频 <ArrowRight size={12} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
