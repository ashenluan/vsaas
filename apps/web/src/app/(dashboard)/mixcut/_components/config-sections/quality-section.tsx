'use client';

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { Settings2 } from 'lucide-react';
import { ConfigSection } from './shared';
import { getMixcutSpeechMode } from '../../_lib/mixcut-compatibility';

export function QualitySection() {
  const { project, globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({
      project: s.project,
      globalConfig: s.globalConfig,
      updateGlobalConfig: s.updateGlobalConfig,
    })),
  );
  const isGroupSpeechMode = getMixcutSpeechMode(project) === 'group';

  useEffect(() => {
    if (!isGroupSpeechMode) return;

    const nextConfig: Partial<typeof globalConfig> = {};

    if (globalConfig.maxDuration > 0) {
      nextConfig.maxDuration = 0;
    }

    if (globalConfig.fixedDuration > 0) {
      nextConfig.fixedDuration = 0;
    }

    if (globalConfig.alignmentMode) {
      nextConfig.alignmentMode = '';
    }

    if (Object.keys(nextConfig).length > 0) {
      updateGlobalConfig(nextConfig);
    }
  }, [isGroupSpeechMode, globalConfig.fixedDuration, globalConfig.alignmentMode, updateGlobalConfig]);

  return (
    <ConfigSection icon={Settings2} label="视频质量">
      <div className="space-y-2.5">
        <RangeField
          label="最大时长限制"
          display={globalConfig.maxDuration === 0 ? '不限' : `${globalConfig.maxDuration}秒`}
          min={0} max={300} step={5}
          value={globalConfig.maxDuration}
          onChange={(v) => updateGlobalConfig({ maxDuration: v, ...(v > 0 ? { fixedDuration: 0 } : {}) })}
          ticks={['不限', '300秒']}
          disabled={isGroupSpeechMode}
        />
        <RangeField
          label="视频质量 (CRF)"
          display={globalConfig.crf === 0 ? '默认' : String(globalConfig.crf)}
          min={0} max={35} step={1}
          value={globalConfig.crf}
          onChange={(v) => updateGlobalConfig({ crf: v })}
          ticks={['默认', '18(高质量)', '35(低质量)']}
        />
        <RangeField
          label="镜头切片时长"
          display={globalConfig.singleShotDuration === 0 ? '默认(3s)' : `${globalConfig.singleShotDuration}秒`}
          min={0} max={15} step={0.5}
          value={globalConfig.singleShotDuration}
          onChange={(v) => updateGlobalConfig({ singleShotDuration: v })}
          ticks={['默认', '15秒']}
        />
        <RangeField
          label="图片展示时长"
          display={globalConfig.imageDuration === 0 ? '默认(3s)' : `${globalConfig.imageDuration}秒`}
          min={0} max={15} step={0.5}
          value={globalConfig.imageDuration}
          onChange={(v) => updateGlobalConfig({ imageDuration: v })}
          ticks={['默认', '15秒']}
        />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-muted-foreground">固定时长</label>
            <span className="text-[10px] tabular-nums text-muted-foreground">{globalConfig.fixedDuration === 0 ? '不限' : `${globalConfig.fixedDuration}秒`}</span>
          </div>
          <input
            type="range" min={0} max={300} step={5}
            value={globalConfig.fixedDuration}
            onChange={(e) => updateGlobalConfig({ fixedDuration: Number(e.target.value), ...(Number(e.target.value) > 0 ? { maxDuration: 0 } : {}) })}
            disabled={isGroupSpeechMode}
            className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>不限</span><span>300秒</span>
          </div>
          {isGroupSpeechMode ? (
            <p className="mt-0.5 text-[9px] text-amber-600">当前项目包含分组字幕，分组口播模式下不支持固定时长。</p>
          ) : globalConfig.fixedDuration > 0 && globalConfig.maxDuration > 0 ? (
            <p className="mt-0.5 text-[9px] text-amber-500">固定时长与最大时长互斥，已自动清除另一个时长设置。</p>
          ) : null}
        </div>
        {isGroupSpeechMode && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
            阿里云分组口播模式下，最大时长、固定时长和对齐模式都不会生效，界面会自动关闭这三项配置。
          </p>
        )}
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">对齐模式</label>
          <div className="flex gap-2">
            {[
              { value: '', label: '默认' },
              { value: 'AutoSpeed', label: '自动变速' },
              { value: 'Cut', label: '截取对齐' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => updateGlobalConfig({ alignmentMode: mode.value })}
                disabled={isGroupSpeechMode}
                className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-all ${
                  globalConfig.alignmentMode === mode.value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ConfigSection>
  );
}

function RangeField({
  label, display, min, max, step, value, onChange, ticks, disabled = false,
}: {
  label: string; display: string;
  min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
  ticks: string[];
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-muted-foreground">{label}</label>
        <span className="text-[10px] tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        {ticks.map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}
