'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer, Card, Toggle, Slider, ChipSelect } from './shared';
import { Sparkles, ArrowRightLeft, Palette } from 'lucide-react';

// Category keys come from the API in Chinese — use as-is for display
// No mapping needed since the API already returns Chinese category names

export function StepEffects({ options }: { options: any }) {
  const { effects, updateEffects, transition, updateTransition, filter, updateFilter } = useComposeStore();

  const effectsData = options?.effects || {};
  const transitionsData = options?.transitions || [];
  const filtersData = options?.filters || {};

  return (
    <StepContainer title="特效 · 转场 · 滤镜" description="为混剪视频添加视觉效果，让作品更具表现力">
      <div className="space-y-5">
        {/* ========== 特效 ========== */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Sparkles size={16} />
            </div>
            <div className="flex-1">
              <Toggle checked={effects.allowEffects} onChange={(v) => updateEffects({ allowEffects: v })} label="视频特效" />
            </div>
          </div>

          {effects.allowEffects && (
            <div className="space-y-4 pl-11">
              <Slider
                value={effects.vfxEffectProbability}
                onChange={(v) => updateEffects({ vfxEffectProbability: v })}
                min={0} max={1} step={0.1}
                label="特效应用概率"
                format={(v) => `${(v * 100).toFixed(0)}%`}
              />

              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">首片段特效</label>
                <p className="mb-1.5 text-[10px] text-muted-foreground">视频开头的片段效果，建议选择展示性强的效果</p>
                <div className="max-h-52 space-y-2.5 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(effectsData).map(([category, items]) => (
                    <div key={category}>
                      <span className="mb-1 block text-[10px] font-medium text-primary/70">{category}</span>
                      <div className="flex flex-wrap gap-1">
                        {(items as { id: string; label: string }[]).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => {
                              const list = effects.vfxFirstClipEffectList.includes(e.id)
                                ? effects.vfxFirstClipEffectList.filter((x) => x !== e.id)
                                : [...effects.vfxFirstClipEffectList, e.id];
                              updateEffects({ vfxFirstClipEffectList: list });
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                              effects.vfxFirstClipEffectList.includes(e.id)
                                ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                : 'border-input hover:bg-accent'
                            }`}
                          >
                            {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">其他片段特效</label>
                <p className="mb-1.5 text-[10px] text-muted-foreground">非首个片段使用的效果，建议选择轻柔的运镜效果</p>
                <div className="max-h-52 space-y-2.5 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(effectsData).map(([category, items]) => (
                    <div key={category}>
                      <span className="mb-1 block text-[10px] font-medium text-primary/70">{category}</span>
                      <div className="flex flex-wrap gap-1">
                        {(items as { id: string; label: string }[]).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => {
                              const list = effects.vfxNotFirstClipEffectList.includes(e.id)
                                ? effects.vfxNotFirstClipEffectList.filter((x) => x !== e.id)
                                : [...effects.vfxNotFirstClipEffectList, e.id];
                              updateEffects({ vfxNotFirstClipEffectList: list });
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                              effects.vfxNotFirstClipEffectList.includes(e.id)
                                ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                : 'border-input hover:bg-accent'
                            }`}
                          >
                            {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ========== 转场 ========== */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <ArrowRightLeft size={16} />
            </div>
            <div className="flex-1">
              <Toggle checked={transition.allowTransition} onChange={(v) => updateTransition({ allowTransition: v })} label="转场效果" />
            </div>
          </div>

          {transition.allowTransition && (
            <div className="space-y-4 pl-11">
              <div className="flex items-center gap-4">
                <Slider
                  value={transition.transitionDuration}
                  onChange={(v) => updateTransition({ transitionDuration: v })}
                  min={0.1} max={3} step={0.1}
                  label="转场时长"
                  format={(v) => `${v.toFixed(1)}s`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={transition.useUniformTransition}
                  onChange={(e) => updateTransition({ useUniformTransition: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-xs text-muted-foreground">统一使用同一种转场（否则随机选用）</span>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  选择转场效果（留空则随机 · 共 {transitionsData.length} 种）
                </label>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto rounded-lg border p-3">
                  {transitionsData.map((t: any) => {
                    const tid = typeof t === 'string' ? t : t.id;
                    const tlabel = typeof t === 'string' ? t : (t.label || t.id);
                    return (
                      <button
                        key={tid}
                        onClick={() => {
                          const list = transition.transitionList.includes(tid)
                            ? transition.transitionList.filter((x: string) => x !== tid)
                            : [...transition.transitionList, tid];
                          updateTransition({ transitionList: list });
                        }}
                        className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                          transition.transitionList.includes(tid)
                            ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                            : 'border-input hover:bg-accent'
                        }`}
                      >
                        {tlabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ========== 滤镜 ========== */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Palette size={16} />
            </div>
            <div className="flex-1">
              <Toggle checked={filter.allowFilter} onChange={(v) => updateFilter({ allowFilter: v })} label="滤镜效果" />
            </div>
          </div>

          {filter.allowFilter && (
            <div className="pl-11">
              <label className="mb-2 block text-xs font-medium text-muted-foreground">选择滤镜（留空则随机）</label>
              <div className="max-h-56 space-y-2.5 overflow-y-auto rounded-lg border p-3">
                {Object.entries(filtersData).map(([category, items]) => (
                  <div key={category}>
                    <span className="mb-1 block text-[10px] font-medium text-amber-600">{category}</span>
                    <div className="flex flex-wrap gap-1">
                      {(items as { id: string; label: string }[]).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            const list = filter.filterList.includes(f.id)
                              ? filter.filterList.filter((x) => x !== f.id)
                              : [...filter.filterList, f.id];
                            updateFilter({ filterList: list });
                          }}
                          className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                            filter.filterList.includes(f.id)
                              ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                              : 'border-input hover:bg-accent'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </StepContainer>
  );
}
