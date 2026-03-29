'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  Paintbrush,
  Eraser,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';

const BRUSH_SIZES = [
  { label: 'S', value: 10 },
  { label: 'M', value: 25 },
  { label: 'L', value: 50 },
  { label: 'XL', value: 80 },
];

export default function InpaintPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(25);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

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
    reader.onload = () => {
      setSourceImage(reader.result as string);
      initCanvas(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const initCanvas = (imgSrc: string) => {
    const img = new window.Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;
      const maxW = container.clientWidth;
      const ratio = Math.min(maxW / img.width, 500 / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      setImageSize({ width: w, height: h });

      // Source canvas
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
      }

      // Mask canvas (transparent overlay)
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = w;
        maskCanvas.height = h;
        const ctx = maskCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, w, h);
      }

      setCanvasReady(true);
    };
    img.src = imgSrc;
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const stopDraw = () => setIsDrawing(false);

  const getMaskDataUrl = (): string | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;
    // Create a black/white mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    // Fill with black (non-edit area)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    // Get mask pixels and convert blue areas to white
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 0) {
        outData.data[i] = 255;
        outData.data[i + 1] = 255;
        outData.data[i + 2] = 255;
        outData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(outData, 0, 0);
    return tempCanvas.toDataURL('image/png');
  };

  const handleGenerate = async () => {
    if (!sourceImage) { setError('请先上传图片'); return; }
    if (!prompt.trim()) { setError('请描述要修改的内容'); return; }

    const maskDataUrl = getMaskDataUrl();

    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Upload source image
      let imgUrl = sourceUrl;
      if (sourceFile && !imgUrl) {
        const { url } = await uploadToOSS(sourceFile);
        imgUrl = url;
        setSourceUrl(url);
      }

      // Upload mask as blob
      let maskUrl: string | undefined;
      if (maskDataUrl) {
        const maskBlob = await (await fetch(maskDataUrl)).blob();
        const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
        const { url } = await uploadToOSS(maskFile);
        maskUrl = url;
      }

      const job = await generationApi.createImage({
        type: 'INPAINT',
        sourceImage: imgUrl,
        maskImage: maskUrl,
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
    <div className="mx-auto w-full max-w-4xl">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Paintbrush size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">局部编辑</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传图片 → 涂抹选区 → 输入描述 → AI 局部重绘
          </p>
        </div>

        {/* Upload + Canvas */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!sourceImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[300px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
            >
              <Upload size={32} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">上传需要编辑的图片</p>
              <p className="mt-1 text-xs text-muted-foreground/60">支持 JPG、PNG、WebP</p>
            </div>
          ) : (
            <div>
              {/* Toolbar */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-foreground">画笔大小：</span>
                  <div className="flex gap-1">
                    {BRUSH_SIZES.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setBrushSize(b.value)}
                        className={cn(
                          'cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                          brushSize === b.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        )}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearMask}
                    className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw size={12} /> 清除选区
                  </button>
                  <button
                    onClick={() => { setSourceImage(null); setCanvasReady(false); setSourceFile(null); setSourceUrl(null); }}
                    className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X size={12} /> 换图
                  </button>
                </div>
              </div>

              {/* Canvas area */}
              <div ref={containerRef} className="relative inline-block w-full">
                <canvas
                  ref={canvasRef}
                  style={{ width: imageSize.width, height: imageSize.height }}
                  className="rounded-lg border border-border"
                />
                <canvas
                  ref={maskCanvasRef}
                  style={{
                    width: imageSize.width,
                    height: imageSize.height,
                    cursor: 'crosshair',
                  }}
                  className="absolute left-0 top-0 rounded-lg"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                在图片上涂抹需要修改的区域（蓝色高亮），未涂抹则对整图生效
              </p>
            </div>
          )}
        </div>

        {/* Prompt */}
        {sourceImage && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Sparkles size={15} className="text-amber-500" />
              描述修改内容
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
              rows={3}
              maxLength={1000}
              placeholder="描述希望在选区内生成的内容，例如：将背景换成海边沙滩..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <PromptPolishButton prompt={prompt} type="image" onPolished={setPrompt} />
              <span className="text-xs text-muted-foreground/60">{prompt.length}/1000</span>
            </div>
          </div>
        )}

        {/* Generate */}
        {sourceImage && (
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
               <><Wand2 size={18} /> 开始局部重绘</>}
            </Button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              消耗 <span className="font-semibold text-primary">5</span> 积分
            </p>
          </div>
        )}

        {/* Result */}
        {result && result.status === 'COMPLETED' && result.output && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">编辑结果</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">原图</p>
                <img src={sourceImage || ''} alt="原图" className="w-full rounded-lg border border-border" />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">编辑后</p>
                <div className="group relative">
                  <img
                    src={result.output.url || result.output.imageUrl}
                    alt="结果"
                    className="w-full rounded-lg border border-border"
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
          </div>
        )}

        {result && result.status === 'FAILED' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
              <AlertCircle size={18} className="shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">编辑失败</p>
                <p className="text-xs text-destructive/70">{result.errorMsg || '请重试'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
