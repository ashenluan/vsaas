'use client';

import { useState, useRef } from 'react';
import { generationApi } from '@/lib/api';
import { getAdvancedCredits, useGenerationPricingCatalog } from '@/lib/generation-pricing';
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
  Hand,
  ShoppingBag,
  Image as ImageIcon,
  User,
} from 'lucide-react';

const COUNT_OPTIONS = [1, 2, 4];

const SCENE_PRESETS = [
  { label: '自然随拍', desc: '日常场景', prompt: '自然光线，日常场景，真实质感' },
  { label: '办公桌面', desc: '商务感', prompt: '办公桌上，简洁背景，商务风格' },
  { label: '户外场景', desc: '阳光自然', prompt: '户外自然光，清新背景，明亮色调' },
  { label: '咖啡馆', desc: '生活方式', prompt: '咖啡馆场景，温暖氛围，文艺感' },
  { label: '纯色背景', desc: '电商风', prompt: '纯白背景，专业产品摄影，柔和光线' },
  { label: '自定义', desc: '自由描述', prompt: '' },
];

export default function HandheldProductPage() {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('自然光线，日常场景，真实质感');
  const [sceneIdx, setSceneIdx] = useState(0);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const personInputRef = useRef<HTMLInputElement>(null);
  const pricingCatalog = useGenerationPricingCatalog();
  const creditCost = getAdvancedCredits(pricingCatalog, 'handheld-product') ?? 5;

  useJobUpdates(activeJobId, (data) => {
    setResult((prev: any) => ({ ...prev, ...data }));
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      setPolling(false);
      setActiveJobId(null);
    }
  });

  const handleProductFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    setProductFile(file);
    setProductUrl(null);
    const reader = new FileReader();
    reader.onload = () => setProductImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePersonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    setPersonFile(file);
    setPersonUrl(null);
    const reader = new FileReader();
    reader.onload = () => setPersonImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearProduct = () => { setProductImage(null); setProductFile(null); setProductUrl(null); };
  const clearPerson = () => { setPersonImage(null); setPersonFile(null); setPersonUrl(null); };

  const handleGenerate = async () => {
    if (!productFile && !productUrl) { setError('请上传产品图片'); return; }
    if (!prompt.trim()) { setError('请描述场景'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      let prdUrl = productUrl;
      if (productFile && !prdUrl) {
        const { url } = await uploadToOSS(productFile);
        prdUrl = url;
        setProductUrl(url);
      }

      let psnUrl = personUrl;
      if (personFile && !psnUrl) {
        const { url } = await uploadToOSS(personFile);
        psnUrl = url;
        setPersonUrl(url);
      }

      const job = await generationApi.createImage({
        type: 'HANDHELD_PRODUCT',
        productImage: prdUrl,
        personImage: psnUrl || undefined,
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
            <Hand size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">手持产品</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传产品图，AI 自动生成真人手持产品的场景图片
          </p>
        </div>

        {/* Upload area */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Product */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ShoppingBag size={15} className="text-muted-foreground" />
              产品图片 <span className="text-destructive">*</span>
            </label>
            <input ref={productInputRef} type="file" accept="image/*" onChange={handleProductFile} className="hidden" />
            {productImage ? (
              <div className="relative">
                <img src={productImage} alt="产品" className="h-[200px] w-full rounded-lg border border-border object-cover" />
                <button onClick={clearProduct} className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => productInputRef.current?.click()}
                className="flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
              >
                <ShoppingBag size={28} className="mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">上传产品图</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">白底/透明底效果最佳</p>
              </div>
            )}
          </div>

          {/* Person (optional) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <User size={15} className="text-muted-foreground" />
              人物照片 <span className="text-xs text-muted-foreground">(可选)</span>
            </label>
            <input ref={personInputRef} type="file" accept="image/*" onChange={handlePersonFile} className="hidden" />
            {personImage ? (
              <div className="relative">
                <img src={personImage} alt="人物" className="h-[200px] w-full rounded-lg border border-border object-cover" />
                <button onClick={clearPerson} className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-foreground p-1 text-card shadow-md hover:bg-foreground/80">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => personInputRef.current?.click()}
                className="flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
              >
                <User size={28} className="mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">上传指定人物</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">不传则使用AI生成人物</p>
              </div>
            )}
          </div>
        </div>

        {/* Scene presets */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-foreground">场景风格</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {SCENE_PRESETS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => {
                  setSceneIdx(i);
                  if (s.prompt) setPrompt(s.prompt);
                }}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-2 text-left transition-all',
                  sceneIdx === i
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-card text-foreground hover:border-primary/30'
                )}
              >
                <div className={cn('text-xs font-medium', sceneIdx === i && 'text-primary')}>{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.desc}</div>
              </button>
            ))}
          </div>
          <textarea
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
            rows={3}
            maxLength={500}
            placeholder="描述手持场景的细节..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <PromptPolishButton prompt={prompt} type="image" onPolished={setPrompt} />
            <span className="text-xs text-muted-foreground/60">{prompt.length}/500</span>
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
             <><Wand2 size={18} /> 生成手持图</>}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            消耗 <span className="font-semibold text-primary">{creditCost * count}</span> 积分
          </p>
        </div>

        {/* Result */}
        {result && result.status === 'COMPLETED' && result.output && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">生成结果</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(result.output.images || [result.output]).map((img: any, i: number) => {
                const url = img.url || img.imageUrl || img;
                if (!url || typeof url !== 'string') return null;
                return (
                  <div key={i} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`结果 ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
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
