'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { generationApi } from '@/lib/api';
import { useJobUpdates } from '@/components/ws-provider';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PromptPolishButton } from '@/components/prompt-polish-button';
import {
  Plus,
  Trash2,
  GripVertical,
  Upload,
  X,
  Sparkles,
  Film,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Play,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Copy,
  ClipboardPaste,
  Camera,
} from 'lucide-react';

interface Scene {
  id: string;
  prompt: string;
  referenceImage: string | null;
  referenceFile: File | null;
  referencePreview: string | null;
  duration: number;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  jobId: string | null;
  output: any | null;
  errorMsg: string | null;
}

const DURATIONS = [3, 5, 8, 10];

const RESOLUTIONS = [
  { label: '720p', value: '720p', desc: '标准' },
  { label: '1080p', value: '1080p', desc: '高清' },
];

const ASPECT_RATIOS = [
  { label: '9:16 竖屏', desc: '抖音/快手' },
  { label: '16:9 横屏', desc: '传统广告' },
];

function createScene(): Scene {
  return {
    id: Math.random().toString(36).slice(2, 10),
    prompt: '',
    referenceImage: null,
    referenceFile: null,
    referencePreview: null,
    duration: 5,
    status: 'idle',
    jobId: null,
    output: null,
    errorMsg: null,
  };
}

