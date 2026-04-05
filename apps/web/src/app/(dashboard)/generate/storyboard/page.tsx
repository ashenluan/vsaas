'use client';

import { useState, useRef, useEffect } from 'react';
import { generationApi } from '@/lib/api';
import { getAdvancedCredits, useGenerationPricingCatalog } from '@/lib/generation-pricing';
import { uploadToOSS } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PromptPolishButton } from '@/components/prompt-polish-button';
import {
  Plus,
  Trash2,
  Upload,
  X,
  Film,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Play,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Copy,
  Camera,
  Video,
  Layers,
  Music,
} from 'lucide-react';

/* ---------- types ---------- */

interface MediaRef {
  type: 'reference_image' | 'reference_video' | 'first_frame';
  file: File | null;
  preview: string | null; // data-url or oss url
  url: string | null;     // uploaded oss url
}

interface Scene {
  id: string;
  prompt: string;
  media: MediaRef[];
  duration: number;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  jobId: string | null;
  output: any | null;
  errorMsg: string | null;
}

type ComposeStatus = 'idle' | 'composing' | 'completed' | 'failed';

/* ---------- constants ---------- */

const DURATIONS = [3, 5, 8, 10];

const RESOLUTIONS = [
  { label: '720p', value: '720p', desc: '标准' },
  { label: '1080p', value: '1080p', desc: '高清' },
];

const ASPECT_RATIOS = [
  { label: '9:16 竖屏', value: '9:16', desc: '抖音/快手', width: 720, height: 1280 },
  { label: '16:9 横屏', value: '16:9', desc: '传统广告', width: 1280, height: 720 },
];

const TRANSITIONS = [
  { label: '无', value: '' },
  { label: '淡入淡出', value: 'fade' },
  { label: '向左滑动', value: 'directional_left' },
  { label: '向右滑动', value: 'directional_right' },
  { label: '向上滑动', value: 'directional_up' },
  { label: '向下滑动', value: 'directional_down' },
  { label: '缩放', value: 'Zoom' },
  { label: '旋转', value: 'SimpleRotate' },
  { label: '百叶窗', value: 'WindowBlinds' },
  { label: '涟漪', value: 'ripple' },
];

const MEDIA_TYPE_LABELS: Record<string, string> = {
  reference_image: '参考图',
  reference_video: '参考视频',
  first_frame: '首帧图',
};

/* ---------- helpers ---------- */

function createScene(): Scene {
  return {
    id: Math.random().toString(36).slice(2, 10),
    prompt: '',
    media: [],
    duration: 5,
    status: 'idle',
    jobId: null,
    output: null,
    errorMsg: null,
  };
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/');
}

/* ---------- component ---------- */

