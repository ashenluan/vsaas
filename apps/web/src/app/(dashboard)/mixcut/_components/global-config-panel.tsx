'use client';

import { useMixcutStore } from '../_store/use-mixcut-store';
import {
  Type, Music, ArrowRightLeft, Droplet, Palette, Mic2,
  Image as ImageIcon, Film, Shield, MonitorSmartphone, Smartphone, Monitor, Square,
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

  const transitionsData = options?.transitions || [];
  const filtersData = options?.filters || {};
  const allFilters = Object.values(filtersData).flat() as string[];

  const handleSmartMatchTransitions = () => {
    if (transitionsData.length === 0) return;
    // Pick 3-5 random transitions
    const count = Math.min(transitionsData.length, Math.max(3, Math.floor(Math.random() * 3) + 3));
    const shuffled = [...transitionsData].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ transitionEnabled: true, transitionList: shuffled.slice(0, count) });
  };

  const handleSmartMatchFilters = () => {
    if (allFilters.length === 0) return;
    // Pick 2-4 random filters
    const count = Math.min(allFilters.length, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const shuffled = [...allFilters].sort(() => Math.random() - 0.5);
    updateGlobalConfig({ filterEnabled: true, filterList: shuffled.slice(0, count) });
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

      {/* 背景音乐 */}
      <ConfigSection icon={Music} label="背景音乐">
        <input
          type="text"
          value={globalConfig.bgMusic}
          onChange={(e) => updateGlobalConfig({ bgMusic: e.target.value })}
          placeholder="输入音乐 URL 或选择"
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button className="mt-1.5 w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
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
            <div className="mb-2">
              <label className="mb-1 block text-[10px] text-muted-foreground">转场时长</label>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={globalConfig.transitionDuration}
                onChange={(e) => updateGlobalConfig({ transitionDuration: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">{globalConfig.transitionDuration.toFixed(1)}s</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {transitionsData.map((t: string) => (
                <button
                  key={t}
                  onClick={() => {
                    const list = globalConfig.transitionList.includes(t)
                      ? globalConfig.transitionList.filter((x) => x !== t)
                      : [...globalConfig.transitionList, t];
                    updateGlobalConfig({ transitionList: list });
                  }}
                  className={`rounded border px-1.5 py-0.5 text-[10px] transition-all ${
                    globalConfig.transitionList.includes(t)
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
        <button onClick={handleSmartMatchTransitions} className="mt-1.5 w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
          智能匹配转场
        </button>
      </ConfigSection>

      {/* 水印设置 */}
      <ConfigSection icon={Shield} label="水印设置">
        <button className="w-full rounded-lg border border-dashed py-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
          添加
        </button>
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
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {Object.entries(filtersData).map(([category, items]) => (
              <div key={category}>
                <span className="mb-0.5 block text-[9px] font-medium text-amber-600">{category}</span>
                <div className="flex flex-wrap gap-1">
                  {(items as string[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        const list = globalConfig.filterList.includes(f)
                          ? globalConfig.filterList.filter((x) => x !== f)
                          : [...globalConfig.filterList, f];
                        updateGlobalConfig({ filterList: list });
                      }}
                      className={`rounded border px-1.5 py-0.5 text-[10px] transition-all ${
                        globalConfig.filterList.includes(f)
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
        )}
        <button onClick={handleSmartMatchFilters} className="mt-1.5 w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
          智能匹配滤镜
        </button>
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
        <button className="w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5 transition-colors">
          智能生成封面
        </button>
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
  icon: Icon,
  label,
  badge,
  children,
}: {
  icon: any;
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-sm">
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
