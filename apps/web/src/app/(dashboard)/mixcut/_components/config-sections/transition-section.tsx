'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { ArrowRightLeft, Check } from 'lucide-react';
import { getPreviewUrl } from '../../_lib/effect-previews';
import { ConfigSection, ToggleSwitch } from './shared';

export function TransitionSection({ options }: { options: any }) {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  const transitionsData: { id: string; label: string }[] = options?.transitions || [];
  const advancedTransitionsData: { id: string; label: string }[] = options?.advancedTransitions || [];
  const allTransitions = [...transitionsData, ...advancedTransitionsData];
  const transitionCategories = [
    { name: '基础转场', items: transitionsData },
    ...(advancedTransitionsData.length > 0 ? [{ name: '高级转场', items: advancedTransitionsData }] : []),
  ];

  const [transitionTab, setTransitionTab] = useState<'smart' | 'custom'>('custom');
  const [transitionCategoryTab, setTransitionCategoryTab] = useState(0);

  const handleSmartMatchTransitions = () => {
    if (allTransitions.length === 0) return;
    const count = Math.min(allTransitions.length, Math.max(5, Math.floor(Math.random() * 4) + 4));
    const shuffled = [...allTransitions].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ transitionEnabled: true, transitionList: shuffled.slice(0, count).map((t) => t.id) });
  };

  return (
    <ConfigSection icon={ArrowRightLeft} label="转场设置">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground">启用转场</span>
        <ToggleSwitch
          checked={globalConfig.transitionEnabled}
          onChange={(v) => updateGlobalConfig({ transitionEnabled: v })}
        />
      </div>
      {globalConfig.transitionEnabled && (
        <>
          {/* Smart / Custom tabs */}
          <div className="mb-2 flex rounded-lg border bg-muted/30 p-0.5">
            <button
              onClick={() => {
                setTransitionTab('smart');
                handleSmartMatchTransitions();
              }}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                transitionTab === 'smart'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              智能匹配
            </button>
            <button
              onClick={() => setTransitionTab('custom')}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                transitionTab === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              自定义
            </button>
          </div>

          {transitionTab === 'custom' && (
            <>
              {/* Category tabs */}
              <div className="mb-2 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {transitionCategories.map((cat, idx) => (
                  <button
                    key={cat.name}
                    onClick={() => setTransitionCategoryTab(idx)}
                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] transition-all ${
                      transitionCategoryTab === idx
                        ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    {cat.name}
                    <span className="ml-0.5 text-[9px] opacity-60">
                      {cat.items.filter((t) => globalConfig.transitionList.includes(t.id)).length || ''}
                    </span>
                  </button>
                ))}
              </div>

              {/* Select all for current category */}
              {transitionCategories[transitionCategoryTab] && (
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {transitionCategories[transitionCategoryTab].items.filter((t) => globalConfig.transitionList.includes(t.id)).length}
                    /{transitionCategories[transitionCategoryTab].items.length} 已选
                  </span>
                  <button
                    onClick={() => {
                      const catItems = transitionCategories[transitionCategoryTab].items;
                      const catIds = catItems.map((t) => t.id);
                      const allSelected = catIds.every((id) => globalConfig.transitionList.includes(id));
                      if (allSelected) {
                        updateGlobalConfig({ transitionList: globalConfig.transitionList.filter((id) => !catIds.includes(id)) });
                      } else {
                        const merged = [...new Set([...globalConfig.transitionList, ...catIds])];
                        updateGlobalConfig({ transitionList: merged });
                      }
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {transitionCategories[transitionCategoryTab].items.every((t) => globalConfig.transitionList.includes(t.id)) ? '取消全选' : '全选'}
                  </button>
                </div>
              )}

              {/* Transition grid */}
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                {(transitionCategories[transitionCategoryTab]?.items || []).map((t) => {
                  const selected = globalConfig.transitionList.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        const list = selected
                          ? globalConfig.transitionList.filter((x) => x !== t.id)
                          : [...globalConfig.transitionList, t.id];
                        updateGlobalConfig({ transitionList: list });
                      }}
                      className={`relative flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition-all ${
                        selected
                          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                          : 'border-input hover:border-blue-300 hover:bg-accent'
                      }`}
                    >
                      {getPreviewUrl(t.id) ? (
                        <div className="h-10 w-full overflow-hidden rounded">
                          <img src={getPreviewUrl(t.id)} alt={t.label} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                          selected ? 'from-blue-100 to-blue-200' : 'from-muted to-muted/60'
                        }`}>
                          <ArrowRightLeft size={12} className={selected ? 'text-blue-600' : 'text-muted-foreground/50'} />
                        </div>
                      )}
                      <span className={`text-[9px] leading-tight text-center line-clamp-1 ${
                        selected ? 'text-blue-700 font-medium' : 'text-muted-foreground'
                      }`}>
                        {t.label}
                      </span>
                      {selected && (
                        <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500">
                          <Check size={8} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {transitionTab === 'smart' && (
            <div className="rounded-lg border bg-blue-50/50 p-3 text-center">
              <p className="text-[11px] text-blue-700 font-medium mb-1">已智能匹配 {globalConfig.transitionList.length} 个转场</p>
              <p className="text-[9px] text-blue-500">系统根据视频内容自动推荐最佳转场组合</p>
              <button
                onClick={handleSmartMatchTransitions}
                className="mt-2 rounded-md border border-blue-300 bg-white px-3 py-1 text-[10px] text-blue-600 hover:bg-blue-50 transition-colors"
              >
                重新匹配
              </button>
            </div>
          )}

          {/* Duration */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">转场时长</label>
              <span className="text-[10px] tabular-nums font-medium">{globalConfig.transitionDuration.toFixed(1)}s</span>
            </div>
            <input
              type="range" min={0.1} max={3} step={0.1}
              value={globalConfig.transitionDuration}
              onChange={(e) => updateGlobalConfig({ transitionDuration: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Match mode */}
          <div className="mt-2">
            <label className="mb-1 block text-[10px] text-muted-foreground">匹配模式</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => updateGlobalConfig({ useUniformTransition: false })}
                className={`flex-1 rounded-md border py-1.5 text-[10px] transition-all ${
                  !globalConfig.useUniformTransition
                    ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                每组随机
              </button>
              <button
                onClick={() => updateGlobalConfig({ useUniformTransition: true })}
                className={`flex-1 rounded-md border py-1.5 text-[10px] transition-all ${
                  globalConfig.useUniformTransition
                    ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                统一随机
              </button>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              {globalConfig.useUniformTransition ? '所有视频使用相同的随机转场' : '每个视频独立随机选择转场效果'}
            </p>
          </div>
        </>
      )}
      {globalConfig.transitionList.length > 0 && (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 px-2 py-1.5">
          <p className="text-[10px] text-blue-700">已选 {globalConfig.transitionList.length} 个转场效果</p>
          <p className="text-[9px] text-blue-500">转场将在镜头切换时{globalConfig.useUniformTransition ? '统一' : '随机'}应用，时长 {globalConfig.transitionDuration.toFixed(1)}s</p>
        </div>
      )}
    </ConfigSection>
  );
}
