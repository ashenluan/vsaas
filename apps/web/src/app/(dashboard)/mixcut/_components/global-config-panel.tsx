'use client';

import { useState } from 'react';
import { useMixcutStore } from '../_store/use-mixcut-store';
import {
  Type, Music, ArrowRightLeft, Droplet, Palette, Mic2, Volume2,
  Image as ImageIcon, Film, Shield, MonitorSmartphone, Smartphone, Monitor, Square,
  Sparkles, Settings2, Check,
} from 'lucide-react';
import { VoiceSelectSection } from './voice-select-section';

const ASPECT_RATIOS = [
  { label: '9:16', value: '9:16' as const, icon: Smartphone },
  { label: '16:9', value: '16:9' as const, icon: Monitor },
  { label: '1:1', value: '1:1' as const, icon: Square },
];

const RESOLUTIONS: Record<string, { label: string; value: string }[]> = {
  '9:16': [
    { label: '1080×1920', value: '1080x1920' },
    { label: '720×1280', value: '720x1280' },
  ],
  '16:9': [
    { label: '1920×1080', value: '1920x1080' },
    { label: '1280×720', value: '1280x720' },
  ],
  '1:1': [
    { label: '1080×1080', value: '1080x1080' },
    { label: '720×720', value: '720x720' },
  ],
};