export default function StoryboardPage() {
  const [scenes, setScenes] = useState<Scene[]>([createScene()]);
  const [resolution, setResolution] = useState('720p');
  const [ratioIdx, setRatioIdx] = useState(0);
  const [providerId, setProviderId] = useState('');
  const [providers, setProviders] = useState<{ id: string; name: string; creditCost?: number }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    generationApi.getProviders().then((data: any) => {
      const vids = data.video || [];
      setProviders(vids);
      if (vids.length > 0) setProviderId(vids[0].id);
    }).catch(() => {});
  }, []);

  // Listen to job updates for all active scenes
  const activeJobIds = scenes.filter(s => s.jobId && s.status === 'generating').map(s => s.jobId!);

  useEffect(() => {
    // Polling for active jobs
    if (activeJobIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const jobId of activeJobIds) {
        try {
          const job = await generationApi.get(jobId);
          setScenes(prev => prev.map(s => {
            if (s.jobId !== jobId) return s;
            if (job.status === 'COMPLETED') {
              return { ...s, status: 'completed' as const, output: job.output };
            }
            if (job.status === 'FAILED') {
              return { ...s, status: 'failed' as const, errorMsg: job.errorMsg || '生成失败' };
            }
            return s;
          }));
        } catch {}
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJobIds.join(',')]);

  // Check if all scenes are done
  useEffect(() => {
    if (!generating) return;
    const allDone = scenes.every(s => s.status !== 'generating');
    if (allDone) setGenerating(false);
  }, [scenes, generating]);

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addScene = () => {
    setScenes(prev => [...prev, createScene()]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 1) return;
    setScenes(prev => prev.filter(s => s.id !== id));
  };

  const duplicateScene = (id: string) => {
    const source = scenes.find(s => s.id === id);
    if (!source) return;
    const newScene = createScene();
    newScene.prompt = source.prompt;
    newScene.duration = source.duration;
    newScene.referencePreview = source.referencePreview;
    newScene.referenceImage = source.referenceImage;
    const idx = scenes.findIndex(s => s.id === id);
    setScenes(prev => [
      ...prev.slice(0, idx + 1),
      newScene,
      ...prev.slice(idx + 1),
    ]);
  };

  const moveScene = (id: string, dir: 'up' | 'down') => {
    const idx = scenes.findIndex(s => s.id === id);
    if (dir === 'up' && idx <= 0) return;
    if (dir === 'down' && idx >= scenes.length - 1) return;
    const newScenes = [...scenes];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    [newScenes[idx], newScenes[swapIdx]] = [newScenes[swapIdx], newScenes[idx]];
    setScenes(newScenes);
  };

  const handleFileChange = (sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('图片不能超过10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => updateScene(sceneId, {
      referencePreview: reader.result as string,
      referenceFile: file,
      referenceImage: null,
    });
    reader.readAsDataURL(file);
  };

  const clearReference = (sceneId: string) => {
    updateScene(sceneId, {
      referenceImage: null,
      referenceFile: null,
      referencePreview: null,
    });
  };

  const handleGenerate = async () => {
    const emptyScenes = scenes.filter(s => !s.prompt.trim());
    if (emptyScenes.length > 0) {
      setError(`第 ${scenes.indexOf(emptyScenes[0]) + 1} 个分镜缺少描述`);
      return;
    }
    setError('');
    setGenerating(true);

    // Upload reference images and submit jobs for each scene
    for (const scene of scenes) {
      try {
        let imgUrl = scene.referenceImage;
        if (scene.referenceFile && !imgUrl) {
          const { url } = await uploadToOSS(scene.referenceFile);
          imgUrl = url;
          updateScene(scene.id, { referenceImage: url });
        }

        const job = await generationApi.createVideo({
          prompt: scene.prompt.trim(),
          providerId,
          duration: scene.duration,
          resolution,
          referenceImage: imgUrl || undefined,
        });

        updateScene(scene.id, {
          status: 'generating',
          jobId: job.id,
          output: null,
          errorMsg: null,
        });
      } catch (err: any) {
        updateScene(scene.id, {
          status: 'failed',
          errorMsg: err.message || '提交失败',
        });
      }
    }
  };

  const completedCount = scenes.filter(s => s.status === 'completed').length;
  const generatingCount = scenes.filter(s => s.status === 'generating').length;
  const failedCount = scenes.filter(s => s.status === 'failed').length;
  const estimatedCost = (providers.find(p => p.id === providerId)?.creditCost || 20) * scenes.length;
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Film size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">一键成片</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            分镜脚本模式 · 多场景自动生成 · 智能拼接成片
          </p>
        </div>

        {/* Global settings */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Ratio */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">视频比例</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRatioIdx(i)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-2 text-center transition-all flex-1',
                      ratioIdx === i
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary/30'
                    )}
                  >
                    <div className={cn('text-xs font-medium', ratioIdx === i && 'text-primary')}>{r.label}</div>
                    <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">分辨率</label>
              <div className="flex gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setResolution(r.value)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-2 transition-all flex-1',
                      resolution === r.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <span className={cn('text-xs font-medium', resolution === r.value ? 'text-primary' : 'text-foreground')}>{r.label}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">生成模型</label>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProviderId(p.id)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-2 text-left transition-all flex-1 min-w-[80px]',
                      providerId === p.id
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary/30'
                    )}
                  >
                    <div className={cn('text-xs font-medium', providerId === p.id && 'text-primary')}>{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scenes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">分镜列表 ({scenes.length} 个场景 · 约 {totalDuration} 秒)</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={addScene}
              disabled={generating}
              className="cursor-pointer gap-1 text-xs"
            >
              <Plus size={14} /> 添加分镜
            </Button>
          </div>

          {scenes.map((scene, idx) => (
            <div
              key={scene.id}
              className={cn(
                'rounded-xl border bg-card p-4 shadow-sm transition-all',
                scene.status === 'completed' ? 'border-emerald-200 bg-emerald-50/30' :
                scene.status === 'failed' ? 'border-destructive/30 bg-destructive/5' :
                scene.status === 'generating' ? 'border-primary/30 bg-primary/5' :
                'border-border'
              )}
            >
              {/* Scene header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">分镜 {idx + 1}</span>
                  {scene.status === 'generating' && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Loader2 size={12} className="animate-spin" /> 生成中
                    </span>
                  )}
                  {scene.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 size={12} /> 已完成
                    </span>
                  )}
                  {scene.status === 'failed' && (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle size={12} /> {scene.errorMsg || '失败'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveScene(scene.id, 'up')}
                    disabled={idx === 0 || generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveScene(scene.id, 'down')}
                    disabled={idx === scenes.length - 1 || generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => duplicateScene(scene.id)}
                    disabled={generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    title="复制分镜"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => removeScene(scene.id)}
                    disabled={scenes.length <= 1 || generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_160px]">
                {/* Prompt + controls */}
                <div className="space-y-3">
                  <textarea
                    className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
                    rows={3}
                    maxLength={1000}
                    placeholder={`场景 ${idx + 1} 描述：详细描述画面内容、动作、镜头运动...`}
                    value={scene.prompt}
                    onChange={(e) => updateScene(scene.id, { prompt: e.target.value })}
                    disabled={generating}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PromptPolishButton
                        prompt={scene.prompt}
                        type="video"
                        onPolished={(p) => updateScene(scene.id, { prompt: p })}
                      />
                      {/* Duration */}
                      <div className="flex items-center gap-1">
                        {DURATIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => updateScene(scene.id, { duration: d })}
                            disabled={generating}
                            className={cn(
                              'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                              scene.duration === d
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/30'
                            )}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground/60">{scene.prompt.length}/1000</span>
                  </div>
                </div>

                {/* Reference image */}
                <div>
                  <input
                    ref={(el) => { fileInputRefs.current[scene.id] = el; }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(scene.id, e)}
                    className="hidden"
                  />
                  {scene.referencePreview ? (
                    <div className="relative">
                      <img
                        src={scene.referencePreview}
                        alt="参考图"
                        className="h-[100px] w-full rounded-lg border border-border object-cover"
                      />
                      <button
                        onClick={() => clearReference(scene.id)}
                        disabled={generating}
                        className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-foreground p-0.5 text-card shadow-md hover:bg-foreground/80"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !generating && fileInputRefs.current[scene.id]?.click()}
                      className="flex h-[100px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
                    >
                      <Camera size={18} className="mb-1 text-muted-foreground/40" />
                      <p className="text-[10px] text-muted-foreground/60">参考图</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed video preview */}
              {scene.status === 'completed' && scene.output && (scene.output.url || scene.output.videoUrl) && (
                <div className="mt-3 overflow-hidden rounded-lg border border-emerald-200">
                  <video
                    src={scene.output.url || scene.output.videoUrl}
                    controls
                    className="w-full max-h-[200px]"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add scene button (bottom) */}
          <button
            onClick={addScene}
            disabled={generating}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 py-4 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} /> 添加新分镜
          </button>
        </div>

        {/* Generate */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {generating && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>进度：{completedCount + failedCount}/{scenes.length} 个分镜</span>
                <span>
                  {generatingCount > 0 && <><Loader2 size={12} className="inline animate-spin mr-1" />{generatingCount} 生成中</>}
                  {completedCount > 0 && <span className="ml-2 text-emerald-600">{completedCount} 已完成</span>}
                  {failedCount > 0 && <span className="ml-2 text-destructive">{failedCount} 失败</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${((completedCount + failedCount) / scenes.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {generating ? (
              <><Loader2 size={18} className="animate-spin" /> 生成中 ({completedCount}/{scenes.length})...</>
            ) : (
              <><Wand2 size={18} /> 一键生成 {scenes.length} 个分镜</>
            )}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            预计消耗 <span className="font-semibold text-primary">{estimatedCost}</span> 积分
            <span className="text-muted-foreground/60"> · {scenes.length} 个分镜 · 约 {totalDuration} 秒</span>
          </p>
        </div>

        {/* Results summary */}
        {completedCount > 0 && !generating && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">
                成片完成 — {completedCount}/{scenes.length} 个分镜生成成功
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {scenes.filter(s => s.status === 'completed' && s.output).map((scene, i) => {
                const videoUrl = scene.output?.url || scene.output?.videoUrl;
                if (!videoUrl) return null;
                return (
                  <div key={scene.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <video src={videoUrl} className="aspect-video w-full object-cover" muted
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={videoUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-white"
                      >
                        <Download size={12} /> 下载
                      </a>
                    </div>
                    <div className="absolute left-1.5 top-1.5">
                      <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        分镜 {scenes.indexOf(scene) + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
