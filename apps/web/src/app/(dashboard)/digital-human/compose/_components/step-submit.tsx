'use client';

import { useState } from 'react';
import { useComposeStore } from './use-compose-store';
import { Card } from './shared';
import { composeApi } from '@/lib/api';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';

export function StepSubmit({
  voices,
  avatars,
  onResult,
}: {
  voices: any[];
  avatars: any[];
  onResult: (job: any) => void;
}) {
  const store = useComposeStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const voice = voices.find((v: any) => v.voiceId === store.selectedVoice);
  const avatar = avatars.find((a: any) => a.id === store.selectedAvatar);

  const handleSubmit = async () => {
    if (!store.selectedVoice) { setError('请选择声音'); store.setStep('voice'); return; }
    if (!store.selectedAvatar) { setError('请选择形象'); store.setStep('avatar'); return; }
    if (store.selectedScripts.length === 0) { setError('请选择至少一个脚本'); store.setStep('script'); return; }

    setError('');
    setSubmitting(true);

    try {
      const payload: any = {
        voiceId: store.selectedVoice,
        avatarId: store.selectedAvatar,
        scriptIds: store.selectedScripts,
        materialIds: store.selectedMaterials.length > 0 ? store.selectedMaterials : undefined,
        bgMusic: store.bgMusic || undefined,
        videoCount: store.output.videoCount,
        resolution: store.output.resolution,
      };

      // 字幕
      if (store.subtitle.enabled) {
        payload.subtitleConfig = {
          font: store.subtitle.font,
          fontSize: store.subtitle.fontSize,
          fontColor: store.subtitle.fontColor,
          fontColorOpacity: store.subtitle.fontColorOpacity,
          alignment: store.subtitle.alignment,
          y: store.subtitle.y,
          adaptMode: store.subtitle.adaptMode,
          outline: store.subtitle.outline,
          outlineColour: store.subtitle.outlineColour,
          ...(store.subtitle.bold && { bold: true }),
          ...(store.subtitle.italic && { italic: true }),
          ...(store.subtitle.underline && { underline: true }),
          ...(store.subtitle.effectColorStyleId && { effectColorStyleId: store.subtitle.effectColorStyleId }),
          ...(store.subtitle.bubbleStyleId && { bubbleStyleId: store.subtitle.bubbleStyleId }),
          ...(store.subtitle.textWidth && { textWidth: store.subtitle.textWidth }),
        };
      }

      // 标题
      if (store.title.enabled && store.title.titles.filter(Boolean).length > 0) {
        payload.titleConfig = {
          titles: store.title.titles.filter(Boolean),
          font: store.title.font,
          fontSize: store.title.fontSize,
          fontColor: store.title.fontColor,
          alignment: store.title.alignment,
          y: store.title.y,
          ...(store.title.effectColorStyleId && { effectColorStyleId: store.title.effectColorStyleId }),
        };
      }

      // 特效
      if (store.effects.allowEffects) {
        payload.effectsConfig = {
          allowEffects: true,
          vfxEffectProbability: store.effects.vfxEffectProbability,
          ...(store.effects.vfxFirstClipEffectList.length > 0 && { vfxFirstClipEffectList: store.effects.vfxFirstClipEffectList }),
          ...(store.effects.vfxNotFirstClipEffectList.length > 0 && { vfxNotFirstClipEffectList: store.effects.vfxNotFirstClipEffectList }),
        };
      }

      // 转场
      if (store.transition.allowTransition) {
        payload.transitionConfig = {
          allowTransition: true,
          transitionDuration: store.transition.transitionDuration,
          useUniformTransition: store.transition.useUniformTransition,
          ...(store.transition.transitionList.length > 0 && { transitionList: store.transition.transitionList }),
        };
      }

      // 滤镜
      if (store.filter.allowFilter) {
        payload.filterConfig = {
          allowFilter: true,
          ...(store.filter.filterList.length > 0 && { filterList: store.filter.filterList }),
        };
      }

      // 关键词高亮
      const validHighlightWords = store.highlightWords.filter((hw) => hw.word.trim());
      if (validHighlightWords.length > 0) {
        payload.highlightWords = validHighlightWords;
      }

      // 违禁词消音
      const validForbiddenWords = store.forbiddenWords.filter((fw: any) => fw.word.trim());
      if (validForbiddenWords.length > 0) {
        payload.forbiddenWords = validForbiddenWords;
      }

      // 背景配置
      if (store.background.type !== 'none') {
        payload.bgType = store.background.type;
        if (store.background.type === 'color') payload.bgColor = store.background.color;
        if (store.background.type === 'blur') payload.bgBlurRadius = store.background.blurRadius;
        if (store.background.type === 'image' && store.background.imageUrls.length > 0) {
          payload.bgImage = store.background.imageUrls[0];
        }
      }

      // 贴纸
      if (store.stickers.length > 0) {
        payload.stickers = store.stickers.map((s: any) => ({
          url: s.url, x: s.x, y: s.y, width: s.width, height: s.height,
          ...(s.opacity !== undefined && s.opacity !== 1 && { opacity: s.opacity }),
        }));
      }

      // 高级输出参数
      if (store.output.maxDuration !== 60) payload.maxDuration = store.output.maxDuration;
      if (store.output.crf !== 27) payload.crf = store.output.crf;
      if (store.output.speechRate !== 0) payload.speechRate = store.output.speechRate;
      if (store.output.mediaVolume !== 1) payload.mediaVolume = store.output.mediaVolume;
      if (store.output.speechVolume !== 1) payload.speechVolume = store.output.speechVolume;
      if (store.output.bgMusicVolume !== 0.2) payload.bgMusicVolume = store.output.bgMusicVolume;

      const job = await composeApi.create(payload);
      store.reset();
      onResult(job);
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
      <h2 className="mb-1 text-lg font-semibold">确认提交</h2>
      <p className="mb-5 text-sm text-muted-foreground">请确认以下信息无误后提交任务</p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <Card className="max-w-xl">
        <div className="space-y-3 text-sm">
          <SummaryRow label="声音" value={voice?.name || '--'} />
          <SummaryRow label="形象" value={avatar?.name || '--'} />
          <SummaryRow label="脚本" value={`${store.selectedScripts.length} 个`} />
          <SummaryRow label="混剪素材" value={store.selectedMaterials.length > 0 ? `${store.selectedMaterials.length} 个` : '无'} />
          <SummaryRow label="字幕" value={store.subtitle.enabled ? '开启' : '关闭'} />
          <SummaryRow label="标题叠加" value={store.title.enabled ? `${store.title.titles.filter(Boolean).length} 条` : '关闭'} />
          <SummaryRow label="特效" value={store.effects.allowEffects ? '开启' : '关闭'} />
          <SummaryRow label="转场" value={store.transition.allowTransition ? '开启' : '关闭'} />
          <SummaryRow label="滤镜" value={store.filter.allowFilter ? '开启' : '关闭'} />
          <SummaryRow label="数量 × 分辨率" value={`${store.output.videoCount} 条 · ${store.output.resolution.replace('x', '×')}`} />
        </div>
      </Card>

      {/* 费用确认 */}
      <div className="mt-4 max-w-xl rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-800">确认费用</span>
          <span className="text-2xl font-bold text-blue-900 tabular-nums">{store.output.videoCount * 20} 积分</span>
        </div>
        <p className="mt-1 text-xs text-blue-600">20 积分/条 × {store.output.videoCount} 条视频</p>
      </div>

      <div className="mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        混剪将保持数字人人声、口型、字幕的一致性。使用克隆声音进行口播合成，通过 ASR 自动生成字幕并与音频对齐。
      </div>

      {/* 按钮 */}
      <div className="mt-6 flex items-center justify-between max-w-xl">
        <button
          onClick={() => store.setStep('preview')}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm font-medium hover:bg-accent transition-colors"
        >
          ← 上一步
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> 提交中...</>
          ) : (
            <><Rocket size={16} /> 开始批量生成</>
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
