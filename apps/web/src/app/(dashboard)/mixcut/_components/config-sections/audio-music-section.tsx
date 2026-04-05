'use client';

import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { Type, Mic2, Volume2, Music } from 'lucide-react';
import { VoiceSelectSection } from '../voice-select-section';
import { ConfigSection } from './shared';

const PRESET_MUSIC = [
  { label: '轻快活力', url: 'https://ice-public-media.china.aliyuncs.com/music/happy_upbeat.mp3' },
  { label: '抒情温馨', url: 'https://ice-public-media.china.aliyuncs.com/music/emotional_warm.mp3' },
  { label: '科技未来', url: 'https://ice-public-media.china.aliyuncs.com/music/tech_future.mp3' },
  { label: '古风国潮', url: 'https://ice-public-media.china.aliyuncs.com/music/chinese_style.mp3' },
  { label: '商务大气', url: 'https://ice-public-media.china.aliyuncs.com/music/business_grand.mp3' },
  { label: '运动激情', url: 'https://ice-public-media.china.aliyuncs.com/music/sport_energy.mp3' },
];

export function SubtitleVoiceSection() {
  const { project, openDrawer } = useMixcutStore(
    useShallow((s) => ({ project: s.project, openDrawer: s.openDrawer })),
  );

  return (
    <>
      <ConfigSection icon={Type} label="全局字幕配音&标题" badge="AI">
        <button
          onClick={() => {
            const firstGroup = project.shotGroups[0];
            if (firstGroup) openDrawer('subtitle', firstGroup.id);
          }}
          className="w-full rounded-lg border border-dashed py-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          添加
        </button>
      </ConfigSection>

      <ConfigSection icon={Mic2} label="配音声音">
        <VoiceSelectSection />
      </ConfigSection>
    </>
  );
}

export function AudioSettingsSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  return (
    <ConfigSection id="mixcut-audio-settings" icon={Volume2} label="音频设置">
      <div className="space-y-2.5">
        <VolumeSlider label="素材音量" value={globalConfig.mediaVolume} onChange={(v) => updateGlobalConfig({ mediaVolume: v })} />
        <VolumeSlider label="配音音量" value={globalConfig.speechVolume} onChange={(v) => updateGlobalConfig({ speechVolume: v })} />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-muted-foreground">语速</label>
            <span className="text-[10px] tabular-nums text-muted-foreground">{globalConfig.speechRate.toFixed(1)}x</span>
          </div>
          <input
            type="range" min={0.5} max={2.0} step={0.1}
            value={globalConfig.speechRate}
            onChange={(e) => updateGlobalConfig({ speechRate: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
        <VolumeSlider label="背景音乐音量" value={globalConfig.bgMusicVolume} onChange={(v) => updateGlobalConfig({ bgMusicVolume: v })} />
      </div>
    </ConfigSection>
  );
}

export function BgMusicSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  const handleSmartMatchMusic = () => {
    const pick = PRESET_MUSIC[Math.floor(Math.random() * PRESET_MUSIC.length)];
    updateGlobalConfig({ bgMusic: pick.url });
  };

  return (
    <ConfigSection icon={Music} label="背景音乐">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={globalConfig.bgMusic}
          onChange={(e) => updateGlobalConfig({ bgMusic: e.target.value })}
          placeholder="输入音乐 URL 或选择"
          className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-dashed px-2 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
          <Music size={10} /> 上传
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const { uploadToOSS } = await import('@/lib/upload');
                const { url } = await uploadToOSS(file);
                updateGlobalConfig({ bgMusic: url });
                (await import('sonner')).toast.success('音乐上传成功');
              } catch (err: any) {
                (await import('sonner')).toast.error(err?.message || '上传失败');
              }
            }}
          />
        </label>
      </div>
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
  );
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-muted-foreground">{label}</label>
        <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.05} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