export default function StoryboardPage() {
  const [scenes, setScenes] = useState<Scene[]>([createScene()]);
  const [resolution, setResolution] = useState('720p');
  const [ratioIdx, setRatioIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Transition settings
  const [transition, setTransition] = useState('fade');
  const [transitionDuration, setTransitionDuration] = useState(1);

  // Composition state
  const [composeStatus, setComposeStatus] = useState<ComposeStatus>('idle');
  const [composeJobId, setComposeJobId] = useState<string | null>(null);
  const [composeResult, setComposeResult] = useState<any>(null);
  const [composeError, setComposeError] = useState('');
  const pricingCatalog = useGenerationPricingCatalog();
  const composeCreditCost = getAdvancedCredits(pricingCatalog, 'storyboard-compose') ?? 10;

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Poll active scene generation jobs
  const activeJobIds = scenes.filter(s => s.jobId && s.status === 'generating').map(s => s.jobId!);

  useEffect(() => {
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

  // Stop generating flag when all scenes finish
  useEffect(() => {
    if (!generating) return;
    const allDone = scenes.every(s => s.status !== 'generating');
    if (allDone) setGenerating(false);
  }, [scenes, generating]);

  // Poll composition job
  useEffect(() => {
    if (composeStatus !== 'composing' || !composeJobId) return;
    const interval = setInterval(async () => {
      try {
        const job = await generationApi.get(composeJobId);
        if (job.status === 'COMPLETED') {
          setComposeStatus('completed');
          setComposeResult(job.output);
        } else if (job.status === 'FAILED') {
          setComposeStatus('failed');
          setComposeError(job.errorMsg || '合成失败');
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [composeStatus, composeJobId]);

  /* ---- scene mutations ---- */

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addScene = () => setScenes(prev => [...prev, createScene()]);

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
    newScene.media = source.media.map(m => ({ ...m }));
    const idx = scenes.findIndex(s => s.id === id);
    setScenes(prev => [...prev.slice(0, idx + 1), newScene, ...prev.slice(idx + 1)]);
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

  /* ---- media management ---- */

  const addMedia = (sceneId: string, type: MediaRef['type'], file: File) => {
    const sizeLimit = isVideoFile(file) ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const label = isVideoFile(file) ? '视频不能超过100MB' : '图片不能超过10MB';
    if (file.size > sizeLimit) { setError(label); return; }
    setError('');

    if (isVideoFile(file)) {
      const url = URL.createObjectURL(file);
      setScenes(prev => prev.map(s => {
        if (s.id !== sceneId) return s;
        return { ...s, media: [...s.media, { type, file, preview: url, url: null }] };
      }));
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setScenes(prev => prev.map(s => {
          if (s.id !== sceneId) return s;
          return { ...s, media: [...s.media, { type, file, preview: reader.result as string, url: null }] };
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = (sceneId: string, mediaIdx: number) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      const removed = s.media[mediaIdx];
      if (removed?.preview && removed.file?.type.startsWith('video/')) {
        URL.revokeObjectURL(removed.preview);
      }
      return { ...s, media: s.media.filter((_, i) => i !== mediaIdx) };
    }));
  };

  const handleFileChange = (sceneId: string, mediaType: MediaRef['type'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addMedia(sceneId, mediaType, file);
    e.target.value = '';
  };

  /* ---- generation ---- */

  const handleGenerate = async () => {
    const emptyScenes = scenes.filter(s => !s.prompt.trim());
    if (emptyScenes.length > 0) {
      setError(`第 ${scenes.indexOf(emptyScenes[0]) + 1} 个分镜缺少描述`);
      return;
    }
    setError('');
    setGenerating(true);
    // Reset composition state
    setComposeStatus('idle');
    setComposeResult(null);
    setComposeError('');

    for (const scene of scenes) {
      try {
        // Upload media files
        const uploadedMedia: { type: string; url: string }[] = [];
        for (const m of scene.media) {
          let ossUrl = m.url;
          if (m.file && !ossUrl) {
            const { url } = await uploadToOSS(m.file);
            ossUrl = url;
            // Update the media entry with the uploaded URL
            setScenes(prev => prev.map(s => {
              if (s.id !== scene.id) return s;
              return {
                ...s,
                media: s.media.map(mm => mm === m ? { ...mm, url: ossUrl } : mm),
              };
            }));
          }
          if (ossUrl) {
            uploadedMedia.push({ type: m.type, url: ossUrl });
          }
        }

        const ratio = ASPECT_RATIOS[ratioIdx].value;

        const job = await generationApi.createVideo({
          prompt: scene.prompt.trim(),
          providerId: 'aliyun-r2v',
          duration: scene.duration,
          resolution,
          ratio,
          promptExtend: true,
          ...(uploadedMedia.length > 0 ? { media: uploadedMedia } : {}),
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

  /* ---- composition ---- */

  const handleCompose = async () => {
    const completedScenes = scenes.filter(s => s.status === 'completed' && s.output);
    if (completedScenes.length < 2) {
      setComposeError('至少需要 2 个已完成的分镜才能合成');
      return;
    }

    const videos = completedScenes.map(s => ({
      url: s.output.url || s.output.videoUrl,
      duration: s.duration,
    })).filter(v => v.url);

    if (videos.length < 2) {
      setComposeError('可用视频不足 2 个');
      return;
    }

    const ar = ASPECT_RATIOS[ratioIdx];
    const w = resolution === '1080p' ? (ar.value === '16:9' ? 1920 : 1080) : ar.width;
    const h = resolution === '1080p' ? (ar.value === '16:9' ? 1080 : 1920) : ar.height;

    setComposeStatus('composing');
    setComposeError('');
    setComposeResult(null);

    try {
      const job = await generationApi.composeStoryboard({
        videos,
        transition: transition || undefined,
        transitionDuration: transition ? transitionDuration : undefined,
        width: w,
        height: h,
      });
      setComposeJobId(job.id);
    } catch (err: any) {
      setComposeStatus('failed');
      setComposeError(err.message || '合成提交失败');
    }
  };

  /* ---- derived ---- */

  const completedCount = scenes.filter(s => s.status === 'completed').length;
  const generatingCount = scenes.filter(s => s.status === 'generating').length;
  const failedCount = scenes.filter(s => s.status === 'failed').length;
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const canCompose = completedCount >= 2 && !generating;

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
            参考生视频 · 多场景分镜生成 · 转场特效 · 智能合成
          </p>
        </div>

        {/* Global settings */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* Transition */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                <Layers size={13} className="mr-1 inline" />转场效果
              </label>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {TRANSITIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Transition duration */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">转场时长</label>
              <div className="flex items-center gap-2">
                {[0.5, 1, 1.5, 2].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTransitionDuration(d)}
                    disabled={!transition}
                    className={cn(
                      'cursor-pointer rounded-lg border px-2.5 py-2 text-xs font-medium transition-all flex-1',
                      transitionDuration === d && transition
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/30',
                      !transition && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {d}s
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
                  <button onClick={() => moveScene(scene.id, 'up')} disabled={idx === 0 || generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveScene(scene.id, 'down')} disabled={idx === scenes.length - 1 || generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30">
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => duplicateScene(scene.id)} disabled={generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30" title="复制分镜">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => removeScene(scene.id)} disabled={scenes.length <= 1 || generating}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Prompt + duration */}
              <div className="space-y-3">
                <textarea
                  className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
                  rows={3}
                  maxLength={5000}
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
                  <span className="text-[11px] text-muted-foreground/60">{scene.prompt.length}/5000</span>
                </div>
              </div>

              {/* Media references */}
              <div className="mt-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">参考素材（可选）</div>
                <div className="flex flex-wrap gap-2">
                  {/* Existing media thumbnails */}
                  {scene.media.map((m, mi) => (
                    <div key={mi} className="relative group">
                      {m.type === 'reference_video' ? (
                        <video src={m.preview || ''} className="h-[80px] w-[80px] rounded-lg border border-border object-cover" muted />
                      ) : (
                        <img src={m.preview || ''} alt="" className="h-[80px] w-[80px] rounded-lg border border-border object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(scene.id, mi)}
                        disabled={generating}
                        className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-foreground p-0.5 text-card shadow-md hover:bg-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 px-1 py-0.5 text-center text-[9px] text-white">
                        {MEDIA_TYPE_LABELS[m.type]}
                      </div>
                    </div>
                  ))}

                  {/* Add media buttons */}
                  {!generating && (
                    <div className="flex gap-1.5">
                      {/* Reference image */}
                      <input
                        ref={(el) => { fileInputRefs.current[`${scene.id}_ref_img`] = el; }}
                        type="file" accept="image/*"
                        onChange={(e) => handleFileChange(scene.id, 'reference_image', e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${scene.id}_ref_img`]?.click()}
                        className="flex h-[80px] w-[70px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
                      >
                        <ImageIcon size={16} className="mb-1 text-muted-foreground/50" />
                        <p className="text-[9px] text-muted-foreground/60">参考图</p>
                      </button>

                      {/* Reference video */}
                      <input
                        ref={(el) => { fileInputRefs.current[`${scene.id}_ref_vid`] = el; }}
                        type="file" accept="video/*"
                        onChange={(e) => handleFileChange(scene.id, 'reference_video', e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${scene.id}_ref_vid`]?.click()}
                        className="flex h-[80px] w-[70px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
                      >
                        <Video size={16} className="mb-1 text-muted-foreground/50" />
                        <p className="text-[9px] text-muted-foreground/60">参考视频</p>
                      </button>

                      {/* First frame */}
                      <input
                        ref={(el) => { fileInputRefs.current[`${scene.id}_first`] = el; }}
                        type="file" accept="image/*"
                        onChange={(e) => handleFileChange(scene.id, 'first_frame', e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${scene.id}_first`]?.click()}
                        className="flex h-[80px] w-[70px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5"
                      >
                        <Camera size={16} className="mb-1 text-muted-foreground/50" />
                        <p className="text-[9px] text-muted-foreground/60">首帧图</p>
                      </button>
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

        {/* Generate scenes */}
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
              <><Wand2 size={18} /> 生成 {scenes.length} 个分镜视频</>
            )}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            使用 <span className="font-semibold text-primary">万相参考生视频</span> 模型
            <span className="text-muted-foreground/60"> · {scenes.length} 个分镜 · 约 {totalDuration} 秒</span>
          </p>
        </div>

        {/* Compose section — appears after scenes are done */}
        {canCompose && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Film size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                一键成片 — {completedCount} 个分镜已就绪
              </h3>
            </div>

            {/* Scene video thumbnails */}
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {scenes.filter(s => s.status === 'completed' && s.output).map((scene, i) => {
                const videoUrl = scene.output?.url || scene.output?.videoUrl;
                if (!videoUrl) return null;
                return (
                  <div key={scene.id} className="relative overflow-hidden rounded-lg border border-border">
                    <video src={videoUrl} className="aspect-video w-full object-cover" muted
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute left-1 top-1">
                      <span className="rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">
                        {scenes.indexOf(scene) + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>转场：{TRANSITIONS.find(t => t.value === transition)?.label || '无'}</span>
              {transition && <span>时长：{transitionDuration}s</span>}
              <span>分辨率：{resolution}</span>
              <span>比例：{ASPECT_RATIOS[ratioIdx].value}</span>
            </div>

            {composeError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle size={14} /> {composeError}
              </div>
            )}

            {composeStatus === 'composing' && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">
                <Loader2 size={14} className="animate-spin" /> 正在合成视频，请稍候...
              </div>
            )}

            <Button
              onClick={handleCompose}
              disabled={composeStatus === 'composing'}
              className="h-11 w-full cursor-pointer gap-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {composeStatus === 'composing' ? (
                <><Loader2 size={16} className="animate-spin" /> 合成中...</>
              ) : (
                <><Film size={16} /> 一键成片（合成 {completedCount} 个分镜）</>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              消耗 <span className="font-semibold text-primary">{composeCreditCost}</span> 积分 · 使用智能媒体服务合成
            </p>
          </div>
        )}

        {/* Composed result */}
        {composeStatus === 'completed' && composeResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">成片完成</h3>
            </div>
            {(composeResult.url || composeResult.videoUrl || composeResult.mediaUrl) && (
              <div className="overflow-hidden rounded-lg border border-emerald-200">
                <video
                  src={composeResult.url || composeResult.videoUrl || composeResult.mediaUrl}
                  controls
                  className="w-full max-h-[400px]"
                />
              </div>
            )}
            <div className="mt-3 flex justify-center">
              <a
                href={composeResult.url || composeResult.videoUrl || composeResult.mediaUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Download size={14} /> 下载成片
              </a>
            </div>
          </div>
        )}

        {/* Individual results (when no composition yet) */}
        {completedCount > 0 && !generating && composeStatus !== 'completed' && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">
                分镜结果 — {completedCount}/{scenes.length} 个生成成功
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {scenes.filter(s => s.status === 'completed' && s.output).map((scene) => {
                const videoUrl = scene.output?.url || scene.output?.videoUrl;
                if (!videoUrl) return null;
                return (
                  <div key={scene.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <video src={videoUrl} className="aspect-video w-full object-cover" muted
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <a href={videoUrl} download target="_blank" rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-white">
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
