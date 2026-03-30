'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer, Card, Toggle, Slider, ChipSelect } from './shared';
import { Sparkles, ArrowRightLeft, Palette } from 'lucide-react';

const EFFECT_CATEGORY_LABELS: Record<string, string> = {
  basic: '基础', atmosphere: '氛围', dynamic: '动感', light: '光影',
  retro: '复古', dreamy: '梦幻', nature: '自然', splitScreen: '分屏',
  color: '色彩', deform: '变形',
};

const FILTER_CATEGORY_LABELS: Record<string, string> = {
  modern90s: '90年代', film: '胶片', infrared: '红外', fresh: '清新',
  japanese: '日系', unsplash: '风光', negative80s: '80年代', travel: '旅行', art90s: '艺术',
};

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
                      <span className="mb-1 block text-[10px] font-medium text-primary/70">{EFFECT_CATEGORY_LABELS[category] || category}</span>
                      <div className="flex flex-wrap gap-1">
                        {(items as string[]).map((e) => (
                          <button
                            key={e}
                            onClick={() => {
                              const list = effects.vfxFirstClipEffectList.includes(e)
                                ? effects.vfxFirstClipEffectList.filter((x) => x !== e)
                                : [...effects.vfxFirstClipEffectList, e];
                              updateEffects({ vfxFirstClipEffectList: list });
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                              effects.vfxFirstClipEffectList.includes(e)
                                ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                : 'border-input hover:bg-accent'
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
                <label className="mb-2 block text-xs font-medium text-muted-foreground">其他片段特效</label>
                <p className="mb-1.5 text-[10px] text-muted-foreground">非首个片段使用的效果，建议选择轻柔的运镜效果</p>
                <div className="max-h-52 space-y-2.5 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(effectsData).map(([category, items]) => (
                    <div key={category}>
                      <span className="mb-1 block text-[10px] font-medium text-primary/70">{EFFECT_CATEGORY_LABELS[category] || category}</span>
                      <div className="flex flex-wrap gap-1">
                        {(items as string[]).map((e) => (
                          <button
                            key={e}
                            onClick={() => {
                              const list = effects.vfxNotFirstClipEffectList.includes(e)
                                ? effects.vfxNotFirstClipEffectList.filter((x) => x !== e)
                                : [...effects.vfxNotFirstClipEffectList, e];
                              updateEffects({ vfxNotFirstClipEffectList: list });
                            }}
                            className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                              effects.vfxNotFirstClipEffectList.includes(e)
                                ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                : 'border-input hover:bg-accent'
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
                  {transitionsData.map((t: string) => (
                    <button
                      key={t}
                      onClick={() => {
                        const list = transition.transitionList.includes(t)
                          ? transition.transitionList.filter((x) => x !== t)
                          : [...transition.transitionList, t];
                        updateTransition({ transitionList: list });
                      }}
                      className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                        transition.transitionList.includes(t)
                          ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
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
                    <span className="mb-1 block text-[10px] font-medium text-amber-600">{FILTER_CATEGORY_LABELS[category] || category}</span>
                    <div className="flex flex-wrap gap-1">
                      {(items as string[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            const list = filter.filterList.includes(f)
                              ? filter.filterList.filter((x) => x !== f)
                              : [...filter.filterList, f];
                            updateFilter({ filterList: list });
                          }}
                          className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                            filter.filterList.includes(f)
                              ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                              : 'border-input hover:bg-accent'
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
        </Card>
      </div>
    </StepContainer>
  );
}