export function GlobalConfigPanel({ options }: { options: any }) {
  const { globalConfig, updateGlobalConfig } = useMixcutStore();

  const transitionsData: { id: string; label: string }[] = options?.transitions || [];
  const advancedTransitionsData: { id: string; label: string }[] = options?.advancedTransitions || [];
  const allTransitions = [...transitionsData, ...advancedTransitionsData];
  const transitionCategories = (() => {
    const catNames: Record<string, string> = { '01': 'MG转场', '02': '遮罩转场', '03': '特效转场', '04': '运镜转场', '05': '渐变转场', '06': '创意转场' };
    const advCats: Record<string, { id: string; label: string }[]> = {};
    advancedTransitionsData.forEach((t) => {
      const m = t.id.match(/^OT0001-(\d{2})-/);
      if (m) { const k = catNames[m[1]] || `其他${m[1]}`; (advCats[k] ??= []).push(t); }
    });
    return [{ name: '基础转场', items: transitionsData }, ...Object.entries(advCats).map(([name, items]) => ({ name, items }))];
  })();
  const filtersData: Record<string, { id: string; label: string }[]> = options?.filters || {};
  const allFilters = Object.values(filtersData).flat();
  const effectsData: Record<string, { id: string; label: string }[]> = options?.effects || {};

  const [transitionTab, setTransitionTab] = useState<'smart' | 'custom'>('custom');
  const [transitionCategoryTab, setTransitionCategoryTab] = useState(0);
  const filterCategoryNames = Object.keys(filtersData);
  const [filterCategoryTab, setFilterCategoryTab] = useState(0);
  const effectCategoryNames = Object.keys(effectsData);
  const [effectCategoryTab, setEffectCategoryTab] = useState(0);
  const [effectSection, setEffectSection] = useState<'first' | 'rest'>('first');

  const handleSmartMatchTransitions = () => {
    if (allTransitions.length === 0) return;
    const count = Math.min(allTransitions.length, Math.max(5, Math.floor(Math.random() * 4) + 4));
    const shuffled = [...allTransitions].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ transitionEnabled: true, transitionList: shuffled.slice(0, count).map((t) => t.id) });
  };

  const handleSmartMatchFilters = () => {
    if (allFilters.length === 0) return;
    const count = Math.min(allFilters.length, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const shuffled = [...allFilters].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ filterEnabled: true, filterList: shuffled.slice(0, count).map((f) => f.id) });
  };

  const allEffects = Object.values(effectsData).flat();
  const handleSmartMatchEffects = () => {
    if (allEffects.length === 0) return;
    const shuffled1 = [...allEffects].sort(() => Math.random() - 0.5);
    const shuffled2 = [...allEffects].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ vfxEffectEnabled: true, vfxFirstClipEffectList: shuffled1.slice(0, 3).map((e) => e.id), vfxNotFirstClipEffectList: shuffled2.slice(0, 5).map((e) => e.id), vfxEffectProbability: 50 });
  };

  const PRESET_MUSIC = [
    { label: '轻快活力', url: 'https://ice-public-media.china.aliyuncs.com/music/happy_upbeat.mp3' },
    { label: '抒情温馨', url: 'https://ice-public-media.china.aliyuncs.com/music/emotional_warm.mp3' },
    { label: '科技未来', url: 'https://ice-public-media.china.aliyuncs.com/music/tech_future.mp3' },
    { label: '古风国潮', url: 'https://ice-public-media.china.aliyuncs.com/music/chinese_style.mp3' },
    { label: '商务大气', url: 'https://ice-public-media.china.aliyuncs.com/music/business_grand.mp3' },
    { label: '运动激情', url: 'https://ice-public-media.china.aliyuncs.com/music/sport_energy.mp3' },
  ];

  const handleSmartMatchMusic = () => {
    const pick = PRESET_MUSIC[Math.floor(Math.random() * PRESET_MUSIC.length)];
    updateGlobalConfig({ bgMusic: pick.url });
  };

  return (
    <div className="space-y-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">视频配置</h3>
        <p className="text-[10px] text-muted-foreground">为整体效果进行统一配置</p>
      </div>

      {/* 全局字幕配音 & 标题 */}
      <ConfigSection icon={Type} label="全局字幕配音&标题" badge="AI">
        <button className="w-full rounded-lg border border-dashed py-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
          添加
        </button>
      </ConfigSection>

      {/* 配音声音 */}
      <ConfigSection icon={Mic2} label="配音声音">
        <VoiceSelectSection />
      </ConfigSection>

      {/* 音频设置 */}
      <ConfigSection id="mixcut-audio-settings" icon={Volume2} label="音频设置">
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">素材音量</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(globalConfig.mediaVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={globalConfig.mediaVolume}
              onChange={(e) => updateGlobalConfig({ mediaVolume: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">配音音量</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(globalConfig.speechVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={globalConfig.speechVolume}
              onChange={(e) => updateGlobalConfig({ speechVolume: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">语速</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{globalConfig.speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={globalConfig.speechRate}
              onChange={(e) => updateGlobalConfig({ speechRate: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">背景音乐音量</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(globalConfig.bgMusicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={globalConfig.bgMusicVolume}
              onChange={(e) => updateGlobalConfig({ bgMusicVolume: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </ConfigSection>

      {/* 背景音乐 */}
      <ConfigSection icon={Music} label="背景音乐">
        <input
          type="text"
          value={globalConfig.bgMusic}
          onChange={(e) => updateGlobalConfig({ bgMusic: e.target.value })}
          placeholder="输入音乐 URL 或选择"
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {globalConfig.bgMusic && (
          <div className="mt-1.5 flex items-center gap-2">
            <audio src={globalConfig.bgMusic} controls className="h-7 w-full" />
            <button onClick={() => updateGlobalConfig({ bgMusic: '' })} className="shrink-0 text-[10px] text-red-500 hover:underline">清除</button>
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {PRESET_MUSIC.map((m) => (
            <button
              key={m.label}
              onClick={() => updateGlobalConfig({ bgMusic: m.url })}
              className={`rounded border px-1.5 py-0.5 text-[10px] transition-all ${
                globalConfig.bgMusic === m.url
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={handleSmartMatchMusic} className="mt-1.5 w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
          智能匹配音乐
        </button>
      </ConfigSection>

      {/* 转场设置 */}
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
                        <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                          selected ? 'from-blue-100 to-blue-200' : 'from-muted to-muted/60'
                        }`}>
                          <ArrowRightLeft size={12} className={selected ? 'text-blue-600' : 'text-muted-foreground/50'} />
                        </div>
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
                type="range"
                min={0.1}
                max={3}
                step={0.1}
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

      {/* 水印设置 */}
      <ConfigSection icon={Shield} label="水印设置">
        <input
          type="text"
          value={globalConfig.watermarkText}
          onChange={(e) => updateGlobalConfig({ watermarkText: e.target.value })}
          placeholder="输入水印文字（留空则不添加）"
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {globalConfig.watermarkText && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">水印位置</label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { value: 'topLeft' as const, label: '左上' },
                  { value: 'topRight' as const, label: '右上' },
                  { value: 'bottomLeft' as const, label: '左下' },
                  { value: 'bottomRight' as const, label: '右下' },
                ].map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => updateGlobalConfig({ watermarkPosition: pos.value })}
                    className={`rounded border py-1 text-[10px] transition-all ${
                      globalConfig.watermarkPosition === pos.value
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-muted-foreground">透明度</label>
                <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(globalConfig.watermarkOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={globalConfig.watermarkOpacity}
                onChange={(e) => updateGlobalConfig({ watermarkOpacity: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            {/* Watermark preview */}
            <div className="relative mt-2 h-20 rounded-lg border bg-black/80 overflow-hidden">
              <div
                className="absolute text-white font-medium"
                style={{
                  ...(globalConfig.watermarkPosition === 'topLeft' ? { top: 6, left: 6 } : {}),
                  ...(globalConfig.watermarkPosition === 'topRight' ? { top: 6, right: 6 } : {}),
                  ...(globalConfig.watermarkPosition === 'bottomLeft' ? { bottom: 6, left: 6 } : {}),
                  ...(globalConfig.watermarkPosition === 'bottomRight' ? { bottom: 6, right: 6 } : {}),
                  opacity: globalConfig.watermarkOpacity,
                  fontSize: 11,
                }}
              >
                {globalConfig.watermarkText}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] text-white/30">水印位置预览</span>
              </div>
            </div>
          </div>
        )}
      </ConfigSection>

      {/* 滤镜设置 */}
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
                    <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                      selected ? 'from-amber-100 to-amber-200' : 'from-muted to-muted/60'
                    }`}>
                      <Palette size={12} className={selected ? 'text-amber-600' : 'text-muted-foreground/50'} />
                    </div>
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

      {/* 特效设置 */}
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
                type="range"
                min={0}
                max={100}
                step={5}
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
                    <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                      selected
                        ? isFirst ? 'from-purple-100 to-purple-200' : 'from-indigo-100 to-indigo-200'
                        : 'from-muted to-muted/60'
                    }`}>
                      <Sparkles size={12} className={selected ? (isFirst ? 'text-purple-600' : 'text-indigo-600') : 'text-muted-foreground/50'} />
                    </div>
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

      {/* 视频质量 */}
      <ConfigSection icon={Settings2} label="视频质量">
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">最大时长限制</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{globalConfig.maxDuration === 0 ? '不限' : `${globalConfig.maxDuration}秒`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              step={5}
              value={globalConfig.maxDuration}
              onChange={(e) => updateGlobalConfig({ maxDuration: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>不限</span><span>300秒</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">视频质量 (CRF)</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{globalConfig.crf === 0 ? '默认' : globalConfig.crf}</span>
            </div>
            <input
              type="range"
              min={0}
              max={35}
              step={1}
              value={globalConfig.crf}
              onChange={(e) => updateGlobalConfig({ crf: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>默认</span><span>18(高质量)</span><span>35(低质量)</span>
            </div>
          </div>
        </div>
      </ConfigSection>

      {/* 背景设置 */}
      <ConfigSection icon={ImageIcon} label="背景设置">
        <div className="flex gap-2">
          {(['none', 'color', 'blur'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateGlobalConfig({ bgType: type })}
              className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-all ${
                globalConfig.bgType === type
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {type === 'none' ? '无' : type === 'color' ? '固定颜色' : '模糊'}
            </button>
          ))}
        </div>
        {globalConfig.bgType === 'color' && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={globalConfig.bgColor}
              onChange={(e) => updateGlobalConfig({ bgColor: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border p-0.5"
            />
            <span className="text-[11px] font-mono text-muted-foreground">{globalConfig.bgColor}</span>
          </div>
        )}
      </ConfigSection>

      {/* 视频封面 */}
      <ConfigSection icon={Film} label="视频封面">
        <div className="flex gap-2 mb-2">
          {(['auto', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateGlobalConfig({ coverType: type })}
              className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-all ${
                globalConfig.coverType === type
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {type === 'auto' ? '自动截取' : '自定义封面'}
            </button>
          ))}
        </div>
        {globalConfig.coverType === 'custom' && (
          <div className="space-y-2">
            <input
              type="text"
              value={globalConfig.coverUrl}
              onChange={(e) => updateGlobalConfig({ coverUrl: e.target.value })}
              placeholder="输入封面图片 URL"
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {globalConfig.coverUrl && (
              <div className="relative mx-auto w-32 overflow-hidden rounded-lg border">
                <img src={globalConfig.coverUrl} alt="封面预览" className="w-full object-cover" style={{ aspectRatio: globalConfig.aspectRatio === '9:16' ? '9/16' : globalConfig.aspectRatio === '16:9' ? '16/9' : '1/1' }} />
                <button
                  onClick={() => updateGlobalConfig({ coverUrl: '' })}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-[10px] hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}
      </ConfigSection>

      {/* 选择比例 */}
      <ConfigSection icon={MonitorSmartphone} label="选择比例">
        <div className="flex gap-2 mb-2">
          {ASPECT_RATIOS.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.value}
                onClick={() => {
                  updateGlobalConfig({ aspectRatio: r.value });
                  // Auto-set resolution
                  const resolutions = RESOLUTIONS[r.value];
                  if (resolutions?.[0]) updateGlobalConfig({ resolution: resolutions[0].value as any });
                }}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-2 transition-all ${
                  globalConfig.aspectRatio === r.value
                    ? 'border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary'
                    : 'border-input hover:border-primary/50'
                }`}
              >
                <Icon size={16} />
                <span className="text-[11px]">{r.label}</span>
              </button>
            );
          })}
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">视频分辨率</label>
          <div className="flex gap-2">
            {(RESOLUTIONS[globalConfig.aspectRatio] || []).map((res) => (
              <button
                key={res.value}
                onClick={() => updateGlobalConfig({ resolution: res.value as any })}
                className={`flex-1 rounded-md border py-1.5 text-[11px] transition-all ${
                  globalConfig.resolution === res.value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}

function ConfigSection({
  id,
  icon: Icon,
  label,
  badge,
  children,
}: {
  id?: string;
  icon: any;
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-xl border bg-card p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-[12px] font-medium">{label}</span>
        {badge && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}
