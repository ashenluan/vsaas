'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { Palette, Check } from 'lucide-react';
import { getPreviewUrl } from '../../_lib/effect-previews';
import { ConfigSection, ToggleSwitch } from './shared';

export function FilterSection({ options }: { options: any }) {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  const filtersData: Record<string, { id: string; label: string }[]> = options?.filters || {};
  const allFilters = Object.values(filtersData).flat();
  const filterCategoryNames = Object.keys(filtersData);
  const [filterCategoryTab, setFilterCategoryTab] = useState(0);

  const handleSmartMatchFilters = () => {
    if (allFilters.length === 0) return;
    const count = Math.min(allFilters.length, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const shuffled = [...allFilters].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ filterEnabled: true, filterList: shuffled.slice(0, count).map((f) => f.id) });
  };

  return (
    <ConfigSection icon={Palette} label="滤镜设置">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground">启用滤镜</span>
        <ToggleSwitch
          checked={globalConfig.filterEnabled}
          onChange={(v) => updateGlobalConfig({ filterEnabled: v })}
        />
      </div>
      {globalConfig.filterEnabled && (
        <>
          {/* Category tabs */}
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {filterCategoryNames.map((name, idx) => (
              <button
                key={name}
                onClick={() => setFilterCategoryTab(idx)}
                className={`shrink-0 rounded-md border px-2 py-1 text-[10px] transition-all ${
                  filterCategoryTab === idx
                    ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {name}
                <span className="ml-0.5 text-[9px] opacity-60">
                  {(filtersData[name] || []).filter((f) => globalConfig.filterList.includes(f.id)).length || ''}
                </span>
              </button>
            ))}
          </div>

          {/* Select all for current category */}
          {filterCategoryNames[filterCategoryTab] && (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {(filtersData[filterCategoryNames[filterCategoryTab]] || []).filter((f) => globalConfig.filterList.includes(f.id)).length}
                /{(filtersData[filterCategoryNames[filterCategoryTab]] || []).length} 已选
              </span>
              <button
                onClick={() => {
                  const catItems = filtersData[filterCategoryNames[filterCategoryTab]] || [];
                  const catIds = catItems.map((f) => f.id);
                  const allSelected = catIds.every((id) => globalConfig.filterList.includes(id));
                  if (allSelected) {
                    updateGlobalConfig({ filterList: globalConfig.filterList.filter((id) => !catIds.includes(id)) });
                  } else {
                    updateGlobalConfig({ filterList: [...new Set([...globalConfig.filterList, ...catIds])] });
                  }
                }}
                className="text-[10px] text-primary hover:underline"
              >
                {(filtersData[filterCategoryNames[filterCategoryTab]] || []).every((f) => globalConfig.filterList.includes(f.id)) ? '取消全选' : '全选'}
              </button>
            </div>
          )}

          {/* Filter grid */}
          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {(filtersData[filterCategoryNames[filterCategoryTab]] || []).map((f) => {
              const selected = globalConfig.filterList.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    const list = selected
                      ? globalConfig.filterList.filter((x) => x !== f.id)
                      : [...globalConfig.filterList, f.id];
                    updateGlobalConfig({ filterList: list });
                  }}
                  className={`relative flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition-all ${
                    selected
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                      : 'border-input hover:border-amber-300 hover:bg-accent'
                  }`}
                >
                  {getPreviewUrl(f.id) ? (
                    <div className="h-10 w-full overflow-hidden rounded">
                      <img src={getPreviewUrl(f.id)} alt={f.label} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                      selected ? 'from-amber-100 to-amber-200' : 'from-muted to-muted/60'
                    }`}>
                      <Palette size={12} className={selected ? 'text-amber-600' : 'text-muted-foreground/50'} />
                    </div>
                  )}
                  <span className={`text-[9px] leading-tight text-center line-clamp-1 ${
                    selected ? 'text-amber-700 font-medium' : 'text-muted-foreground'
                  }`}>
                    {f.label}
                  </span>
                  {selected && (
                    <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500">
                      <Check size={8} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
      {globalConfig.filterList.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/50 px-2 py-1.5">
          <p className="text-[10px] text-amber-700">已选 {globalConfig.filterList.length} 个滤镜效果</p>
          <p className="text-[9px] text-amber-500">滤镜将随机应用到各视频片段，提升画面质感</p>
        </div>
      )}
      <button onClick={handleSmartMatchFilters} className="mt-1.5 w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
        智能匹配滤镜
      </button>
    </ConfigSection>
  );
}
