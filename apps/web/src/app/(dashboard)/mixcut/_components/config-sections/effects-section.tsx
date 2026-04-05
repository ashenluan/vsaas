'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { Sparkles, Check } from 'lucide-react';
import { getPreviewUrl } from '../../_lib/effect-previews';
import { ConfigSection, ToggleSwitch } from './shared';

export function EffectsSection({ options }: { options: any }) {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  const effectsData: Record<string, { id: string; label: string }[]> = {
    ...(options?.effects || {}),
    ...(options?.advancedEffects || {}),
  };
  const allEffects = Object.values(effectsData).flat();
  const effectCategoryNames = Object.keys(effectsData);
  const [effectCategoryTab, setEffectCategoryTab] = useState(0);
  const [effectSection, setEffectSection] = useState<'first' | 'rest'>('first');

  const handleSmartMatchEffects = () => {
    if (allEffects.length === 0) return;
    const shuffled1 = [...allEffects].sort(() => Math.random() - 0.5);
    const shuffled2 = [...allEffects].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ vfxEffectEnabled: true, vfxFirstClipEffectList: shuffled1.slice(0, 3).map((e) => e.id), vfxNotFirstClipEffectList: shuffled2.slice(0, 5).map((e) => e.id), vfxEffectProbability: 50 });
  };

  return (
    <ConfigSection icon={Sparkles} label="特效设置">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground">启用特效</span>
        <ToggleSwitch
          checked={globalConfig.vfxEffectEnabled}
          onChange={(v) => updateGlobalConfig({ vfxEffectEnabled: v })}
        />
      </div>
      {globalConfig.vfxEffectEnabled && (
        <>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">特效出现概率</label>
              <span className="text-[10px] tabular-nums font-medium">{globalConfig.vfxEffectProbability}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={globalConfig.vfxEffectProbability}
              onChange={(e) => updateGlobalConfig({ vfxEffectProbability: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* First / Rest clip toggle */}
          <div className="mb-2 flex rounded-lg border bg-muted/30 p-0.5">
            <button
              onClick={() => setEffectSection('first')}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                effectSection === 'first'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              首片段特效
            </button>
            <button
              onClick={() => setEffectSection('rest')}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                effectSection === 'rest'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              其余片段特效
            </button>
          </div>
          <p className="mb-2 text-[9px] text-muted-foreground">
            {effectSection === 'first' ? '仅应用于视频第一个片段' : '应用于除首片段外的所有片段'}
          </p>

          {/* Category tabs */}
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {effectCategoryNames.map((name, idx) => {
              const list = effectSection === 'first' ? globalConfig.vfxFirstClipEffectList : globalConfig.vfxNotFirstClipEffectList;
              const catItems = effectsData[name] || [];
              const selectedCount = catItems.filter((e) => list.includes(e.id)).length;
              const isFirst = effectSection === 'first';
              return (
                <button
                  key={name}
                  onClick={() => setEffectCategoryTab(idx)}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[10px] transition-all ${
                    effectCategoryTab === idx
                      ? isFirst
                        ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                        : 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {name}
                  <span className="ml-0.5 text-[9px] opacity-60">{selectedCount || ''}</span>
                </button>
              );
            })}
          </div>

          {/* Select all for current category */}
          {effectCategoryNames[effectCategoryTab] && (() => {
            const list = effectSection === 'first' ? globalConfig.vfxFirstClipEffectList : globalConfig.vfxNotFirstClipEffectList;
            const listKey = effectSection === 'first' ? 'vfxFirstClipEffectList' : 'vfxNotFirstClipEffectList';
            const catItems = effectsData[effectCategoryNames[effectCategoryTab]] || [];
            const catIds = catItems.map((e) => e.id);
            const allSelected = catIds.length > 0 && catIds.every((id) => list.includes(id));
            return (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {catItems.filter((e) => list.includes(e.id)).length}/{catItems.length} 已选
                </span>
                <button
                  onClick={() => {
                    if (allSelected) {
                      updateGlobalConfig({ [listKey]: list.filter((id) => !catIds.includes(id)) });
                    } else {
                      updateGlobalConfig({ [listKey]: [...new Set([...list, ...catIds])] });
                    }
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  {allSelected ? '取消全选' : '全选'}
                </button>
              </div>
            );
          })()}

          {/* Effect grid */}
          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {(effectsData[effectCategoryNames[effectCategoryTab]] || []).map((eff) => {
              const list = effectSection === 'first' ? globalConfig.vfxFirstClipEffectList : globalConfig.vfxNotFirstClipEffectList;
              const listKey = effectSection === 'first' ? 'vfxFirstClipEffectList' : 'vfxNotFirstClipEffectList';
              const selected = list.includes(eff.id);
              const isFirst = effectSection === 'first';
              return (
                <button
                  key={eff.id}
                  onClick={() => {
                    const updated = selected
                      ? list.filter((x) => x !== eff.id)
                      : [...list, eff.id];
                    updateGlobalConfig({ [listKey]: updated });
                  }}
                  className={`relative flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition-all ${
                    selected
                      ? isFirst
                        ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-300'
                        : 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                      : isFirst
                        ? 'border-input hover:border-purple-300 hover:bg-accent'
                        : 'border-input hover:border-indigo-300 hover:bg-accent'
                  }`}
                >
                  {getPreviewUrl(eff.id) ? (
                    <div className="h-10 w-full overflow-hidden rounded">
                      <img src={getPreviewUrl(eff.id)} alt={eff.label} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                      selected
                        ? isFirst ? 'from-purple-100 to-purple-200' : 'from-indigo-100 to-indigo-200'
                        : 'from-muted to-muted/60'
                    }`}>
                      <Sparkles size={12} className={selected ? (isFirst ? 'text-purple-600' : 'text-indigo-600') : 'text-muted-foreground/50'} />
                    </div>
                  )}
                  <span className={`text-[9px] leading-tight text-center line-clamp-1 ${
                    selected ? (isFirst ? 'text-purple-700 font-medium' : 'text-indigo-700 font-medium') : 'text-muted-foreground'
                  }`}>
                    {eff.label}
                  </span>
                  {selected && (
                    <div className={`absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ${isFirst ? 'bg-purple-500' : 'bg-indigo-500'}`}>
                      <Check size={8} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
      {(globalConfig.vfxFirstClipEffectList.length > 0 || globalConfig.vfxNotFirstClipEffectList.length > 0) && (
        <div className="mt-2 rounded-md border border-purple-200 bg-purple-50/50 px-2 py-1.5">
          <p className="text-[10px] text-purple-700">
            首片段 {globalConfig.vfxFirstClipEffectList.length} 个 · 其余片段 {globalConfig.vfxNotFirstClipEffectList.length} 个
          </p>
          <p className="text-[9px] text-purple-500">特效出现概率 {globalConfig.vfxEffectProbability}%，为视频增添动态视觉效果</p>
        </div>
      )}
      <button onClick={handleSmartMatchEffects} className="mt-1.5 w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
        智能匹配特效
      </button>
    </ConfigSection>
  );
}
