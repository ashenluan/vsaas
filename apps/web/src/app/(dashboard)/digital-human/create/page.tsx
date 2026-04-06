'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ApiError,
  dhBatchV2Api,
  digitalHumanApi,
  materialApi,
  mixcutApi,
  scriptApi,
  type DhBatchBuiltinAvatar,
  type ImsVoiceOption,
  voiceApi,
} from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { useWs } from '@/components/ws-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  FileText,
  Loader2,
  Mic2,
  Settings2,
  Sparkles,
  Upload,
  UserCircle,
  Volume2,
  X,
} from 'lucide-react';
import {
  buildCreatePreviewSummary,
  buildCreateVideoPayload,
  CREATE_ENGINE_OPTIONS,
  DRIVE_MODE_OPTIONS,
  syncEngineSelection,
  type CreateEngine,
  type CreateVideoFormState,
  type CreateVoiceType,
} from './_lib/create-video-form';

const RESOLUTIONS = [
  { label: '竖屏 1080×1920', value: '1080x1920' },
  { label: '横屏 1920×1080', value: '1920x1080' },
  { label: '方形 1080×1080', value: '1080x1080' },
  { label: '竖屏 4K', value: '2160x3840' },
  { label: '横屏 4K', value: '3840x2160' },
];

type CustomAvatar = {
  id: string;
  name: string;
  url?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
};

type ClonedVoice = {
  id: string;
  name: string;
  voiceId?: string;
  gender?: 'female' | 'male';
  isPublic?: boolean;
};

type ScriptItem = {
  id: string;
  title: string;
  content: string;
};

type BackgroundMaterial = {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
};

type BuiltinVoiceCard = ImsVoiceOption & {
  category: string;
};

function createInitialFormState(presetAvatarId: string | null): CreateVideoFormState {
  return {
    engine: presetAvatarId ? 'wan-photo' : 'ims',
    driveMode: 'text',
    projectName: '',
    resolution: '1080x1920',
    selectedAvatar: presetAvatarId,
    selectedBuiltinAvatar: null,
    selectedVoice: null,
    voiceType: 'builtin',
    textContent: '',
    speechRate: 1,
    animateMode: 'wan-std',
    outputFormat: 'mp4',
    loopMotion: false,
    backgroundUrl: '',
    pitchRate: 0,
    volume: 1,
  };
}

function flattenImsVoices(imsVoices: Record<string, ImsVoiceOption[]> | undefined): BuiltinVoiceCard[] {
  if (!imsVoices) return [];

  return Object.entries(imsVoices).flatMap(([category, voices]) =>
    voices.map((voice) => ({
      ...voice,
      category,
    })),
  );
}

function CreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetAvatarId = searchParams.get('avatarId');

  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>([]);
  const [builtinAvatars, setBuiltinAvatars] = useState<DhBatchBuiltinAvatar[]>([]);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [builtinVoices, setBuiltinVoices] = useState<BuiltinVoiceCard[]>([]);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [backgrounds, setBackgrounds] = useState<BackgroundMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');

  const [form, setForm] = useState<CreateVideoFormState>(() => createInitialFormState(presetAvatarId));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showScripts, setShowScripts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewText] = useState('欢迎使用青柚AI数字人创作平台');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { subscribe, connected: wsConnected } = useWs();

  const selectedCustomAvatar = useMemo(
    () => customAvatars.find((avatar) => avatar.id === form.selectedAvatar) || null,
    [customAvatars, form.selectedAvatar],
  );
  const selectedBuiltinAvatar = useMemo(
    () => builtinAvatars.find((avatar) => avatar.avatarId === form.selectedBuiltinAvatar) || null,
    [builtinAvatars, form.selectedBuiltinAvatar],
  );
  const selectedPreviewImage = form.engine === 'ims'
    ? selectedBuiltinAvatar?.coverUrl
    : selectedCustomAvatar?.url;
  const availableDriveModes = DRIVE_MODE_OPTIONS[form.engine];

  const previewSummary = useMemo(
    () => buildCreatePreviewSummary({
      state: form,
      customAvatars: customAvatars.map((avatar) => ({ id: avatar.id, name: avatar.name })),
      builtinAvatars: builtinAvatars.map((avatar) => ({ id: avatar.avatarId, name: avatar.avatarName })),
      builtinVoices: builtinVoices.map((voice) => ({ id: voice.id, label: voice.label })),
      clonedVoices: clonedVoices.map((voice) => ({
        id: voice.voiceId || voice.id,
        label: voice.name,
      })),
    }),
    [form, customAvatars, builtinAvatars, builtinVoices, clonedVoices],
  );

  useEffect(() => {
    if (!result?.id) return;
    return subscribe('digital-human:progress', (data: any) => {
      if (result.id === data.jobId) {
        setResult((prev: any) => ({ ...prev, ...data }));
      }
    });
  }, [subscribe, result?.id]);

  useEffect(() => {
    if (!result?.id || wsConnected) return;
    const status = (result.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'FAILED') return;

    const poll = async () => {
      try {
        const job = await digitalHumanApi.getVideo(result.id);
        if (job && job.status !== result.status) {
          setResult((prev: any) => ({
            ...prev,
            status: job.status,
            progress: job.output?.videoUrl ? 100 : (prev.progress || 0),
            output: job.output || prev.output,
            errorMsg: job.errorMsg || prev.errorMsg,
          }));
        }
      } catch {}
    };

    const timer = setInterval(poll, 5000);
    poll();
    return () => clearInterval(timer);
  }, [result?.id, result?.status, wsConnected]);

  useEffect(() => () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
  }, [audioPreview, videoPreview]);

  useEffect(() => {
    Promise.allSettled([
      materialApi.list('IMAGE'),
      materialApi.list('BACKGROUND'),
      voiceApi.list(),
      scriptApi.list(),
      dhBatchV2Api.listBuiltinAvatars(),
      mixcutApi.getOptions(),
    ])
      .then(([avatarsResult, backgroundsResult, voicesResult, scriptsResult, builtinAvatarsResult, mixcutOptionsResult]) => {
        setBootstrapError('');
        setAuthRedirecting(false);

        const errors = [
          avatarsResult,
          backgroundsResult,
          voicesResult,
          scriptsResult,
          builtinAvatarsResult,
          mixcutOptionsResult,
        ]
          .filter((item): item is PromiseRejectedResult => item.status === 'rejected')
          .map((item) => item.reason);

        const unauthorized = errors.find((item) => item instanceof ApiError && item.status === 401);
        if (unauthorized) {
          setAuthRedirecting(true);
          return;
        }

        if (avatarsResult.status === 'fulfilled') {
          const items = Array.isArray(avatarsResult.value) ? avatarsResult.value : (avatarsResult.value as any)?.items || [];
          setCustomAvatars(items);
        } else {
          setCustomAvatars([]);
        }

        if (backgroundsResult.status === 'fulfilled') {
          const items = Array.isArray(backgroundsResult.value) ? backgroundsResult.value : (backgroundsResult.value as any)?.items || [];
          setBackgrounds(items);
        } else {
          setBackgrounds([]);
        }

        if (voicesResult.status === 'fulfilled') {
          const items = Array.isArray(voicesResult.value) ? voicesResult.value : (voicesResult.value as any)?.items || [];
          setClonedVoices(items.filter((voice: any) => voice.status === 'READY'));
        } else {
          setClonedVoices([]);
        }

        if (scriptsResult.status === 'fulfilled') {
          const items = Array.isArray(scriptsResult.value) ? scriptsResult.value : (scriptsResult.value as any)?.items || [];
          setScripts(items);
        } else {
          setScripts([]);
        }

        if (builtinAvatarsResult.status === 'fulfilled') {
          setBuiltinAvatars(builtinAvatarsResult.value.avatars || []);
        } else {
          setBuiltinAvatars([]);
        }

        if (mixcutOptionsResult.status === 'fulfilled') {
          setBuiltinVoices(flattenImsVoices(mixcutOptionsResult.value.imsVoices));
        } else {
          setBuiltinVoices([]);
        }

        const messageParts: string[] = [];
        if (avatarsResult.status === 'rejected') messageParts.push(avatarsResult.reason?.message || '照片数字人素材加载失败');
        if (voicesResult.status === 'rejected') messageParts.push(voicesResult.reason?.message || '克隆声音列表加载失败');
        if (builtinAvatarsResult.status === 'rejected') messageParts.push(builtinAvatarsResult.reason?.message || 'IMS 内置数字人列表加载失败');
        if (mixcutOptionsResult.status === 'rejected') messageParts.push(mixcutOptionsResult.reason?.message || 'IMS 系统音色加载失败');
        if (scriptsResult.status === 'rejected') messageParts.push(scriptsResult.reason?.message || '脚本库加载失败');
        if (backgroundsResult.status === 'rejected') messageParts.push(backgroundsResult.reason?.message || '背景图库加载失败');
        setBootstrapError(messageParts.join('；'));
      })
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (patch: Partial<CreateVideoFormState>) => {
    setError('');
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleEngineSelect = (engine: CreateEngine) => {
    setError('');
    setForm((prev) => syncEngineSelection(prev, engine));
  };

  const handleVoiceTypeSelect = (voiceType: CreateVoiceType) => {
    setError('');
    setForm((prev) => ({
      ...prev,
      voiceType,
      selectedVoice: prev.voiceType === voiceType ? prev.selectedVoice : null,
    }));
  };

  const handleAudioFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('请上传音频文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('音频不能超过20MB');
      return;
    }

    setError('');
    setAudioFile(file);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(URL.createObjectURL(file));
  };

  const handleVideoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('请上传视频文件');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError('视频不能超过200MB');
      return;
    }

    setError('');
    setVideoFile(file);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleVoicePreview = async (voiceId: string, voiceType?: 'builtin' | 'cloned') => {
    setPreviewingVoice(voiceId);
    try {
      const response = await voiceApi.preview(voiceId, previewText, voiceType);
      if (response?.audioUrl) {
        const audio = new Audio(response.audioUrl);
        audio.play();
        audio.onended = () => setPreviewingVoice(null);
      } else {
        setPreviewingVoice(null);
      }
    } catch {
      setPreviewingVoice(null);
    }
  };

  const handleSubmit = async () => {
    if (form.driveMode === 'audio' && !audioFile) {
      setError('请上传音频文件');
      return;
    }

    if (form.driveMode === 'video' && !videoFile) {
      setError('请上传参考视频');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      let uploadedAudioUrl: string | undefined;
      let uploadedVideoUrl: string | undefined;

      if (form.driveMode === 'audio' && audioFile) {
        const uploaded = await uploadToOSS(audioFile);
        uploadedAudioUrl = uploaded.url;
      }

      if (form.driveMode === 'video' && videoFile) {
        const uploaded = await uploadToOSS(videoFile);
        uploadedVideoUrl = uploaded.url;
      }

      const payloadResult = buildCreateVideoPayload(form, {
        audioUrl: uploadedAudioUrl,
        videoUrl: uploadedVideoUrl,
      });

      if (!payloadResult.ok) {
        setError(payloadResult.error);
        return;
      }

      const job = await digitalHumanApi.createVideo(payloadResult.payload);
      setResult(job);
    } catch (submitError: any) {
      setError(submitError.message || '创作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authRedirecting) {
    return (
      <div className="rounded-xl border border-slate-200 bg-card p-4 text-sm text-slate-600">
        登录状态已失效，正在跳转到登录页...
      </div>
    );
  }

  if (bootstrapError && customAvatars.length === 0 && builtinAvatars.length === 0) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-500">
        {bootstrapError}
      </div>
    );
  }

  if (result) {
    const status = (result.status || '').toUpperCase();
    const isProcessing = status === 'PENDING' || status === 'PROCESSING';
    const isCompleted = status === 'COMPLETED' || status === 'SUCCEEDED';
    const isFailed = status === 'FAILED';

    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          {isProcessing && (
            <>
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <h2 className="mb-2 text-xl font-bold text-slate-900">数字人视频生成中</h2>
              <p className="mb-4 text-sm text-slate-500">{result.message || '正在处理，请稍候...'}</p>
              {result.progress != null && (
                <div className="mx-auto max-w-xs">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${result.progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{Math.round(result.progress)}%</p>
                </div>
              )}
            </>
          )}

          {isCompleted && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Check size={32} className="text-emerald-500" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">生成完成！</h2>
              {result.output?.videoUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border">
                  <video src={result.output.videoUrl} controls className="w-full" />
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" onClick={() => router.push('/digital-human/works')} className="rounded-xl font-bold">
                  查看作品
                </Button>
                <Button
                  onClick={() => {
                    setResult(null);
                    setForm((prev) => ({ ...prev, textContent: '' }));
                  }}
                  className="rounded-xl font-bold"
                >
                  继续创作
                </Button>
              </div>
            </>
          )}

          {isFailed && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <X size={32} className="text-red-500" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">生成失败</h2>
              <p className="mb-4 text-sm text-red-500">{result.errorMsg || '请稍后重试'}</p>
              <Button onClick={() => setResult(null)} className="rounded-xl font-bold">
                重新创作
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        {bootstrapError && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-700">
            {bootstrapError}
          </div>
        )}

        <SectionCard icon={FileText} title="作品名称" description="可选，便于后续在作品列表里快速查找。">
          <input
            type="text"
            value={form.projectName}
            onChange={(event) => updateForm({ projectName: event.target.value })}
            placeholder="给作品起个名字"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </SectionCard>

        <SectionCard icon={Sparkles} title="创作模式" description="先明确使用哪条引擎路径，表单会按模式自动精简。">
          <div className="grid gap-3 md:grid-cols-3">
            {CREATE_ENGINE_OPTIONS.map((option) => {
              const selected = form.engine === option.value;
              const meta = option.value === 'ims'
                ? `${builtinAvatars.length} 个内置数字人 · ${builtinVoices.length} 个系统音色`
                : option.value === 'wan-photo'
                  ? `${customAvatars.length} 个照片形象 · ${clonedVoices.length} 个可用声音`
                  : `${customAvatars.length} 个照片形象 · 参考视频驱动`;

              return (
                <button
                  key={option.value}
                  onClick={() => handleEngineSelect(option.value)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/10'
                      : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{option.label}</span>
                    {selected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-xs leading-5 text-slate-500">{option.description}</p>
                  <p className="text-[11px] font-medium text-slate-400">{meta}</p>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          icon={UserCircle}
          title={form.engine === 'ims' ? '选择内置数字人' : '选择照片数字人'}
          description={form.engine === 'ims' ? '阿里云 IMS 预置数字人形象。' : '沿用当前照片数字人资产与管理方式。'}
        >
          {form.engine === 'ims' ? (
            builtinAvatars.length === 0 ? (
              <EmptyState
                title="暂无可用内置数字人"
                description="请先确认 IMS 配置和地域匹配，再刷新当前页面。"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {builtinAvatars.map((avatar) => {
                  const selected = form.selectedBuiltinAvatar === avatar.avatarId;
                  return (
                    <button
                      key={avatar.avatarId}
                      onClick={() => updateForm({ selectedBuiltinAvatar: avatar.avatarId })}
                      className={cn(
                        'relative overflow-hidden rounded-xl border text-left transition-all',
                        selected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-slate-200 hover:border-primary/40',
                      )}
                    >
                      {avatar.coverUrl ? (
                        <img src={avatar.coverUrl} alt={avatar.avatarName} className="aspect-[3/4] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[3/4] items-center justify-center bg-slate-100 text-slate-400">
                          <UserCircle size={28} />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="truncate text-sm font-medium text-slate-900">{avatar.avatarName}</p>
                        <p className="text-[11px] text-slate-400">{avatar.width}×{avatar.height}</p>
                      </div>
                      {selected && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : customAvatars.length === 0 ? (
            <EmptyState
              title="暂无照片数字人"
              description="请先到「我的数字人」页面上传或复刻照片形象。"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {customAvatars.map((avatar) => {
                const selected = form.selectedAvatar === avatar.id;
                const faceValid = (avatar.metadata as any)?.faceDetect?.valid !== false;

                return (
                  <button
                    key={avatar.id}
                    onClick={() => updateForm({ selectedAvatar: avatar.id })}
                    className={cn(
                      'relative overflow-hidden rounded-xl border text-left transition-all',
                      selected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-primary/40',
                    )}
                  >
                    {avatar.url ? (
                      <img src={avatar.url} alt={avatar.name} className="aspect-[3/4] w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-slate-100 text-slate-400">
                        <UserCircle size={28} />
                      </div>
                    )}
                    {avatar.isPublic && (
                      <div className="absolute left-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">系统</div>
                    )}
                    {selected && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <Check size={14} />
                      </div>
                    )}
                    <div className="bg-white p-2">
                      <p className="truncate text-sm font-medium text-slate-900">{avatar.name}</p>
                      {!faceValid && <p className="text-[11px] text-red-500">未通过人脸检测</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        {form.driveMode === 'text' && (
          <SectionCard
            icon={Mic2}
            title={form.engine === 'ims' ? '选择配音' : '选择声音'}
            description={form.engine === 'ims' ? 'IMS 支持系统音色与克隆声音两种来源。' : '沿用当前声音列表与试听方式。'}
          >
            {form.engine === 'ims' && (
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => handleVoiceTypeSelect('builtin')}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    form.voiceType === 'builtin'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  系统音色
                </button>
                <button
                  onClick={() => handleVoiceTypeSelect('cloned')}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    form.voiceType === 'cloned'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  克隆声音
                </button>
              </div>
            )}

            {form.engine === 'ims' && form.voiceType === 'builtin' ? (
              builtinVoices.length === 0 ? (
                <EmptyState
                  title="暂无 IMS 系统音色"
                  description="可以切换到克隆声音继续创作，或检查混剪配置接口是否已返回音色能力。"
                />
              ) : (
                <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {builtinVoices.map((voice) => {
                    const selected = form.selectedVoice === voice.id;
                    const previewing = previewingVoice === voice.id;
                    return (
                      <button
                        key={voice.id}
                        onClick={() => updateForm({ selectedVoice: voice.id })}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-100 hover:border-slate-200',
                        )}
                      >
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400',
                        )}>
                          <Volume2 size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-slate-900">{voice.label}</p>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{voice.category}</span>
                          </div>
                          <p className="truncate text-[11px] text-slate-400">{voice.desc}</p>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleVoicePreview(voice.id, 'builtin');
                            }}
                            disabled={previewing}
                            className="mt-1 text-[11px] text-primary hover:underline disabled:opacity-50"
                          >
                            {previewing ? '播放中...' : '试听'}
                          </button>
                        </div>
                        {selected && <Check size={16} className="shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )
            ) : clonedVoices.length === 0 ? (
              <EmptyState
                title="暂无可用克隆声音"
                description="请先到「声音管理」页面克隆声音后再回来创作。"
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {clonedVoices.map((voice) => {
                  const voiceId = voice.voiceId || voice.id;
                  const selected = form.selectedVoice === voiceId;
                  const previewing = previewingVoice === voiceId;

                  return (
                    <button
                      key={voice.id}
                      onClick={() => updateForm({ selectedVoice: voiceId })}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-100 hover:border-slate-200',
                      )}
                    >
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400',
                      )}>
                        <Volume2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-slate-900">{voice.name}</p>
                          {voice.isPublic && (
                            <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">系统</span>
                          )}
                          {voice.gender && (
                            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500">
                              {voice.gender === 'female' ? '女' : '男'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleVoicePreview(voiceId, form.engine === 'ims' ? 'cloned' : undefined);
                          }}
                          disabled={previewing}
                          className="text-[11px] text-primary hover:underline disabled:opacity-50"
                        >
                          {previewing ? '播放中...' : '试听'}
                        </button>
                      </div>
                      {selected && <Check size={16} className="shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard
          icon={form.engine === 'wan-motion' ? Clapperboard : FileText}
          title="驱动内容"
          description="当前模式下只展示有效的驱动方式和输入区域。"
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {availableDriveModes.map((option) => (
              <button
                key={option.value}
                onClick={() => updateForm({ driveMode: option.value })}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  form.driveMode === option.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs text-slate-500">
            {availableDriveModes.find((option) => option.value === form.driveMode)?.description}
          </p>

          {form.driveMode === 'text' ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">输入台词文案，数字人将自动生成口播与唇形。</p>
                <button
                  onClick={() => setShowScripts((prev) => !prev)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  从脚本导入 {showScripts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {showScripts && scripts.length > 0 && (
                <div className="mb-3 max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {scripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => {
                        updateForm({ textContent: script.content });
                        setShowScripts(false);
                      }}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <p className="truncate text-sm font-medium text-slate-700">{script.title}</p>
                      <p className="line-clamp-1 text-xs text-slate-400">{script.content}</p>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={form.textContent}
                onChange={(event) => updateForm({ textContent: event.target.value })}
                rows={6}
                placeholder={form.engine === 'ims' ? '输入 IMS 数字人要说的台词...' : '输入照片数字人要说的台词...'}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm placeholder:text-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{form.textContent.length} 字</p>
            </div>
          ) : form.driveMode === 'audio' ? (
            <div>
              <p className="mb-2 text-xs text-slate-500">
                {form.engine === 'ims'
                  ? '上传音频，直接驱动 IMS 内置数字人口播。'
                  : '上传音频文件，照片数字人将自动对口型。'}
              </p>
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
              {audioPreview ? (
                <div className="space-y-2">
                  <audio src={audioPreview} controls className="w-full" />
                  <button
                    onClick={() => {
                      setAudioFile(null);
                      setAudioPreview(null);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    移除音频
                  </button>
                </div>
              ) : (
                <UploadBox label="点击上传音频文件" onClick={() => audioInputRef.current?.click()} />
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs text-slate-500">上传参考视频，执行动作迁移（2-30 秒，≤200MB）。</p>
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
              {videoPreview ? (
                <div className="space-y-2">
                  <video src={videoPreview} controls className="w-full rounded-xl" />
                  <button
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    移除视频
                  </button>
                </div>
              ) : (
                <UploadBox label="点击上传参考视频" onClick={() => videoInputRef.current?.click()} />
              )}

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-slate-600">动作迁移模式</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateForm({ animateMode: 'wan-std' })}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      form.animateMode === 'wan-std'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300',
                    )}
                  >
                    标准模式（快速）
                  </button>
                  <button
                    onClick={() => updateForm({ animateMode: 'wan-pro' })}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      form.animateMode === 'wan-pro'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300',
                    )}
                  >
                    专业模式（更精细）
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <button
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl p-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50/50"
          >
            <div className="flex items-center gap-2">
              <Settings2 size={18} className="text-primary" />
              高级设置
            </div>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="space-y-5 border-t border-border p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">输出分辨率</label>
                <div className="flex flex-wrap gap-2">
                  {RESOLUTIONS.map((resolution) => (
                    <button
                      key={resolution.value}
                      onClick={() => updateForm({ resolution: resolution.value })}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-xs font-medium transition-all',
                        form.resolution === resolution.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      {resolution.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.driveMode === 'text' && (
                <SliderField
                  label="语速调节"
                  value={form.speechRate}
                  min={0.5}
                  max={2}
                  step={0.1}
                  format={(value) => `${value.toFixed(1)}x`}
                  onChange={(value) => updateForm({ speechRate: value })}
                />
              )}

              {form.engine === 'ims' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">输出格式</label>
                    <div className="flex gap-2">
                      {(['mp4', 'webm'] as const).map((format) => (
                        <button
                          key={format}
                          onClick={() => updateForm({ outputFormat: format })}
                          className={cn(
                            'rounded-lg border px-4 py-2 text-xs font-medium uppercase transition-all',
                            form.outputFormat === format
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300',
                          )}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">循环动作</p>
                      <p className="text-xs text-slate-400">适合短口播或需要持续站姿输出的场景。</p>
                    </div>
                    <button
                      onClick={() => updateForm({ loopMotion: !form.loopMotion })}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        form.loopMotion ? 'bg-primary' : 'bg-slate-300',
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        form.loopMotion ? 'translate-x-[22px]' : 'translate-x-0.5',
                      )}
                      />
                    </button>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">背景图片</label>
                      {form.backgroundUrl && (
                        <button
                          onClick={() => updateForm({ backgroundUrl: '' })}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          清空背景
                        </button>
                      )}
                    </div>

                    {backgrounds.length > 0 && (
                      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        <button
                          onClick={() => updateForm({ backgroundUrl: '' })}
                          className={cn(
                            'flex aspect-[4/3] items-center justify-center rounded-xl border text-xs font-medium transition-all',
                            !form.backgroundUrl
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300',
                          )}
                        >
                          默认
                        </button>
                        {backgrounds.map((background) => {
                          const selected = form.backgroundUrl === background.url;
                          return (
                            <button
                              key={background.id}
                              onClick={() => updateForm({ backgroundUrl: background.url })}
                              className={cn(
                                'relative overflow-hidden rounded-xl border transition-all',
                                selected
                                  ? 'border-primary ring-2 ring-primary/20'
                                  : 'border-slate-200 hover:border-primary/40',
                              )}
                            >
                              <img
                                src={background.thumbnailUrl || background.url}
                                alt={background.name}
                                className="aspect-[4/3] w-full object-cover"
                              />
                              {selected && (
                                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                  <Check size={12} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="text"
                      value={form.backgroundUrl}
                      onChange={(event) => updateForm({ backgroundUrl: event.target.value })}
                      placeholder="输入背景图 URL（可选，可直接粘贴 OSS 地址）"
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <p className="mt-1 text-xs text-slate-400">可从上方背景图库快速选取，也可以直接填写 URL。</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-500">
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 w-full rounded-xl text-base font-bold shadow-lg transition-all hover:shadow-xl"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              提交生成
            </>
          )}
        </Button>
      </div>

      <div className="hidden w-[300px] shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">创作预览</h3>
          <div className="mb-4 aspect-[9/16] overflow-hidden rounded-xl bg-slate-100">
            {selectedPreviewImage ? (
              <img src={selectedPreviewImage} alt="数字人预览" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <UserCircle size={48} />
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {previewSummary.map((item) => (
              <SummaryRow key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          {form.driveMode === 'text' && form.textContent && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-medium text-slate-500">台词预览</p>
              <p className="line-clamp-5 text-xs leading-5 text-slate-600">{form.textContent}</p>
            </div>
          )}

          {form.driveMode === 'audio' && audioPreview && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-medium text-slate-500">音频驱动</p>
              <audio src={audioPreview} controls className="w-full" />
            </div>
          )}

          {form.driveMode === 'video' && videoPreview && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-medium text-slate-500">参考视频</p>
              <video src={videoPreview} controls className="w-full rounded-lg" />
            </div>
          )}

          {form.engine === 'ims' && form.backgroundUrl && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-medium text-slate-500">背景预览</p>
              <div className="overflow-hidden rounded-lg border">
                <img src={form.backgroundUrl} alt="背景预览" className="aspect-[4/3] w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ElementType;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <UserCircle className="mx-auto mb-3 h-9 w-9 text-slate-300" />
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function UploadBox({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-all hover:border-primary hover:text-primary"
    >
      <Upload size={20} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-xs text-slate-400">{format(value)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">{format(min)}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="text-xs text-slate-400">{format(max)}</span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreateContent />
    </Suspense>
  );
}
