'use client';

import { useState } from 'react';
import { useDhV2Store } from './use-dh-v2-store';
import { Card } from './shared';
import { dhBatchV2Api } from '@/lib/api';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';

export function StepSubmit({
  voices,
  customAvatars,
  builtinAvatars,
  onResult,
}: {
  voices: any[];
  customAvatars: any[];
  builtinAvatars: any[];
  onResult: (job: any) => void;
}) {
  const store = useDhV2Store();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const voice = voices.find((v: any) => v.voiceId === store.selectedVoice);
  const avatarName = store.channel === 'A'
    ? builtinAvatars.find((a: any) => a.avatarId === store.selectedBuiltinAvatar)?.avatarName || '--'
    : customAvatars.find((a: any) => a.id === store.selectedAvatar)?.name || '--';

  const handleSubmit = async () => {
    if (!store.channel) { setError('请选择通道'); store.setStep('channel'); return; }
    if (!store.selectedVoice) { setError('请选择声音'); store.setStep('voice'); return; }
    if (store.channel === 'A' && !store.selectedBuiltinAvatar) { setError('请选择内置数字人'); store.setStep('avatar'); return; }
    if (store.channel === 'B' && !store.selectedAvatar) { setError('请选择自定义形象'); store.setStep('avatar'); return; }
    if (store.selectedScripts.length === 0) { setError('请选择至少一个脚本'); store.setStep('script'); return; }
    if (store.selectedMaterials.length === 0) { setError('请选择至少一个素材'); store.setStep('materials'); return; }

    setError('');
    setSubmitting(true);

    try {
      const payload: any = {
        channel: store.channel,
        voiceId: store.selectedVoice,
        scriptIds: store.selectedScripts,
        materialIds: store.selectedMaterials,
        videoCount: store.output.videoCount,
        resolution: store.output.resolution,
      };

      if (store.channel === 'A') {
        payload.builtinAvatarId = store.selectedBuiltinAvatar;
      } else {
        payload.avatarId = store.selectedAvatar;
      }

      if (store.bgMusic) payload.bgMusic = store.bgMusic;
      if (store.transitionId) payload.transitionId = store.transitionId;

      if (store.subtitle.open) {
        payload.subtitleConfig = {
          open: true,
          font: store.subtitle.font,
          fontSize: store.subtitle.fontSize,
          fontColor: store.subtitle.fontColor,
        };
      } else {
        payload.subtitleConfig = { open: false };
      }

      if (store.output.speechRate !== 0) payload.speechRate = store.output.speechRate;
      if (store.output.mediaVolume !== 1) payload.mediaVolume = store.output.mediaVolume;
      if (store.output.speechVolume !== 1) payload.speechVolume = store.output.speechVolume;
      if (store.output.bgMusicVolume !== 0.2) payload.bgMusicVolume = store.output.bgMusicVolume;
      if (store.output.maxDuration !== 120) payload.maxDuration = store.output.maxDuration;
      if (store.output.crf !== 27) payload.crf = store.output.crf;

      const job = await dhBatchV2Api.create(payload);
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
          <SummaryRow label="通道" value={store.channel === 'A' ? '通道 A — 内置数字人' : '通道 B — 自定义照片'} />
          <SummaryRow label="声音" value={voice?.name || '--'} />
          <SummaryRow label="形象" value={avatarName} />
          <SummaryRow label="脚本" value={`${store.selectedScripts.length} 个`} />
          <SummaryRow label="素材" value={`${store.selectedMaterials.length} 个`} />
          <SummaryRow label="字幕" value={store.subtitle.open ? '开启' : '关闭'} />
          <SummaryRow label="数量 × 分辨率" value={`${store.output.videoCount} 条 · ${store.output.resolution.replace('x', '×')}`} />
        </div>
      </Card>

      <div className="mt-4 max-w-xl rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-800">确认费用</span>
          <span className="text-2xl font-bold text-blue-900 tabular-nums">{store.output.videoCount * 20} 积分</span>
        </div>
        <p className="mt-1 text-xs text-blue-600">20 积分/条 × {store.output.videoCount} 条视频</p>
      </div>

      <div className="mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        交错混剪将生成 [数字人+口播] → [素材+旁白] → [数字人+口播] → ... 的交替画面结构。
        {store.channel === 'B' && ' 通道 B 需要额外时间进行 S2V 数字人视频渲染。'}
      </div>

      <div className="mt-6 flex items-center justify-between max-w-xl">
        <button
          onClick={() => store.setStep('config')}
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
            <><Rocket size={16} /> 开始交错混剪</>
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
