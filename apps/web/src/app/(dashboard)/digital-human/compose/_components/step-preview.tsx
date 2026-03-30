'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer, Card } from './shared';
import { Eye, CheckCircle2, AlertCircle } from 'lucide-react';

export function StepPreview({ voices, avatars, scripts }: { voices: any[]; avatars: any[]; scripts: any[] }) {
  const store = useComposeStore();

  const voice = voices.find((v: any) => v.voiceId === store.selectedVoice);
  const avatar = avatars.find((a: any) => a.id === store.selectedAvatar);
  const selectedScriptObjs = scripts.filter((s: any) => store.selectedScripts.includes(s.id));

  const issues: string[] = [];
  if (!store.selectedVoice) issues.push('未选择声音');
  if (!store.selectedAvatar) issues.push('未选择形象');
  if (store.selectedScripts.length === 0) issues.push('未选择脚本');

  return (
    <StepContainer title="效果预览" description="确认配置概览，检查是否有遗漏">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* 数字人预览 */}
        <Card className="xl:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Eye size={14} /> 数字人预览
          </h3>
          <div className="space-y-3">
            {avatar?.url ? (
              <div className="overflow-hidden rounded-lg border">
                <img src={avatar.url} alt={avatar.name} className="aspect-[3/4] w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-muted-foreground">未选择形象</div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium">{avatar?.name || '---'}</p>
              <p className="text-xs text-muted-foreground">声音: {voice?.name || '---'}</p>
            </div>
          </div>
        </Card>

        {/* 配置总览 */}
        <Card className="xl:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">配置总览</h3>

          {issues.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              {issues.map((issue) => (
                <div key={issue} className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={12} /> {issue}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2.5 text-sm">
            <Row label="脚本" value={`${selectedScriptObjs.length} 个`} detail={selectedScriptObjs.map((s: any) => s.title).join('、')} />
            <Row label="混剪素材" value={store.selectedMaterials.length > 0 ? `${store.selectedMaterials.length} 个` : '无'} />
            <Row label="背景音乐" value={store.bgMusic ? '已设置' : '无'} />
            <div className="border-t pt-2" />
            <Row label="字幕" value={store.subtitle.enabled ? `${store.subtitle.font.split(' ').pop()} ${store.subtitle.fontSize}px` : '关闭'} />
            {store.subtitle.enabled && store.subtitle.effectColorStyleId && (
              <Row label="花字样式" value={store.subtitle.effectColorStyleId} />
            )}
            <Row label="视频标题" value={store.title.enabled ? `${store.title.titles.filter(Boolean).length} 条` : '关闭'} />
            <Row label="关键词高亮" value={store.highlightWords.length > 0 ? `${store.highlightWords.length} 个` : '无'} />
            <div className="border-t pt-2" />
            <Row label="特效" value={store.effects.allowEffects ? `开启 (${(store.effects.vfxEffectProbability * 100).toFixed(0)}%)` : '关闭'} />
            <Row label="转场" value={store.transition.allowTransition ? `开启 (${store.transition.transitionDuration}s)` : '关闭'} />
            <Row label="滤镜" value={store.filter.allowFilter ? `开启 (${store.filter.filterList.length || '随机'})` : '关闭'} />
            <div className="border-t pt-2" />
            <Row label="生成数量" value={`${store.output.videoCount} 条`} />
            <Row label="分辨率" value={store.output.resolution.replace('x', '×')} />
            <Row label="最大时长" value={`${store.output.maxDuration}s`} />
            <Row label="视频质量" value={`CRF ${store.output.crf}`} />
            <Row label="语速调整" value={store.output.speechRate === 0 ? '正常' : `${store.output.speechRate}`} />
          </div>

          {/* 费用 */}
          <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">预估费用</span>
              <span className="text-xl font-bold text-primary tabular-nums">{store.output.videoCount * 20} 积分</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">20 积分/条 × {store.output.videoCount} 条</p>
          </div>
        </Card>
      </div>
    </StepContainer>
  );
}

function Row({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      {detail && <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{detail}</p>}
    </div>
  );
}
