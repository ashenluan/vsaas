'use client';

import { useState, useRef } from 'react';
import { generationApi } from '@/lib/api';
import { getAdvancedCredits, useGenerationPricingCatalog } from '@/lib/generation-pricing';
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
  Type,
  Plus,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

interface TextEdit {
  id: string;
  original: string;
  replacement: string;
}

function createEdit(): TextEdit {
  return { id: Math.random().toString(36).slice(2, 10), original: '', replacement: '' };
}

export default function TextEditPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [edits, setEdits] = useState<TextEdit[]>([createEdit()]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pricingCatalog = useGenerationPricingCatalog();
  const creditCost = getAdvancedCredits(pricingCatalog, 'text-edit') ?? 5;

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
    setSourceFile(file);
    setSourceUrl(null);
    const reader = new FileReader();
    reader.onload = () => setSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSourceImage(null);
    setSourceFile(null);
    setSourceUrl(null);
    setResult(null);
  };

  const updateEdit = (id: string, field: 'original' | 'replacement', value: string) => {
    setEdits(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEdit = () => setEdits(prev => [...prev, createEdit()]);

  const removeEdit = (id: string) => {
    if (edits.length <= 1) return;
    setEdits(prev => prev.filter(e => e.id !== id));
  };

  const handleGenerate = async () => {
    if (!sourceFile && !sourceUrl) { setError('请上传图片'); return; }
    const validEdits = edits.filter(e => e.original.trim() && e.replacement.trim());
    if (validEdits.length === 0) { setError('请至少填写一组文字替换'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      let imgUrl = sourceUrl;
      if (sourceFile && !imgUrl) {
        const { url } = await uploadToOSS(sourceFile);
        imgUrl = url;
        setSourceUrl(url);
      }

      const job = await generationApi.createImage({
        type: 'TEXT_EDIT',
        sourceImage: imgUrl,
        textEdits: validEdits.map(e => ({
          original: e.original.trim(),
          replacement: e.replacement.trim(),
        })),
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
            <Type size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">无损改字</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传含文字的图片，AI 智能识别并替换指定文字，保持原图风格不变
          </p>
        </div>

        {/* Upload */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <ImageIcon size={15} className="text-muted-foreground" />
            上传原图
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {sourceImage ? (
            <div className="relative inline-block">
              <img src={sourceImage} alt="原图" className="max-h-[280px] rounded-lg border border-border object-contain" />
              <button
                onClick={clearImage}
                className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
            >
              <Upload size={28} className="mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">上传含文字的图片</p>
              <p className="mt-1 text-xs text-muted-foreground/60">海报、广告、包装等含文字图片</p>
            </div>
          )}
        </div>

        {/* Text edits */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Type size={15} className="text-muted-foreground" />
              文字替换
            </label>
            <button
              onClick={addEdit}
              className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus size={12} /> 添加
            </button>
          </div>
          <div className="space-y-3">
            {edits.map((edit, idx) => (
              <div key={edit.id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  placeholder="原文字"
                  value={edit.original}
                  onChange={(e) => updateEdit(edit.id, 'original', e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <input
                  type="text"
                  placeholder="替换为"
                  value={edit.replacement}
                  onChange={(e) => updateEdit(edit.id, 'replacement', e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
                />
                <button
                  onClick={() => removeEdit(edit.id)}
                  disabled={edits.length <= 1}
                  className="cursor-pointer rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
             polling ? <><Loader2 size={18} className="animate-spin" /> 处理中...</> :
             <><Wand2 size={18} /> 开始改字</>}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            消耗 <span className="font-semibold text-primary">{creditCost}</span> 积分
          </p>
        </div>

        {/* Result */}
        {result && result.status === 'COMPLETED' && result.output && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">改字结果</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">原图</p>
                <img src={sourceImage || ''} alt="原图" className="w-full rounded-lg border border-border" />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">改字后</p>
                <div className="group relative">
                  <img
                    src={result.output.url || result.output.imageUrl}
                    alt="结果"
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
            </div>
          </div>
        )}

        {result && result.status === 'FAILED' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
              <AlertCircle size={18} className="shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">处理失败</p>
                <p className="text-xs text-destructive/70">{result.errorMsg || '请重试'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
