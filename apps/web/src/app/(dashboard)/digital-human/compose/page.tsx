'use client';

import { useState, useEffect } from 'react';
import { voiceApi, materialApi, scriptApi, composeApi, storageApi } from '@/lib/api';
import { useWs } from '@/components/ws-provider';

type Step = 'voice' | 'avatar' | 'script' | 'materials' | 'subtitle' | 'effects' | 'config' | 'submit';

export default function ComposePage() {
  const [step, setStep] = useState<Step>('voice');
  const [voices, setVoices] = useState<any[]>([]);
  const [avatars, setAvatars] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [options, setOptions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected items
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [bgMusic, setBgMusic] = useState('');
  const [videoCount, setVideoCount] = useState(5);
  const [resolution, setResolution] = useState('1080x1920');

  // 字幕配置
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitleFont, setSubtitleFont] = useState('Alibaba PuHuiTi 2.0 65 Medium');
  const [subtitleFontSize, setSubtitleFontSize] = useState(40);
  const [subtitleFontColor, setSubtitleFontColor] = useState('#ffffff');
  const [subtitleAlignment, setSubtitleAlignment] = useState('BottomCenter');
  const [subtitleY, setSubtitleY] = useState(0.85);
  const [subtitleOutline, setSubtitleOutline] = useState(2);
  const [subtitleOutlineColor, setSubtitleOutlineColor] = useState('#000000');
  const [subtitleStyleId, setSubtitleStyleId] = useState('');
  const [subtitleBubbleId, setSubtitleBubbleId] = useState('');

  // 特效配置
  const [allowEffects, setAllowEffects] = useState(false);
  const [effectProbability, setEffectProbability] = useState(0.5);
  const [selectedFirstEffects, setSelectedFirstEffects] = useState<string[]>([]);
  const [selectedOtherEffects, setSelectedOtherEffects] = useState<string[]>([]);

  // 转场配置
  const [allowTransition, setAllowTransition] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [selectedTransitions, setSelectedTransitions] = useState<string[]>([]);
  const [uniformTransition, setUniformTransition] = useState(true);

  // 滤镜配置
  const [allowFilter, setAllowFilter] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // 素材上传
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialType, setNewMaterialType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      voiceApi.list().catch(() => []),
      materialApi.list('IMAGE').catch(() => []),
      materialApi.list().catch(() => []),
      scriptApi.list().catch(() => []),
      composeApi.getOptions().catch(() => null),
      composeApi.list().catch(() => []),
    ]).then(([v, a, m, s, o, jobs]) => {
      setVoices(Array.isArray(v) ? v : (v as any)?.items || []);
      setAvatars(Array.isArray(a) ? a : (a as any)?.items || []);
      setAllMaterials(Array.isArray(m) ? m : (m as any)?.items || []);
      setScripts(Array.isArray(s) ? s : (s as any)?.items || []);
      if (o) setOptions(o);

      // 恢复进行中的任务
      const jobList = Array.isArray(jobs) ? jobs : (jobs as any)?.items || [];
      const activeJob = jobList.find((j: any) => j.status === 'PENDING' || j.status === 'PROCESSING');
      if (activeJob) {
        setResult(activeJob);
      }
    }).finally(() => setLoading(false));
  }, []);

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'voice', label: '选择声音', num: 1 },
    { key: 'avatar', label: '选择形象', num: 2 },
    { key: 'script', label: '选择脚本', num: 3 },
    { key: 'materials', label: '素材管理', num: 4 },
    { key: 'subtitle', label: '字幕设置', num: 5 },
    { key: 'effects', label: '特效转场', num: 6 },
    { key: 'config', label: '输出配置', num: 7 },
    { key: 'submit', label: '确认提交', num: 8 },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  const handleAddMaterial = async () => {
    if (!newMaterialUrl || !newMaterialName) return;
    setUploadingMaterial(true);
    try {
      const created = await materialApi.upload({
        name: newMaterialName,
        type: newMaterialType,
        url: newMaterialUrl,
        mimeType: newMaterialType === 'IMAGE' ? 'image/jpeg' : 'video/mp4',
      });
      setAllMaterials((prev) => [created, ...prev]);
      setNewMaterialUrl('');
      setNewMaterialName('');
    } catch (err: any) {
      setError(err.message || '添加素材失败');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!selectedVoice) { setError('请选择声音'); setStep('voice'); return; }
    if (!selectedAvatar) { setError('请选择形象'); setStep('avatar'); return; }
    if (selectedScripts.length === 0) { setError('请选择至少一个脚本'); setStep('script'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload: any = {
        voiceId: selectedVoice,
        avatarId: selectedAvatar,
        scriptIds: selectedScripts,
        materialIds: selectedMaterials.length > 0 ? selectedMaterials : undefined,
        bgMusic: bgMusic || undefined,
        videoCount,
        resolution,
      };

      // 字幕
      if (subtitleEnabled) {
        payload.subtitleConfig = {
          font: subtitleFont,
          fontSize: subtitleFontSize,
          fontColor: subtitleFontColor,
          alignment: subtitleAlignment,
          y: subtitleY,
          outline: subtitleOutline,
          outlineColour: subtitleOutlineColor,
          ...(subtitleStyleId && { effectColorStyleId: subtitleStyleId }),
          ...(subtitleBubbleId && { bubbleStyleId: subtitleBubbleId }),
        };
      }

      // 特效
      if (allowEffects) {
        payload.effectsConfig = {
          allowEffects: true,
          vfxEffectProbability: effectProbability,
          ...(selectedFirstEffects.length > 0 && { vfxFirstClipEffectList: selectedFirstEffects }),
          ...(selectedOtherEffects.length > 0 && { vfxNotFirstClipEffectList: selectedOtherEffects }),
        };
      }

      // 转场
      if (allowTransition) {
        payload.transitionConfig = {
          allowTransition: true,
          transitionDuration,
          useUniformTransition: uniformTransition,
          ...(selectedTransitions.length > 0 && { transitionList: selectedTransitions }),
        };
      }

      // 滤镜
      if (allowFilter) {
        payload.filterConfig = {
          allowFilter: true,
          ...(selectedFilters.length > 0 && { filterList: selectedFilters }),
        };
      }

      const job = await composeApi.create(payload);
      setResult(job);
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleScript = (id: string) => {
    setSelectedScripts((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleArrayItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  // WebSocket 进度监听
  const { subscribe } = useWs();
  const [composeProgress, setComposeProgress] = useState<{ progress: number; message: string; status: string } | null>(null);

  useEffect(() => {
    if (!result?.id) return;
    return subscribe('compose:progress', (data: any) => {
      if (data.jobId === result.id) {
        setComposeProgress({ progress: data.progress, message: data.message, status: data.status });
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setResult((prev: any) => ({ ...prev, status: data.status, outputVideos: data.outputVideos }));
        }
      }
    });
  }, [result?.id, subscribe]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">加载素材中...</div>;
  }

  if (result) {
    const isProcessing = result.status === 'PENDING' || result.status === 'PROCESSING';
    const isCompleted = result.status === 'COMPLETED';
    const isFailed = result.status === 'FAILED';
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">批量混剪</h1>
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <div className="mb-4 text-center text-4xl">
            {isCompleted ? '✅' : isFailed ? '❌' : '⏳'}
          </div>
          <h2 className="mb-2 text-center text-xl font-semibold">
            {isCompleted ? '任务完成' : isFailed ? '任务失败' : '任务处理中'}
          </h2>

          {/* 进度条 */}
          {isProcessing && composeProgress && (
            <div className="mx-auto mb-4 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{composeProgress.message}</span>
                <span>{composeProgress.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${composeProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {!composeProgress && isProcessing && (
            <p className="mb-4 text-center text-sm text-muted-foreground">
              批量混剪任务已开始处理，预计需要较长时间完成
            </p>
          )}

          <div className="mx-auto mb-6 max-w-md rounded-lg bg-muted p-4 text-left text-sm">
            <p>任务ID：{result.id}</p>
            <p>状态：{composeProgress?.status || result.status || 'PENDING'}</p>
            <p>视频数量：{(result.input as any)?.videoCount || videoCount}</p>
            {composeProgress?.message && <p className="mt-1 text-xs text-muted-foreground">{composeProgress.message}</p>}
          </div>

          {/* 输出视频 */}
          {isCompleted && result.outputVideos?.length > 0 && (
            <div className="mx-auto mb-6 max-w-lg">
              <h3 className="mb-2 text-sm font-semibold">生成的视频</h3>
              <div className="space-y-2">
                {result.outputVideos.map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>视频 {i + 1} {v.duration ? `(${v.duration}s)` : ''}</span>
                    {v.mediaURL && (
                      <a href={v.mediaURL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        下载
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => { setResult(null); setComposeProgress(null); setStep('voice'); }}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              创建新任务
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">批量混剪</h1>

      {/* 步骤指示器 */}
      <div className="mb-8 flex flex-wrap items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                step === s.key
                  ? 'bg-primary text-primary-foreground font-medium'
                  : i < currentIdx
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`mx-0.5 h-px w-3 ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* Step 1: 选择声音 */}
      {step === 'voice' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">选择克隆声音</h2>
          {voices.filter((v: any) => v.status === 'READY').length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              暂无可用声音，请先到「声音管理」页面克隆声音
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {voices.filter((v: any) => v.status === 'READY').map((voice: any) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.voiceId)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selectedVoice === voice.voiceId
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  <h3 className="font-medium">{voice.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(voice.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep('avatar')}
              disabled={!selectedVoice}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 选择形象 */}
      {step === 'avatar' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">选择数字人形象</h2>
          {avatars.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              暂无形象，请先到「数字人形象」页面上传
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {avatars.map((avatar: any) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`overflow-hidden rounded-xl border text-left transition-all ${
                    selectedAvatar === avatar.id
                      ? 'border-primary ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                >
                  {avatar.url ? (
                    <img src={avatar.url} alt={avatar.name} className="aspect-[3/4] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center bg-muted text-xs">无图片</div>
                  )}
                  <div className="p-2">
                    <p className="text-sm font-medium">{avatar.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('voice')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={() => setStep('script')}
              disabled={!selectedAvatar}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 选择脚本 */}
      {step === 'script' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">选择口播脚本</h2>
          <p className="mb-4 text-sm text-muted-foreground">可多选，每个脚本将生成不同的视频版本</p>
          {scripts.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              暂无脚本，请先到「脚本编辑」页面创建
            </div>
          ) : (
            <div className="space-y-3">
              {scripts.map((script: any) => (
                <button
                  key={script.id}
                  onClick={() => toggleScript(script.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedScripts.includes(script.id)
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                      selectedScripts.includes(script.id) ? 'border-primary bg-primary text-white' : 'border-input'
                    }`}>
                      {selectedScripts.includes(script.id) && '✓'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{script.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{script.content}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('avatar')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={() => setStep('materials')}
              disabled={selectedScripts.length === 0}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 素材管理 */}
      {step === 'materials' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">素材管理</h2>
          <p className="mb-4 text-sm text-muted-foreground">添加图片/视频素材用于混剪，设置背景音乐</p>

          {/* 添加素材 */}
          <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">添加素材</h3>
            <div className="flex gap-2 mb-3">
              {(['IMAGE', 'VIDEO'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewMaterialType(t)}
                  className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                    newMaterialType === t ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                  }`}
                >
                  {t === 'IMAGE' ? '图片' : '视频'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="素材名称"
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <input
                type="text"
                value={newMaterialUrl}
                onChange={(e) => setNewMaterialUrl(e.target.value)}
                placeholder="素材URL（OSS地址）"
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={handleAddMaterial}
                disabled={uploadingMaterial || !newMaterialUrl || !newMaterialName}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {uploadingMaterial ? '添加中...' : '添加素材'}
              </button>
            </div>
          </div>

          {/* 已有素材列表 */}
          <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">选择混剪素材（可选）</h3>
            {allMaterials.filter((m: any) => m.type === 'IMAGE' || m.type === 'VIDEO').length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无图片/视频素材</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {allMaterials
                  .filter((m: any) => m.type === 'IMAGE' || m.type === 'VIDEO')
                  .map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => toggleMaterial(m.id)}
                      className={`overflow-hidden rounded-lg border text-left transition-all ${
                        selectedMaterials.includes(m.id)
                          ? 'border-primary ring-2 ring-primary'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      {m.type === 'IMAGE' && m.url ? (
                        <img src={m.thumbnailUrl || m.url} alt={m.name} className="aspect-video w-full object-cover" />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-muted text-xs">
                          {m.type === 'VIDEO' ? '🎬' : '🖼'} {m.type}
                        </div>
                      )}
                      <div className="p-1.5">
                        <p className="text-xs font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.type}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 背景音乐 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium">背景音乐 URL（可选）</label>
            <input
              type="text"
              value={bgMusic}
              onChange={(e) => setBgMusic(e.target.value)}
              placeholder="输入背景音乐的URL地址"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">支持 MP3、WAV 格式</p>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('script')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={() => setStep('subtitle')}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 字幕设置 */}
      {step === 'subtitle' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">字幕设置</h2>
          <p className="mb-4 text-sm text-muted-foreground">配置口播字幕的样式，确保人声、口型、字幕一致</p>

          <div className="max-w-2xl space-y-4">
            {/* 字幕开关 */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">启用字幕</span>
                <button
                  onClick={() => setSubtitleEnabled(!subtitleEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    subtitleEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    subtitleEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {subtitleEnabled && (
              <>
                {/* 字体和大小 */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">字体样式</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">字体</label>
                      <select
                        value={subtitleFont}
                        onChange={(e) => setSubtitleFont(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="Alibaba PuHuiTi 2.0 65 Medium">阿里巴巴普惠体</option>
                        <option value="Alibaba PuHuiTi 2.0 95 ExtraBold">阿里巴巴普惠体(粗)</option>
                        <option value="KaiTi">楷体</option>
                        <option value="SimHei">黑体</option>
                        <option value="SimSun">宋体</option>
                        <option value="Microsoft YaHei">微软雅黑</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">字号</label>
                      <input
                        type="number"
                        value={subtitleFontSize}
                        onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
                        min={16}
                        max={120}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">字体颜色</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={subtitleFontColor}
                          onChange={(e) => setSubtitleFontColor(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border"
                        />
                        <input
                          type="text"
                          value={subtitleFontColor}
                          onChange={(e) => setSubtitleFontColor(e.target.value)}
                          className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">对齐方式</label>
                      <select
                        value={subtitleAlignment}
                        onChange={(e) => setSubtitleAlignment(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="TopCenter">顶部居中</option>
                        <option value="CenterCenter">正中</option>
                        <option value="BottomCenter">底部居中</option>
                        <option value="BottomLeft">底部左</option>
                        <option value="BottomRight">底部右</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 描边与位置 */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">描边与位置</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">描边宽度</label>
                      <input
                        type="number"
                        value={subtitleOutline}
                        onChange={(e) => setSubtitleOutline(Number(e.target.value))}
                        min={0}
                        max={10}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">描边颜色</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={subtitleOutlineColor}
                          onChange={(e) => setSubtitleOutlineColor(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border"
                        />
                        <input
                          type="text"
                          value={subtitleOutlineColor}
                          onChange={(e) => setSubtitleOutlineColor(e.target.value)}
                          className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">纵向位置 (Y)</label>
                      <input
                        type="number"
                        value={subtitleY}
                        onChange={(e) => setSubtitleY(Number(e.target.value))}
                        min={0}
                        max={1}
                        step={0.05}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      />
                      <p className="mt-0.5 text-[10px] text-muted-foreground">0=顶部 1=底部</p>
                    </div>
                  </div>
                </div>

                {/* 字幕模板 */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">字幕模板（可选）</h3>
                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-muted-foreground">花字样式</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSubtitleStyleId('')}
                        className={`rounded-md border px-2.5 py-1 text-xs ${
                          !subtitleStyleId ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                        }`}
                      >
                        无
                      </button>
                      {(options?.subtitleStyles || SUBTITLE_STYLES_FALLBACK).map((id: string) => (
                        <button
                          key={id}
                          onClick={() => setSubtitleStyleId(id)}
                          className={`rounded-md border px-2.5 py-1 text-xs ${
                            subtitleStyleId === id ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                          }`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">气泡样式</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSubtitleBubbleId('')}
                        className={`rounded-md border px-2.5 py-1 text-xs ${
                          !subtitleBubbleId ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                        }`}
                      >
                        无
                      </button>
                      {(options?.bubbleStyles || BUBBLE_STYLES_FALLBACK).map((id: string) => (
                        <button
                          key={id}
                          onClick={() => setSubtitleBubbleId(id)}
                          className={`rounded-md border px-2.5 py-1 text-xs ${
                            subtitleBubbleId === id ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                          }`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('materials')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={() => setStep('effects')}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 6: 特效/转场/滤镜 */}
      {step === 'effects' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">特效 · 转场 · 滤镜</h2>

          <div className="max-w-2xl space-y-4">
            {/* 特效 */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">视频特效</span>
                <button
                  onClick={() => setAllowEffects(!allowEffects)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${allowEffects ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowEffects ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {allowEffects && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">特效概率: {(effectProbability * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={effectProbability}
                      onChange={(e) => setEffectProbability(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">首片段特效（可选多个）</label>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {Object.entries(options?.effects || EFFECTS_FALLBACK).map(([category, items]) => (
                        <div key={category}>
                          <span className="text-[10px] text-muted-foreground">{EFFECT_CATEGORY_LABELS[category] || category}：</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(items as string[]).map((e) => (
                              <button
                                key={e}
                                onClick={() => toggleArrayItem(selectedFirstEffects, setSelectedFirstEffects, e)}
                                className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                                  selectedFirstEffects.includes(e) ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                                }`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">其他片段特效（可选多个）</label>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {Object.entries(options?.effects || EFFECTS_FALLBACK).map(([category, items]) => (
                        <div key={category}>
                          <span className="text-[10px] text-muted-foreground">{EFFECT_CATEGORY_LABELS[category] || category}：</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(items as string[]).map((e) => (
                              <button
                                key={e}
                                onClick={() => toggleArrayItem(selectedOtherEffects, setSelectedOtherEffects, e)}
                                className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                                  selectedOtherEffects.includes(e) ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                                }`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 转场 */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">转场效果</span>
                <button
                  onClick={() => setAllowTransition(!allowTransition)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${allowTransition ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowTransition ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {allowTransition && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">转场时长（秒）</label>
                    <input
                      type="number"
                      value={transitionDuration}
                      onChange={(e) => setTransitionDuration(Number(e.target.value))}
                      min={0.1}
                      max={3}
                      step={0.1}
                      className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uniformTransition}
                      onChange={(e) => setUniformTransition(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-xs text-muted-foreground">使用统一转场</span>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">选择转场效果（可选多个，共 {(options?.transitions || TRANSITIONS_FALLBACK).length} 种）</label>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                      {(options?.transitions || TRANSITIONS_FALLBACK).map((t: string) => (
                        <button
                          key={t}
                          onClick={() => toggleArrayItem(selectedTransitions, setSelectedTransitions, t)}
                          className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                            selectedTransitions.includes(t) ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 滤镜 */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">滤镜效果</span>
                <button
                  onClick={() => setAllowFilter(!allowFilter)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${allowFilter ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowFilter ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {allowFilter && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">选择滤镜（可选多个，留空则随机）</label>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {Object.entries(options?.filters || FILTERS_FALLBACK).map(([category, items]) => (
                      <div key={category}>
                        <span className="text-[10px] text-muted-foreground">{FILTER_CATEGORY_LABELS[category] || category}：</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(items as string[]).map((f) => (
                            <button
                              key={f}
                              onClick={() => toggleArrayItem(selectedFilters, setSelectedFilters, f)}
                              className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                                selectedFilters.includes(f) ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('subtitle')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={() => setStep('config')}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 7: 输出配置 */}
      {step === 'config' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">输出配置</h2>
          <div className="max-w-lg space-y-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <label className="mb-1.5 block text-sm font-medium">生成数量</label>
              <div className="flex gap-2">
                {[1, 3, 5, 10, 20, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setVideoCount(n)}
                    className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
                      videoCount === n ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <label className="mb-1.5 block text-sm font-medium">分辨率</label>
              <div className="flex gap-2">
                {[
                  { label: '竖屏 1080×1920', value: '1080x1920' },
                  { label: '横屏 1920×1080', value: '1920x1080' },
                  { label: '方形 1080×1080', value: '1080x1080' },
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setResolution(r.value)}
                    className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
                      resolution === r.value ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:bg-accent'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('effects')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={() => setStep('submit')}
              className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 8: 确认提交 */}
      {step === 'submit' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">确认信息</h2>
          <div className="max-w-lg rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">选择声音</span>
                <span className="font-medium">{voices.find((v: any) => v.voiceId === selectedVoice)?.name || '--'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">选择形象</span>
                <span className="font-medium">{avatars.find((a: any) => a.id === selectedAvatar)?.name || '--'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">脚本数量</span>
                <span className="font-medium">{selectedScripts.length} 个</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">混剪素材</span>
                <span className="font-medium">{selectedMaterials.length > 0 ? `${selectedMaterials.length} 个` : '无'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">字幕</span>
                <span className="font-medium">{subtitleEnabled ? `${subtitleFont} ${subtitleFontSize}px` : '关闭'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">特效</span>
                <span className="font-medium">{allowEffects ? `开启 (${(effectProbability * 100).toFixed(0)}%)` : '关闭'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">转场</span>
                <span className="font-medium">{allowTransition ? `开启 (${transitionDuration}s)` : '关闭'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">滤镜</span>
                <span className="font-medium">{allowFilter ? `开启 (${selectedFilters.length || '随机'})` : '关闭'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">生成数量</span>
                <span className="font-medium">{videoCount} 条视频</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">分辨率</span>
                <span className="font-medium">{resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">背景音乐</span>
                <span className="font-medium">{bgMusic ? '已设置' : '无'}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 max-w-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">预估费用</span>
              <span className="text-lg font-bold text-blue-900">{videoCount * 20} 积分</span>
            </div>
            <p className="mt-1 text-xs text-blue-600">每条视频消耗 20 积分，共 {videoCount} 条</p>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 max-w-lg">
            混剪将保持数字人人声、口型、字幕的一致性。使用克隆声音进行口播合成，通过 ASR 自动生成字幕并与音频对齐。
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep('config')} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? '提交中...' : '开始批量生成'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback data when API options not loaded
const SUBTITLE_STYLES_FALLBACK = [
  'CS0001-000011', 'CS0001-000004', 'CS0001-000005', 'CS0001-000014', 'CS0001-000007',
  'CS0002-000002', 'CS0002-000004', 'CS0002-000009', 'CS0002-000016',
];

const BUBBLE_STYLES_FALLBACK = [
  'BS0001-000001', 'BS0001-000002', 'BS0001-000003', 'BS0001-000004', 'BS0001-000005',
  'BS0002-000001', 'BS0002-000002', 'BS0002-000003', 'BS0002-000004', 'BS0002-000005',
];

const TRANSITIONS_FALLBACK = [
  'directional', 'displacement', 'windowslice', 'bowTieVertical', 'bowTieHorizontal',
  'simplezoom', 'linearblur', 'waterdrop', 'glitchmemories', 'polka', 'perlin',
  'directionalwarp', 'bounce_up', 'bounce_down', 'wiperight', 'wipeleft', 'wipedown',
  'wipeup', 'morph', 'colordistance', 'circlecrop', 'swirl', 'dreamy', 'gridflip',
  'zoomincircles', 'radial', 'mosaic', 'undulatingburnout', 'crosshatch',
  'crazyparametricfun', 'kaleidoscope', 'windowblinds', 'hexagonalize', 'glitchdisplace',
  'dreamyzoom', 'doomscreentransition_up', 'doomscreentransition_down', 'ripple',
  'pinwheel', 'angular', 'burn', 'circle', 'circleopen', 'colorphase', 'crosswarp',
  'cube', 'directionalwipe', 'doorway', 'fade', 'fadecolor', 'fadegrayscale', 'flyeye',
  'heart', 'luma', 'multiplyblend', 'pixelize', 'polarfunction', 'randomsquares',
  'rotatescalefade', 'squareswire', 'squeeze', 'swap', 'wind',
];

const EFFECTS_FALLBACK: Record<string, string[]> = {
  basic: ['open', 'close', 'h_blur', 'v_blur', 'blur', 'slightshake', 'zoominout', 'movie', 'zoomslight', 'color_difference', 'disappear', 'shock', 'bluropen', 'blurclose', 'photograph', 'black', 'blurring', 'slightshow', 'whiteshow'],
  atmosphere: ['colorfulradial', 'colorfulstarry', 'flyfire', 'heartfireworks', 'meteorshower', 'moons_and_stars', 'sparklestarfield', 'spotfall', 'starexplosion', 'starry'],
  dynamic: ['white', 'minus_glitter', 'jitter', 'soulout', 'scanlight', 'swing', 'heartbeat', 'flashingscreen', 'illusion', 'segmentation', 'neolighting', 'curl', 'shine', 'smalljitter', 'flashinglight'],
  light: ['moon_projection', 'star_projection', 'heart_projection', 'sunset_projection', 'shinningstar_light', 'anglelight', 'darknight_rainbow', 'fallingcircle', 'lightcenter', 'lightsweep', 'moon', 'rotationspotlight'],
  retro: ['blackwhitetv', 'edgescan', 'oldtv', 'oldtvshine', 'nightvision', 'tvshow'],
  dreamy: ['colorfulsun', 'bigsun', 'fallingheart', 'colorfulfireworks', 'heartshot', 'starfieldshinee', 'starfieldshinee2', 'fireworks', 'heartsurround', 'risingheartbubble', 'starfield', 'colorfulripples', 'colorfulbubbles', 'heartbubbleshinee', 'starsparkle'],
  nature: ['rainy', 'waterripple', 'snow', 'foggy', 'meteor', 'stormlaser', 'simpleripple', 'fadeshadow'],
  splitScreen: ['marquee', 'livesplit', 'splitstill2', 'splitstill3', 'splitstill4', 'splitstill9', 'splitstill6', 'blackwhitesplit', 'blurthreesplit'],
  color: ['colorful', 'blackfade', 'rainbowfilter', 'movingrainbow', 'discolights'],
  deform: ['fisheye', 'mosaic_rect', 'glass', 'planet'],
};

const FILTERS_FALLBACK: Record<string, string[]> = {
  modern90s: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
  film: ['pf1', 'pf2', 'pf3', 'pf4', 'pf5', 'pf6', 'pf7', 'pf8', 'pf9', 'pfa', 'pfb', 'pfc'],
  infrared: ['pi1', 'pi2', 'pi3', 'pi4'],
  fresh: ['pl1', 'pl2', 'pl3', 'pl4'],
  japanese: ['pj1', 'pj2', 'pj3', 'pj4'],
  unsplash: ['delta', 'electric', 'faded', 'slowlived', 'tokoyo', 'urbex', 'warm'],
  negative80s: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
  travel: ['pv1', 'pv2', 'pv3', 'pv4', 'pv5', 'pv6'],
  art90s: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
};

const EFFECT_CATEGORY_LABELS: Record<string, string> = {
  basic: '基础', atmosphere: '氛围', dynamic: '动感', light: '光效',
  retro: '复古', dreamy: '梦幻', nature: '自然', splitScreen: '分屏',
  color: '色彩', deform: '变形',
};

const FILTER_CATEGORY_LABELS: Record<string, string> = {
  modern90s: '90s现代胶片', film: '胶片', infrared: '红外', fresh: '清新',
  japanese: '日系', unsplash: 'Unsplash', negative80s: '80s负片',
  travel: '旅行', art90s: '90s艺术',
};
