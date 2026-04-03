'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { voiceApi, materialApi, scriptApi, apiFetch, ApiError } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { useWs } from '@/components/ws-provider';
import {
  UserCircle,
  Mic2,
  FileText,
  Upload,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings2,
  Loader2,
  Volume2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// 驱动模式
type DriveMode = 'text' | 'audio' | 'video';

// 生成模式
const RESOLUTIONS = [
  { label: '竖屏 1080×1920', value: '1080x1920' },
  { label: '横屏 1920×1080', value: '1920x1080' },
  { label: '方形 1080×1080', value: '1080x1080' },
  { label: '竖屏 4K', value: '2160x3840' },
  { label: '横屏 4K', value: '3840x2160' },
];

function CreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetAvatarId = searchParams.get('avatarId');

  // Data
  const [avatars, setAvatars] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');

  // Selections
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(presetAvatarId);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [driveMode, setDriveMode] = useState<DriveMode>('text');
  const [textContent, setTextContent] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [animateMode, setAnimateMode] = useState<'wan-std' | 'wan-pro'>('wan-std');
  const [resolution, setResolution] = useState('1080x1920');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Script quick fill
  const [showScripts, setShowScripts] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // Preview
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState('欢迎使用青柚AI数字人创作平台');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // WebSocket
  const { subscribe } = useWs();
  useEffect(() => {
    return subscribe('compose:progress', (data: any) => {
      if (result?.id === data.jobId) {
        setResult((prev: any) => ({ ...prev, ...data }));
      }
    });
  }, [subscribe, result?.id]);

  // HTTP polling fallback (in case WebSocket is disconnected)
  useEffect(() => {
    if (!result?.id) return;
    const status = (result.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'FAILED') return;

    const poll = async () => {
      try {
        const job = await apiFetch(`/digital-human/video/${result.id}`);
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
    poll(); // immediate first check
    return () => clearInterval(timer);
  }, [result?.id, result?.status]);

  // Load data
  useEffect(() => {
    Promise.allSettled([
      materialApi.list('IMAGE'),
      voiceApi.list(),
      scriptApi.list(),
    ])
      .then(([avatarsResult, voicesResult, scriptsResult]) => {
        setBootstrapError('');
        setAuthRedirecting(false);

        const bootstrapErrors = [avatarsResult, voicesResult, scriptsResult]
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map((result) => result.reason);

        const unauthorizedError = bootstrapErrors.find((err) => err instanceof ApiError && err.status === 401);
        if (unauthorizedError) {
          setAuthRedirecting(true);
          return;
        }

        if (avatarsResult.status === 'rejected' || voicesResult.status === 'rejected') {
          const criticalError = avatarsResult.status === 'rejected'
            ? avatarsResult.reason
            : voicesResult.status === 'rejected'
              ? voicesResult.reason
              : null;
          setBootstrapError(criticalError?.message || '加载创作数据失败，请稍后重试');
          return;
        }

        const a = avatarsResult.value;
        const v = voicesResult.value;
        const s = scriptsResult.status === 'fulfilled' ? scriptsResult.value : [];

        if (scriptsResult.status === 'rejected') {
          setBootstrapError(scriptsResult.reason?.message || '脚本加载失败，暂时无法使用脚本导入');
        }

        setAvatars(Array.isArray(a) ? a : (a as any)?.items || []);
        const voiceList = Array.isArray(v) ? v : (v as any)?.items || [];
        setVoices(voiceList.filter((voice: any) => voice.status === 'READY'));
        setScripts(Array.isArray(s) ? s : (s as any)?.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) { setError('请上传音频文件'); return; }
    if (f.size > 20 * 1024 * 1024) { setError('音频不能超过20MB'); return; }
    setError('');
    setAudioFile(f);
    setAudioPreview(URL.createObjectURL(f));
  };

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) { setError('请上传视频文件'); return; }
    if (f.size > 200 * 1024 * 1024) { setError('视频不能超过200MB'); return; }
    setError('');
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
  };

  const handleVoicePreview = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    try {
      const result = await voiceApi.preview(voiceId, previewText);
      if (result?.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
      }
    } catch {} finally {
      setPreviewingVoice(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAvatar) { setError('请选择数字人形象'); return; }
    if (!selectedVoice && driveMode === 'text') { setError('请选择声音'); return; }
    if (driveMode === 'text' && !textContent.trim()) { setError('请输入台词文案'); return; }
    if (driveMode === 'audio' && !audioFile) { setError('请上传音频文件'); return; }
    if (driveMode === 'video' && !videoFile) { setError('请上传参考视频'); return; }
    setError('');
    setSubmitting(true);

    try {
      let audioUrl: string | undefined;
      if (driveMode === 'audio' && audioFile) {
        const { url } = await uploadToOSS(audioFile);
        audioUrl = url;
      }

      let videoUrl: string | undefined;
      if (driveMode === 'video' && videoFile) {
        const { url } = await uploadToOSS(videoFile);
        videoUrl = url;
      }

      const payload: any = {
        avatarId: selectedAvatar,
        driveMode,
        resolution,
        ...(projectName && { name: projectName }),
      };

      if (driveMode === 'text') {
        payload.voiceId = selectedVoice;
        payload.text = textContent.trim();
        if (speechRate !== 1.0) payload.speechRate = speechRate;
      } else if (driveMode === 'video') {
        payload.videoUrl = videoUrl;
        payload.animateMode = animateMode;
      } else {
        payload.audioUrl = audioUrl;
      }

      const job = await apiFetch('/digital-human/create-video', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(job);
    } catch (err: any) {
      setError(err.message || '创作失败');
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

  if (bootstrapError && avatars.length === 0 && voices.length === 0) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-500">
        {bootstrapError}
      </div>
    );
  }

  // 显示结果
  if (result) {
    const isProcessing = result.status === 'PENDING' || result.status === 'PROCESSING';
    const isCompleted = result.status === 'COMPLETED' || result.status === 'SUCCEEDED';
    const isFailed = result.status === 'FAILED';
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
          {isProcessing && (
            <>
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <h2 className="mb-2 text-xl font-bold text-slate-900">数字人视频生成中</h2>
              <p className="text-sm text-slate-500 mb-4">{result.message || '正在处理，请稍候...'}</p>
              {result.progress != null && (
                <div className="mx-auto max-w-xs">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
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
                <div className="mt-4 rounded-xl overflow-hidden border">
                  <video src={result.output.videoUrl} controls className="w-full" />
                </div>
              )}
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/digital-human/works')} className="rounded-xl font-bold">
                  查看作品
                </Button>
                <Button onClick={() => { setResult(null); setTextContent(''); }} className="rounded-xl font-bold">
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
              <p className="text-sm text-red-500 mb-4">{result.errorMsg || '请稍后重试'}</p>
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
      {/* 左侧：创作面板 */}
      <div className="flex-1 space-y-6">
        {bootstrapError && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-500">
            {bootstrapError}
          </div>
        )}

        {/* 作品名称 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-2 block text-sm font-bold text-slate-700">作品名称（可选）</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="给作品起个名字"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* 选择数字人 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <UserCircle size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-slate-700">选择数字人形象</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={cn(
                  'relative overflow-hidden rounded-xl border-2 transition-all aspect-[3/4]',
                  selectedAvatar === avatar.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-slate-200'
                )}
              >
                {avatar.url ? (
                  <img src={avatar.url} alt={avatar.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-100">
                    <UserCircle size={24} className="text-slate-300" />
                  </div>
                )}
                {selectedAvatar === avatar.id && (
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check size={12} />
                  </div>
                )}
                {avatar.isPublic && (
                  <div className="absolute left-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm">系统</div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 px-1.5 pb-1 pt-4">
                  <p className="truncate text-[10px] font-medium text-white">{avatar.name}</p>
                </div>
              </button>
            ))}
          </div>
          {avatars.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">暂无数字人形象，请先到「我的数字人」页面复刻</p>
          )}
        </div>

        {/* 选择声音 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Mic2 size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-slate-700">选择声音</h3>
          </div>
          {voices.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">暂无可用声音，请先到「声音管理」页面克隆声音</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.voiceId || voice.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                    (selectedVoice === voice.voiceId || selectedVoice === voice.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-100 hover:border-slate-200'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    (selectedVoice === voice.voiceId || selectedVoice === voice.id)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}>
                    <Volume2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-slate-900">{voice.name}</p>
                      {voice.isPublic && (
                        <span className="shrink-0 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white leading-none">系统</span>
                      )}
                      {voice.gender && (
                        <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500 leading-none">{voice.gender === 'female' ? '女' : '男'}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVoicePreview(voice.voiceId || voice.id); }}
                      disabled={previewingVoice === (voice.voiceId || voice.id)}
                      className="text-[11px] text-primary hover:underline disabled:opacity-50"
                    >
                      {previewingVoice === (voice.voiceId || voice.id) ? '播放中...' : '试听'}
                    </button>
                  </div>
                  {(selectedVoice === voice.voiceId || selectedVoice === voice.id) && (
                    <Check size={16} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 驱动模式 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-slate-700">台词内容</h3>
          </div>

          {/* 模式切换 */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setDriveMode('text')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                driveMode === 'text'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              文本驱动
            </button>
            <button
              onClick={() => setDriveMode('audio')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                driveMode === 'audio'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              音频驱动
            </button>
            <button
              onClick={() => setDriveMode('video')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                driveMode === 'video'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              视频驱动
            </button>
          </div>

          {driveMode === 'text' ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">输入台词文案，数字人将自动对口型</p>
                <button
                  onClick={() => setShowScripts(!showScripts)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  从脚本导入 {showScripts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* 脚本快捷导入 */}
              {showScripts && scripts.length > 0 && (
                <div className="mb-3 max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {scripts.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setTextContent(s.content); setShowScripts(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-700 truncate">{s.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{s.content}</p>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                placeholder="输入你想让数字人说的台词..."
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-sm"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{textContent.length} 字</p>
            </div>
          ) : driveMode === 'audio' ? (
            <div>
              <p className="mb-2 text-xs text-slate-500">上传音频文件，数字人将自动对口型（无需选择声音）</p>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioFile}
                className="hidden"
              />
              {audioPreview ? (
                <div className="space-y-2">
                  <audio src={audioPreview} controls className="w-full" />
                  <button
                    onClick={() => { setAudioFile(null); setAudioPreview(null); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    移除音频
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary transition-all"
                >
                  <Upload size={20} />
                  <span className="text-sm font-medium">点击上传音频文件</span>
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs text-slate-500">上传参考视频，数字人将模仿视频中的动作和表情（2-30秒，≤200MB）</p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFile}
                className="hidden"
              />
              {videoPreview ? (
                <div className="space-y-2">
                  <video src={videoPreview} controls className="w-full rounded-xl" />
                  <button
                    onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    移除视频
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary transition-all"
                >
                  <Upload size={20} />
                  <span className="text-sm font-medium">点击上传参考视频</span>
                </button>
              )}
              {/* 模式选择 */}
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-slate-600">生成模式</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAnimateMode('wan-std')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                      animateMode === 'wan-std'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    标准模式（快速）
                  </button>
                  <button
                    onClick={() => setAnimateMode('wan-pro')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                      animateMode === 'wan-pro'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    专业模式（更精细）
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 高级设置 */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between p-5 text-sm font-bold text-slate-700 hover:bg-slate-50/50 transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2">
              <Settings2 size={18} className="text-primary" />
              高级设置
            </div>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showAdvanced && (
            <div className="border-t border-border p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">输出分辨率</label>
                <div className="flex flex-wrap gap-2">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setResolution(r.value)}
                      className={cn(
                        'rounded-lg px-4 py-2 text-xs font-medium border transition-all',
                        resolution === r.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {driveMode === 'text' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    语速调节 <span className="text-slate-400 font-normal">({speechRate.toFixed(1)}x)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">0.5x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-xs text-slate-400">2.0x</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">调节数字人的说话速度</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-500 border border-red-100">
            {error}
          </div>
        )}

        {/* 提交按钮 */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 w-full rounded-xl text-base font-bold shadow-lg hover:shadow-xl transition-all"
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 提交中...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> 提交生成</>
          )}
        </Button>
      </div>

      {/* 右侧：预览 */}
      <div className="hidden w-[280px] shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">创作预览</h3>
          {/* 数字人预览 */}
          <div className="mb-4 aspect-[9/16] overflow-hidden rounded-xl bg-slate-100">
            {selectedAvatar ? (
              <img
                src={avatars.find((a) => a.id === selectedAvatar)?.url}
                alt="数字人"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <UserCircle size={48} />
              </div>
            )}
          </div>
          {/* 配置信息 */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">数字人</span>
              <span className="font-medium text-slate-700">
                {selectedAvatar ? avatars.find((a) => a.id === selectedAvatar)?.name || '已选择' : '未选择'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">声音</span>
              <span className="font-medium text-slate-700">
                {driveMode === 'audio' ? '音频驱动' : driveMode === 'video' ? '视频驱动' : selectedVoice ? voices.find((v) => v.voiceId === selectedVoice || v.id === selectedVoice)?.name || '已选择' : '未选择'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">驱动模式</span>
              <span className="font-medium text-slate-700">{driveMode === 'text' ? '文本驱动' : driveMode === 'audio' ? '音频驱动' : '视频驱动'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">分辨率</span>
              <span className="font-medium text-slate-700">{resolution}</span>
            </div>
            {driveMode === 'text' && textContent && (
              <div className="mt-3 rounded-lg bg-slate-50 p-2">
                <p className="text-slate-600 line-clamp-4">{textContent}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CreateContent />
    </Suspense>
  );
}
