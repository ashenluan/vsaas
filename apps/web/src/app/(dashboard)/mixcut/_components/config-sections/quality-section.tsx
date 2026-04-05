'use client';

import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { Settings2 } from 'lucide-react';
import { ConfigSection } from './shared';

export function QualitySection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  return (
    <ConfigSection icon={Settings2} label="视频质量">
      <div className="space-y-2.5">
        <RangeField
          label="最大时长限制"
          display={globalConfig.maxDuration === 0 ? '不限' : `${globalConfig.maxDuration}秒`}
          min={0} max={300} step={5}
          value={globalConfig.maxDuration}
          onChange={(v) => updateGlobalConfig({ maxDuration: v })}
          ticks={['不限', '300秒']}
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
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>不限</span><span>300秒</span>
          </div>
          {globalConfig.fixedDuration > 0 && globalConfig.maxDuration > 0 && (
            <p className="text-[9px] text-amber-500 mt-0.5">⚠ 固定时长与最大时长互斥，已自动清除最大时长</p>
          )}
        </div>
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
                className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-all ${
                  globalConfig.alignmentMode === mode.value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
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
  label, display, min, max, step, value, onChange, ticks,
}: {
  label: string; display: string;
  min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
  ticks: string[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-muted-foreground">{label}</label>
        <span className="text-[10px] tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        {ticks.map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}
