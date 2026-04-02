'use client';

import { useState } from 'react';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { useJobUpdates } from '@/components/ws-provider';
import { mixcutApi } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, Play, Film, Loader2, CheckCircle, AlertCircle, RefreshCw, Clock, CalendarClock, Shield, Share2, Zap, Download, ExternalLink } from 'lucide-react';

const PUBLISH_PLATFORMS = [
  { id: 'douyin', label: '抖音', icon: '🎵', color: 'bg-black text-white' },
  { id: 'kuaishou', label: '快手', icon: '🎬', color: 'bg-orange-500 text-white' },
  { id: 'xiaohongshu', label: '小红书', icon: '📕', color: 'bg-red-500 text-white' },
  { id: 'wechat', label: '视频号', icon: '💬', color: 'bg-green-600 text-white' },
  { id: 'bilibili', label: 'B站', icon: '📺', color: 'bg-sky-500 text-white' },
  { id: 'weibo', label: '微博', icon: '📝', color: 'bg-red-600 text-white' },
];

export function PreviewPanel() {
  const { project, subtitleStyle, titleStyle, globalConfig, highlightWords, forbiddenWords, setScheduledAt, setPublishPlatforms, outputVideos, jobStatus, setOutputVideos, setJobStatus } = useMixcutStore();

  // Watermark position mapping
  const watermarkPositionStyle: Record<string, React.CSSProperties> = {
    topLeft: { top: 8, left: 8 },
    topRight: { top: 8, right: 8 },
    bottomLeft: { bottom: 24, left: 8 },
    bottomRight: { bottom: 24, right: 8 },
  };
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; jobId?: string; error?: string } | null>(null);
  const [progress, setProgress] = useState<{ status?: string; progress?: number; message?: string } | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  // Real-time progress via WebSocket
  useJobUpdates(result?.jobId || null, (data: any) => {
    setProgress({
      status: data.status,
      progress: data.progress,
      message: data.message || '',
    });
    if (data.status === 'COMPLETED' && data.outputVideos?.length) {
      setOutputVideos(data.outputVideos);
      setJobStatus('COMPLETED');
    }
  });

  const handleBatchDownload = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    for (let i = 0; i < outputVideos.length; i++) {
      const v = outputVideos[i];
      const a = document.createElement('a');
      a.href = v.mediaURL;
      a.download = `${project.name}_${i + 1}.mp4`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadProgress(Math.round(((i + 1) / outputVideos.length) * 100));
      if (i < outputVideos.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    setDownloading(false);
  };

  // Estimate total combinations (only enabled groups)
  const enabledGroups = project.shotGroups.filter((g) => g.enabled !== false);
  const shotCombinations = enabledGroups.reduce((acc, group) => {
    const materialCount = Math.max(group.materials.length, 1);
    return acc * materialCount;
  }, 1);

  const estimatedCount = Math.min(shotCombinations, 100);

  // Estimate per-video duration
  const totalDuration = enabledGroups.reduce((acc, group) => {
    const groupDuration = group.materials.reduce((sum, m) => sum + (m.duration || 3), 0);
    return acc + (groupDuration > 0 ? groupDuration / Math.max(group.materials.length, 1) : 3);
  }, 0);

  // Check if ready to submit
  const hasEmptyGroups = enabledGroups.some((g) => g.materials.length === 0);
  const canSubmit = enabledGroups.length > 0 && !hasEmptyGroups && !submitting;

  const handleSubmit = async (previewOnly = false) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    try {
      // Determine speech mode based on whether groups have individual speechTexts
      const hasGroupSpeech = enabledGroups.some((g) => g.subtitles.length > 0);
      const globalSpeechTexts = enabledGroups
        .flatMap((g) => g.subtitles.map((s) => s.text))
        .filter(Boolean);

      const payload = {
        name: project.name,
        shotGroups: enabledGroups.map((g) => ({
          name: g.name,
          materialUrls: g.materials.map((m) => m.url),
          ...(g.subtitles.length > 0 && {
            speechTexts: g.subtitles.map((s) => s.text).filter(Boolean),
          }),
          ...(g.subHeadings?.length > 0 && { subHeadings: g.subHeadings }),
          keepOriginalAudio: g.keepOriginalAudio,
          ...(!g.keepOriginalAudio ? { volume: 0 } : g.volume !== 1 ? { volume: g.volume } : {}),
          ...(g.smartTrim && { splitMode: 'AverageSplit' as const }),
        })),
        speechMode: hasGroupSpeech ? 'group' as const : undefined,
        videoCount: estimatedCount,
        resolution: globalConfig.resolution,
        // Voice
        ...((globalConfig as any).voiceId && { voiceId: (globalConfig as any).voiceId }),
        ...((globalConfig as any).voiceType && { voiceType: (globalConfig as any).voiceType }),
        // Background music
        ...(globalConfig.bgMusic && { bgMusic: globalConfig.bgMusic }),
        ...(globalConfig.bgMusicVolume !== 0.2 && { bgMusicVolume: globalConfig.bgMusicVolume }),
        // Audio volumes
        ...(globalConfig.mediaVolume !== 1.0 && { mediaVolume: globalConfig.mediaVolume }),
        ...(globalConfig.speechVolume !== 1.0 && { speechVolume: globalConfig.speechVolume }),
        ...(globalConfig.speechRate !== 1.0 && { speechRate: globalConfig.speechRate }),
        // Subtitle
        subtitleConfig: {
          font: subtitleStyle.font,
          fontSize: subtitleStyle.fontSize,
          fontColor: subtitleStyle.fontColor,
          fontColorOpacity: subtitleStyle.fontColorOpacity,
          alignment: subtitleStyle.alignment,
          y: subtitleStyle.y,
          outline: subtitleStyle.outline,
          outlineColour: subtitleStyle.outlineColour,
          bold: subtitleStyle.bold,
          italic: subtitleStyle.italic,
          underline: subtitleStyle.underline,
          ...(subtitleStyle.adaptMode && { adaptMode: subtitleStyle.adaptMode }),
          ...(subtitleStyle.textWidth && { textWidth: subtitleStyle.textWidth }),
          ...(subtitleStyle.effectColorStyleId && { effectColorStyleId: subtitleStyle.effectColorStyleId }),
          ...(subtitleStyle.bubbleStyleId && { bubbleStyleId: subtitleStyle.bubbleStyleId }),
        },
        // Title
        ...(titleStyle.enabled && {
          titleConfig: {
            enabled: true,
            titles: titleStyle.text ? [titleStyle.text] : [],
            font: titleStyle.font,
            fontSize: titleStyle.fontSize,
            fontColor: titleStyle.fontColor,
            y: titleStyle.y,
          },
        }),
        // Highlight words
        ...(highlightWords.filter((hw) => hw.word).length > 0 && {
          highlightWords: highlightWords.filter((hw) => hw.word).map((hw) => ({
            word: hw.word,
            fontColor: hw.fontColor,
            bold: hw.bold,
          })),
        }),
        // Forbidden words
        ...(forbiddenWords.filter((fw) => fw.word).length > 0 && {
          forbiddenWords: forbiddenWords.filter((fw) => fw.word).map((fw) => ({
            word: fw.word,
            soundReplaceMode: fw.soundReplaceMode,
          })),
        }),
        // Transition
        ...(globalConfig.transitionEnabled && {
          transitionEnabled: true,
          transitionDuration: globalConfig.transitionDuration,
          transitionList: globalConfig.transitionList,
          useUniformTransition: globalConfig.useUniformTransition,
        }),
        // Filter
        ...(globalConfig.filterEnabled && {
          filterEnabled: true,
          filterList: globalConfig.filterList,
        }),
        // VFX Effects (merge per-group scene effects into global lists)
        ...(() => {
          const groupEffects = enabledGroups.flatMap((g) => g.effectList || []);
          const hasGlobal = globalConfig.vfxEffectEnabled;
          const hasGroup = groupEffects.length > 0;
          if (!hasGlobal && !hasGroup) return {};
          const mergedNotFirst = [...new Set([...globalConfig.vfxNotFirstClipEffectList, ...groupEffects])];
          return {
            vfxEffectEnabled: true,
            vfxEffectProbability: globalConfig.vfxEffectProbability || 50,
            ...(globalConfig.vfxFirstClipEffectList.length > 0 && { vfxFirstClipEffectList: globalConfig.vfxFirstClipEffectList }),
            ...(mergedNotFirst.length > 0 && { vfxNotFirstClipEffectList: mergedNotFirst }),
          };
        })(),
        // Video quality
        ...(globalConfig.maxDuration > 0 && { maxDuration: globalConfig.maxDuration }),
        ...(globalConfig.fixedDuration > 0 && { fixedDuration: globalConfig.fixedDuration }),
        ...(globalConfig.crf > 0 && { crf: globalConfig.crf }),
        // 素材处理
        ...(globalConfig.singleShotDuration > 0 && { singleShotDuration: globalConfig.singleShotDuration }),
        ...(globalConfig.imageDuration > 0 && { imageDuration: globalConfig.imageDuration }),
        ...(globalConfig.alignmentMode && { alignmentMode: globalConfig.alignmentMode }),
        // 快速预览
        ...(previewOnly && { generatePreviewOnly: true }),
        // Background
        ...(globalConfig.bgType !== 'none' && { bgType: globalConfig.bgType }),
        ...(globalConfig.bgType === 'color' && { bgColor: globalConfig.bgColor }),
        ...(globalConfig.bgType === 'blur' && globalConfig.bgBlurRadius && { bgBlurRadius: globalConfig.bgBlurRadius }),
        ...(globalConfig.bgType === 'image' && globalConfig.bgImage && { bgImage: globalConfig.bgImage }),
        // 封面
        ...(globalConfig.coverType !== 'auto' && { coverType: globalConfig.coverType }),
        ...(globalConfig.coverType === 'custom' && globalConfig.coverUrl && { coverUrl: globalConfig.coverUrl }),
        ...(globalConfig.coverType === 'smart' && {
          coverConfig: {
            coverTitle: globalConfig.coverTitle || undefined,
            coverTitleFont: globalConfig.coverTitleFont,
            coverTitleColor: globalConfig.coverTitleColor,
            coverTitleSize: globalConfig.coverTitleSize,
            coverTitlePosition: globalConfig.coverTitlePosition,
          },
        }),
        // 水印
        ...(globalConfig.watermarkText && {
          watermarkText: globalConfig.watermarkText,
          watermarkPosition: globalConfig.watermarkPosition,
          watermarkOpacity: globalConfig.watermarkOpacity,
        }),
        // 二创去重
        ...(Object.values(globalConfig.dedupConfig).some(Boolean) && {
          dedupConfig: globalConfig.dedupConfig,
        }),
        // Scheduled publishing
        ...(project.scheduledAt && { scheduledAt: project.scheduledAt }),
        // 矩阵发布
        ...(project.publishPlatforms?.length && { publishPlatforms: project.publishPlatforms }),
        // 贴纸 (合并所有镜头组的贴纸，转换为像素坐标)
        ...(() => {
          const allStickers = enabledGroups.flatMap((g) => g.stickers || []).filter((s) => s.url?.startsWith('http'));
          if (allStickers.length === 0) return {};
          const [w, h] = globalConfig.resolution.split('x').map(Number);
          const pw = w || 1080;
          const ph = h || 1920;
          return {
            stickers: allStickers.map((s) => ({
              url: s.url,
              x: Math.round(s.x * pw),
              y: Math.round(s.y * ph),
              width: Math.round(s.width * pw),
              height: Math.round(s.height * ph),
              ...(s.opacity !== undefined && { opacity: s.opacity }),
              ...(s.dyncFrames !== undefined && { dyncFrames: s.dyncFrames }),
            })),
          };
        })(),
      };

      const job = await mixcutApi.create(payload);
      setResult({ success: true, jobId: job.id });
      toast.success(previewOnly ? '预览任务已提交' : '混剪任务已提交');
    } catch (err: any) {
      setResult({ success: false, error: err.message || '提交失败' });
      toast.error(err?.message || '提交混剪任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="mixcut-preview-panel" className="space-y-4">
      {/* Output videos for completed jobs */}
      {(jobStatus === 'COMPLETED' || outputVideos.length > 0) && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle size={14} /> 混剪完成 · {outputVideos.length} 个视频
            </h3>
            {outputVideos.length > 1 && (
              <button
                onClick={handleBatchDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-[11px] font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                {downloading ? (
                  <><Loader2 size={10} className="animate-spin" /> {downloadProgress}%</>
                ) : (
                  <><Download size={10} /> 批量下载</>
                )}
              </button>
            )}
          </div>
          {downloading && (
            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-green-200">
              <div className="h-full rounded-full bg-green-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
            </div>
          )}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {outputVideos.map((v, i) => (
              <div
                key={v.mediaId || i}
                className="rounded-lg border bg-white p-2"
              >
                {playingIdx === i ? (
                  <video
                    src={v.mediaURL}
                    controls
                    autoPlay
                    className="w-full rounded-md"
                    style={{ maxHeight: 300 }}
                    onEnded={() => setPlayingIdx(null)}
                  />
                ) : (
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5 transition-colors"
                    onClick={() => setPlayingIdx(i)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                        <Film size={14} />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium">视频 {i + 1}</p>
                        {v.duration && (
                          <p className="text-[10px] text-muted-foreground">{Math.round(v.duration)}秒</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPlayingIdx(i); }}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-green-100 text-green-600 transition-colors"
                        title="播放"
                      >
                        <Play size={12} />
                      </button>
                      <a
                        href={v.mediaURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        title="新窗口打开"
                      >
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const a = document.createElement('a');
                          a.href = v.mediaURL;
                          a.download = `${project.name}_${i + 1}.mp4`;
                          a.target = '_blank';
                          a.rel = 'noopener';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        title="下载"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Eye size={14} /> 配置预览
        </h3>
        <p className="text-[10px] text-muted-foreground">查看配置效果</p>
      </div>

      {/* Phone preview frame */}
      <div className="mx-auto" style={{ maxWidth: (() => {
        const parts = globalConfig.aspectRatio.split(':').map(Number);
        if (parts.length === 2 && parts[0] > parts[1]) return '100%';
        if (parts.length === 2 && parts[0] === parts[1]) return '280px';
        return '200px';
      })() }}>
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-border bg-black"
          style={{
            aspectRatio: (() => {
              const parts = globalConfig.aspectRatio.split(':').map(Number);
              if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return `${parts[0]}/${parts[1]}`;
              return '9/16';
            })(),
          }}
        >
          {/* Preview placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <button className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
              <Play size={20} className="text-white ml-0.5" />
            </button>
            <p className="text-[11px] text-white/60">请点击查看</p>
            <p className="text-[10px] text-white/40">模拟效果</p>
          </div>

          {/* Watermark preview */}
          {globalConfig.watermarkText && (
            <div
              className="absolute pointer-events-none select-none"
              style={{
                ...watermarkPositionStyle[globalConfig.watermarkPosition],
                opacity: globalConfig.watermarkOpacity,
              }}
            >
              <span className="text-[10px] text-white/80 font-medium drop-shadow-md">
                {globalConfig.watermarkText}
              </span>
            </div>
          )}

          {/* Title preview */}
          {titleStyle.enabled && titleStyle.text && (
            <div
              className="absolute left-0 right-0 text-center pointer-events-none"
              style={{ top: `${titleStyle.y * 100}%` }}
            >
              <span
                className="drop-shadow-lg"
                style={{
                  fontSize: Math.max(8, titleStyle.fontSize / 5),
                  color: titleStyle.fontColor,
                  fontWeight: 'bold',
                }}
              >
                {titleStyle.text}
              </span>
            </div>
          )}

          {/* Subtitle preview */}
          {project.shotGroups.some((g) => g.subtitles.length > 0) && (
            <div
              className="absolute left-2 right-2 text-center pointer-events-none"
              style={{ top: `${subtitleStyle.y * 100}%` }}
            >
              <span
                className="inline-block rounded px-1"
                style={{
                  fontSize: Math.max(7, subtitleStyle.fontSize / 5),
                  color: subtitleStyle.fontColor,
                  fontWeight: subtitleStyle.bold ? 'bold' : 'normal',
                  fontStyle: subtitleStyle.italic ? 'italic' : 'normal',
                  textDecoration: subtitleStyle.underline ? 'underline' : 'none',
                  textShadow: subtitleStyle.outline > 0 ? `0 0 ${subtitleStyle.outline}px ${subtitleStyle.outlineColour}` : 'none',
                }}
              >
                {project.shotGroups.find((g) => g.subtitles.length > 0)?.subtitles[0]?.text?.slice(0, 20) || '字幕预览'}
              </span>
            </div>
          )}

          {/* Active effects badges */}
          {(globalConfig.transitionEnabled || globalConfig.filterEnabled || globalConfig.vfxEffectEnabled || Object.values(globalConfig.dedupConfig).some(Boolean)) && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {globalConfig.transitionEnabled && (
                <span className="rounded bg-blue-500/70 px-1 py-0.5 text-[8px] text-white">转场 {globalConfig.transitionList.length}</span>
              )}
              {globalConfig.filterEnabled && (
                <span className="rounded bg-amber-500/70 px-1 py-0.5 text-[8px] text-white">滤镜 {globalConfig.filterList.length}</span>
              )}
              {globalConfig.vfxEffectEnabled && (
                <span className="rounded bg-purple-500/70 px-1 py-0.5 text-[8px] text-white">特效</span>
              )}
              {Object.values(globalConfig.dedupConfig).some(Boolean) && (
                <span className="rounded bg-green-500/70 px-1 py-0.5 text-[8px] text-white">去重 {Object.values(globalConfig.dedupConfig).filter(Boolean).length}</span>
              )}
            </div>
          )}

          {/* Time indicator */}
          <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {formatTime(Math.round(totalDuration))}
          </div>
        </div>
      </div>

      {/* Preview notes */}
      <div className="rounded-lg border bg-muted/50 p-3 text-[10px] text-muted-foreground space-y-0.5">
        <p>预览播放低像素视频</p>
        <p>正式生成会产出高像素视频</p>
        <p>模拟效果不支持转场、滤镜、背景、封面</p>
        <p>以上效果仅会在最终成片应用</p>
        {globalConfig.watermarkText && (
          <p className="text-primary">水印: "{globalConfig.watermarkText}" ({{
            topLeft: '左上', topRight: '右上', bottomLeft: '左下', bottomRight: '右下'
          }[globalConfig.watermarkPosition]}，{Math.round(globalConfig.watermarkOpacity * 100)}%透明度)</p>
        )}
      </div>

      {/* Stats */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-muted-foreground">预估混剪视频总量</span>
          <span className="text-2xl font-bold text-primary tabular-nums">{estimatedCount}个</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">预估混剪单视频时长</span>
          <span className="text-lg font-semibold tabular-nums">{Math.round(totalDuration)}秒</span>
        </div>
      </div>

      {/* Cost estimate */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-medium">预估费用</span>
          <span className="text-xl font-bold text-primary tabular-nums">{estimatedCount * 20} 积分</span>
        </div>
        <p className="text-[10px] text-muted-foreground">20 积分/条 × {estimatedCount} 条</p>
      </div>

      {/* 定时发布 */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarClock size={13} className="text-muted-foreground" />
            <span className="text-[12px] font-medium">定时发布</span>
          </div>
          <button
            onClick={() => setScheduledAt(project.scheduledAt ? undefined : new Date(Date.now() + 3600000).toISOString().slice(0, 16))}
            className={`relative h-5 w-9 rounded-full transition-colors ${project.scheduledAt ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${project.scheduledAt ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {project.scheduledAt && (
          <div className="space-y-2">
            <input
              type="datetime-local"
              value={project.scheduledAt.slice(0, 16)}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-[9px] text-muted-foreground">视频生成完成后将在指定时间自动发布</p>
          </div>
        )}
      </div>

      {/* 矩阵发布 */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Share2 size={13} className="text-muted-foreground" />
            <span className="text-[12px] font-medium">矩阵发布</span>
          </div>
          {(project.publishPlatforms?.length || 0) > 0 && (
            <span className="text-[10px] text-primary font-medium">
              已选 {project.publishPlatforms?.length} 个平台
            </span>
          )}
        </div>
        <p className="mb-2 text-[9px] text-muted-foreground">选择目标平台，生成完成后一键分发到多个平台</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PUBLISH_PLATFORMS.map((p) => {
            const selected = project.publishPlatforms?.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => {
                  const current = project.publishPlatforms || [];
                  if (selected) {
                    setPublishPlatforms(current.filter((id) => id !== p.id));
                  } else {
                    setPublishPlatforms([...current, p.id]);
                  }
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] transition-all ${
                  selected
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                <span className="text-[14px]">{p.icon}</span>
                <span>{p.label}</span>
                {selected && (
                  <CheckCircle size={10} className="ml-auto text-primary" />
                )}
              </button>
            );
          })}
        </div>
        {(project.publishPlatforms?.length || 0) > 0 && (
          <p className="mt-2 text-[9px] text-amber-600">
            注意：需要先在「设置」中绑定对应平台账号
          </p>
        )}
      </div>

      {/* Quick preview button */}
      <button
        onClick={() => handleSubmit(true)}
        disabled={!canSubmit}
        className="w-full rounded-xl border-2 border-primary bg-primary/5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> 提交中...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Zap size={14} /> 快速预览（低消耗）
          </span>
        )}
      </button>

      {/* Submit button */}
      <button
        onClick={() => handleSubmit(false)}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> 提交中...
          </span>
        ) : project.scheduledAt ? (
          <span className="inline-flex items-center gap-2">
            <CalendarClock size={14} /> 定时混剪
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Film size={14} /> 开始智能混剪
          </span>
        )}
      </button>

      {hasEmptyGroups && (
        <p className="text-[10px] text-amber-600 text-center">存在空镜头组，请为所有镜头组添加素材</p>
      )}

      {/* Result feedback */}
      {result && (
        <div className={`rounded-lg border p-3 text-sm ${
          result.success
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {result.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} />
                <div>
                  <p className="font-medium">任务已提交</p>
                  <p className="text-[10px] opacity-80">任务ID: {result.jobId}</p>
                </div>
              </div>
              {/* Real-time progress */}
              {progress && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      {progress.status === 'COMPLETED' ? (
                        <CheckCircle size={12} />
                      ) : progress.status === 'FAILED' ? (
                        <AlertCircle size={12} className="text-red-500" />
                      ) : (
                        <RefreshCw size={12} className="animate-spin" />
                      )}
                      {progress.status === 'COMPLETED' ? '已完成' : progress.status === 'FAILED' ? '失败' : '处理中'}
                    </span>
                    <span className="tabular-nums">{progress.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-green-200">
                    <div
                      className="h-full rounded-full bg-green-600 transition-all duration-500"
                      style={{ width: `${progress.progress ?? 0}%` }}
                    />
                  </div>
                  {progress.message && (
                    <p className="text-[10px] opacity-70">{progress.message}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
