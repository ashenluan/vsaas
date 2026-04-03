'use client';

import { useState, useRef, useCallback } from 'react';
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
  RotateCcw,
  Square,
  Settings2,
} from 'lucide-react';

interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function ImageEditPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [editModel, setEditModel] = useState<'wan2.7-image' | 'wan2.7-image-pro'>('wan2.7-image');
  const [editSize, setEditSize] = useState('2K');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // BBox drawing state
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const creditCost = editModel === 'wan2.7-image-pro' ? 10 : 5;

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
    if (file.size > 20 * 1024 * 1024) { setError('图片不能超过20MB'); return; }
    setError('');
    setResult(null);
    setBbox(null);
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
      setNaturalSize({ width: img.width, height: img.height });

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.width = w;
        overlay.height = h;
        const ctx = overlay.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, w, h);
      }
    };
    img.src = imgSrc;
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, canvas.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, canvas.height)),
    };
  };

  const drawBboxOverlay = useCallback((box: BBox | null) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!box) return;

    const x = Math.min(box.x1, box.x2);
    const y = Math.min(box.y1, box.y2);
    const w = Math.abs(box.x2 - box.x1);
    const h = Math.abs(box.y2 - box.y1);

    // Dim outside area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(x, y, w, h);

    // Draw border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setDrawStart(pos);
    setBbox(null);
    drawBboxOverlay(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    const pos = getPos(e);
    const tempBox = { x1: drawStart.x, y1: drawStart.y, x2: pos.x, y2: pos.y };
    drawBboxOverlay(tempBox);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    setIsDrawing(false);
    const pos = getPos(e);
    const w = Math.abs(pos.x - drawStart.x);
    const h = Math.abs(pos.y - drawStart.y);
    // Ignore tiny accidental clicks
    if (w < 10 || h < 10) {
      setBbox(null);
      drawBboxOverlay(null);
      setDrawStart(null);
      return;
    }
    const finalBox = { x1: drawStart.x, y1: drawStart.y, x2: pos.x, y2: pos.y };
    setBbox(finalBox);
    drawBboxOverlay(finalBox);
    setDrawStart(null);
  };

  const clearBbox = () => {
    setBbox(null);
    drawBboxOverlay(null);
  };

  // Convert canvas bbox to original image pixel coordinates
  const toBboxList = (box: BBox): number[][][] => {
    if (!imageSize.width || !naturalSize.width) return [];
    const scaleX = naturalSize.width / imageSize.width;
    const scaleY = naturalSize.height / imageSize.height;
    const x1 = Math.round(Math.min(box.x1, box.x2) * scaleX);
    const y1 = Math.round(Math.min(box.y1, box.y2) * scaleY);
    const x2 = Math.round(Math.max(box.x1, box.x2) * scaleX);
    const y2 = Math.round(Math.max(box.y1, box.y2) * scaleY);
    return [[[x1, y1, x2, y2]]];
  };

  const handleGenerate = async () => {
    if (!sourceImage) { setError('请先上传图片'); return; }
    if (!prompt.trim()) { setError('请描述要修改的内容'); return; }

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

      const payload: any = {
        type: 'IMAGE_EDIT',
        sourceImage: imgUrl,
        prompt: prompt.trim(),
        editModel,
        editSize,
      };
      if (bbox) {
        payload.bboxList = toBboxList(bbox);
      }

      const job = await generationApi.createImage(payload);

      setResult(job);
      setActiveJobId(job.id);
      setPolling(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || '生成失败');
      setLoading(false);
    }
  };

  const sizeOptions = editModel === 'wan2.7-image-pro'
    ? [{ label: '1K', value: '1K' }, { label: '2K', value: '2K' }, { label: '4K', value: '4K' }]
    : [{ label: '1K', value: '1K' }, { label: '2K', value: '2K' }];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Paintbrush size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">图像编辑</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            上传图片 → 输入编辑指令 → 可选框选区域 → AI 智能编辑
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
              onClick={() => { setEditModel('wan2.7-image'); if (editSize === '4K') setEditSize('2K'); }}
              className={cn(
                'cursor-pointer rounded-lg border-2 p-3 text-left transition-all',
                editModel === 'wan2.7-image'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <div className="text-sm font-semibold text-foreground">标准版</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">wan2.7-image · 速度快</div>
              <div className="mt-1.5 text-xs font-medium text-primary">5 积分</div>
            </button>
            <button
              onClick={() => setEditModel('wan2.7-image-pro')}
              className={cn(
                'cursor-pointer rounded-lg border-2 p-3 text-left transition-all',
                editModel === 'wan2.7-image-pro'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                专业版
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">4K</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">wan2.7-image-pro · 高质量</div>
              <div className="mt-1.5 text-xs font-medium text-primary">10 积分</div>
            </button>
          </div>
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
              <p className="mt-1 text-xs text-muted-foreground/60">支持 JPG、PNG、WebP、BMP（最大20MB）</p>
            </div>
          ) : (
            <div>
              {/* Toolbar */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                    <Square size={12} />
                    拖拽框选编辑区域
                  </span>
                  {bbox && (
                    <span className="text-[11px] text-muted-foreground">已框选区域</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {bbox && (
                    <button
                      onClick={clearBbox}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RotateCcw size={12} /> 清除选区
                    </button>
                  )}
                  <button
                    onClick={() => { setSourceImage(null); setSourceFile(null); setSourceUrl(null); setBbox(null); }}
                    className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X size={12} /> 换图
                  </button>
                </div>
              </div>

              {/* Canvas area */}
              <div ref={containerRef} className="relative inline-block w-full">
                <img
                  src={sourceImage}
                  alt="source"
                  style={{ width: imageSize.width, height: imageSize.height }}
                  className="rounded-lg border border-border"
                />
                <canvas
                  ref={overlayRef}
                  style={
                    { width: imageSize.width, height: imageSize.height, cursor: 'crosshair' }
                  }
                  className="absolute left-0 top-0 rounded-lg"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setDrawStart(null); } }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                可在图片上拖拽框选需要编辑的区域（可选），不框选则对整图进行编辑
              </p>
            </div>
          )}
        </div>

        {/* Prompt */}
        {sourceImage && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Sparkles size={15} className="text-amber-500" />
              编辑指令
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
              rows={3}
              maxLength={2000}
              placeholder="描述编辑内容，例如：把头发颜色改为红色、给她戴上墨镜、将背景替换为海边..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <PromptPolishButton prompt={prompt} type="image" onPolished={setPrompt} />
              <span className="text-xs text-muted-foreground/60">{prompt.length}/2000</span>
            </div>
          </div>
        )}

        {/* Options */}
        {sourceImage && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Settings2 size={15} className="text-muted-foreground" />
              高级选项
            </label>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">输出分辨率</label>
              <div className="flex gap-2">
                {sizeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditSize(opt.value)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                      editSize === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
               <><Wand2 size={18} /> 开始编辑</>}
            </Button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              消耗 <span className="font-semibold text-primary">{creditCost}</span> 积分
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

        {result && (result.status === 'PROCESSING' || result.status === 'PENDING') && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {result.status === 'PROCESSING' ? '编辑中...' : '排队中...'}
              </h3>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: '45%' }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">AI 正在编辑图片，请稍候...</p>
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
