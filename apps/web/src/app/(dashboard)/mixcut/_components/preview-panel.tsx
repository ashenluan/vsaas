'use client';

import { useState } from 'react';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { mixcutApi } from '@/lib/api';
import { Eye, Play, Film, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function PreviewPanel() {
  const { project, subtitleStyle, titleStyle, globalConfig, highlightWords } = useMixcutStore();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; jobId?: string; error?: string } | null>(null);

  // Estimate total combinations
  const shotCombinations = project.shotGroups.reduce((acc, group) => {
    const materialCount = Math.max(group.materials.length, 1);
    return acc * materialCount;
  }, 1);

  const estimatedCount = Math.min(shotCombinations, 100);

  // Estimate per-video duration
  const totalDuration = project.shotGroups.reduce((acc, group) => {
    const groupDuration = group.materials.reduce((sum, m) => sum + (m.duration || 3), 0);
    return acc + (groupDuration > 0 ? groupDuration / Math.max(group.materials.length, 1) : 3);
  }, 0);

  // Check if ready to submit
  const hasEmptyGroups = project.shotGroups.some((g) => g.materials.length === 0);
  const canSubmit = project.shotGroups.length > 0 && !hasEmptyGroups && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    try {
      // Determine speech mode based on whether groups have individual speechTexts
      const hasGroupSpeech = project.shotGroups.some((g) => g.subtitles.length > 0);
      const globalSpeechTexts = project.shotGroups
        .flatMap((g) => g.subtitles.map((s) => s.text))
        .filter(Boolean);

      const payload = {
        name: project.name,
        shotGroups: project.shotGroups.map((g) => ({
          name: g.name,
          materialUrls: g.materials.map((m) => m.url),
          ...(g.subtitles.length > 0 && {
            speechTexts: g.subtitles.map((s) => s.text).filter(Boolean),
          }),
          keepOriginalAudio: g.keepOriginalAudio,
        })),
        speechMode: hasGroupSpeech ? 'group' as const : undefined,
        videoCount: estimatedCount,
        resolution: globalConfig.resolution,
        // Background music
        ...(globalConfig.bgMusic && { bgMusic: globalConfig.bgMusic }),
        ...(globalConfig.bgMusicVolume !== 0.2 && { bgMusicVolume: globalConfig.bgMusicVolume }),
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
        // Transition
        ...(globalConfig.transitionEnabled && {
          transitionEnabled: true,
          transitionDuration: globalConfig.transitionDuration,
          transitionList: globalConfig.transitionList,
        }),
        // Filter
        ...(globalConfig.filterEnabled && {
          filterEnabled: true,
          filterList: globalConfig.filterList,
        }),
        // Background
        ...(globalConfig.bgType !== 'none' && { bgType: globalConfig.bgType }),
        ...(globalConfig.bgType === 'color' && { bgColor: globalConfig.bgColor }),
      };

      const job = await mixcutApi.create(payload);
      setResult({ success: true, jobId: job.id });
    } catch (err: any) {
      setResult({ success: false, error: err.message || '提交失败' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Eye size={14} /> 配置预览
        </h3>
        <p className="text-[10px] text-muted-foreground">查看配置效果</p>
      </div>

      {/* Phone preview frame */}
      <div className="mx-auto" style={{ maxWidth: globalConfig.aspectRatio === '16:9' ? '100%' : globalConfig.aspectRatio === '1:1' ? '280px' : '200px' }}>
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-border bg-black"
          style={{
            aspectRatio: globalConfig.aspectRatio === '9:16' ? '9/16' : globalConfig.aspectRatio === '16:9' ? '16/9' : '1/1',
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

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> 提交中...
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
            <div className="flex items-center gap-2">
              <CheckCircle size={14} />
              <div>
                <p className="font-medium">任务已提交</p>
                <p className="text-[10px] opacity-80">任务ID: {result.jobId}</p>
              </div>
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
