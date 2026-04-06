'use client';

import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { Type, Mic2, Volume2, Music } from 'lucide-react';
import { VoiceSelectSection } from '../voice-select-section';
import { ConfigSection } from './shared';
import { getPrimaryMixcutPoolItem, parseMixcutPoolText, stringifyMixcutPool } from '../../_lib/mixcut-random-pools';
import { canSwitchToGlobalSpeech } from '../../_lib/mixcut-capabilities';

const PRESET_MUSIC = [
  { label: '轻快活力', url: 'https://ice-public-media.china.aliyuncs.com/music/happy_upbeat.mp3' },
  { label: '抒情温馨', url: 'https://ice-public-media.china.aliyuncs.com/music/emotional_warm.mp3' },
  { label: '科技未来', url: 'https://ice-public-media.china.aliyuncs.com/music/tech_future.mp3' },
  { label: '古风国潮', url: 'https://ice-public-media.china.aliyuncs.com/music/chinese_style.mp3' },
  { label: '商务大气', url: 'https://ice-public-media.china.aliyuncs.com/music/business_grand.mp3' },
  { label: '运动激情', url: 'https://ice-public-media.china.aliyuncs.com/music/sport_energy.mp3' },
];

const SPEECH_LANGUAGE_OPTIONS = [
  { value: 'zh', label: '中文 (zh)' },
  { value: 'en', label: '英文 (en)' },
] as const;

export function SubtitleVoiceSection({
  mixcutGlobalSpeechEnabled = false,
}: {
  mixcutGlobalSpeechEnabled?: boolean;
}) {
  const { project, globalConfig, updateGlobalConfig, openDrawer, setSpeechMode, setSpeechTexts } = useMixcutStore(
    useShallow((s) => ({
      project: s.project,
      globalConfig: s.globalConfig,
      updateGlobalConfig: s.updateGlobalConfig,
      openDrawer: s.openDrawer,
      setSpeechMode: s.setSpeechMode,
      setSpeechTexts: s.setSpeechTexts,
    })),
  );
  const firstGroup = project.shotGroups[0];
  const speechMode = project.speechMode;
  const speechTextValue = stringifyMixcutPool(project.speechTexts);
  const speechLanguage = globalConfig.speechLanguage || 'zh';
  const allowGlobalSpeechSelection = canSwitchToGlobalSpeech(
    { capabilities: { mixcutGlobalSpeechEnabled } },
    speechMode,
  );

  return (
    <>
      <ConfigSection icon={Type} label="全局字幕配音&标题" badge="AI">
        <div className="space-y-2">
          {!mixcutGlobalSpeechEnabled ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-800">
              当前环境已关闭 Mixcut 全局口播提交。新任务请优先使用分组口播；如需恢复，请在后台“系统设置”中重新开启。
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                if (!allowGlobalSpeechSelection) return;
                setSpeechMode('global');
              }}
              disabled={!allowGlobalSpeechSelection}
              className={`rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                speechMode === 'global'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : !allowGlobalSpeechSelection
                    ? 'cursor-not-allowed border-input bg-muted text-muted-foreground'
                    : 'border-input hover:bg-accent'
              }`}
            >
              全局口播
            </button>
            <button
              onClick={() => setSpeechMode('group')}
              className={`rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                speechMode === 'group'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-input hover:bg-accent'
              }`}
            >
              分组口播
            </button>
          </div>

          {speechMode === 'global' ? (
            <>
              <textarea
                value={speechTextValue}
                onChange={(e) => setSpeechTexts(parseMixcutPoolText(e.target.value))}
                rows={4}
                placeholder="每行一条全局口播文案，可填写多个作为随机文案池"
                className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-[11px] leading-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">全局口播会写入阿里云 `SpeechTextArray`，不会再提交逐镜头字幕文案。</p>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (firstGroup) openDrawer('subtitle', firstGroup.id);
                }}
                className="w-full rounded-lg border border-dashed py-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                逐镜头编辑字幕配音
              </button>
              <p className="text-[10px] text-muted-foreground">分组口播模式下，请在每个镜头组的「字幕配音&标题」里分别维护文案。</p>
            </>
          )}

          <button
            onClick={() => {
              if (firstGroup) openDrawer('subtitle', firstGroup.id);
            }}
            className="w-full rounded-md border py-1.5 text-[11px] hover:bg-accent transition-colors"
          >
            字幕样式与标题
          </button>
        </div>
      </ConfigSection>

      <ConfigSection icon={Mic2} label="配音声音">
        <div className="space-y-2.5">
          <VoiceSelectSection />
          <div className="space-y-1.5 rounded-md border border-dashed border-input/80 p-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] text-muted-foreground">口播语种</label>
              <select
                value={speechLanguage}
                onChange={(e) => updateGlobalConfig({ speechLanguage: e.target.value as 'zh' | 'en' })}
                className="h-7 rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SPEECH_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] leading-4 text-muted-foreground">
              阿里云脚本化自动成片当前仅支持 <code>zh</code> 和 <code>en</code>。英文口播会自动优先按空格换行，减少字幕断词。
            </p>
            <p className="text-[10px] leading-4 text-muted-foreground">
              文案里可直接写 SSML，支持 <code>break</code> <code>s</code> <code>sub</code> <code>w</code> <code>phoneme</code> <code>say-as</code>；CosyVoice 与克隆音色仅支持 <code>break</code> <code>s</code> <code>sub</code>。
            </p>
          </div>
        </div>
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
  const bgMusicList = parseMixcutPoolText(globalConfig.bgMusic);
  const primaryBgMusic = getPrimaryMixcutPoolItem(globalConfig.bgMusic);

  const handleSmartMatchMusic = () => {
    const pick = PRESET_MUSIC[Math.floor(Math.random() * PRESET_MUSIC.length)];
    updateGlobalConfig({ bgMusic: pick.url });
  };

  return (
    <ConfigSection icon={Music} label="背景音乐">
      <div className="flex gap-1.5">
        <textarea
          value={globalConfig.bgMusic}
          onChange={(e) => updateGlobalConfig({ bgMusic: e.target.value })}
          rows={3}
          placeholder="每行一个音乐 URL，可填写多个作为随机背景音乐池"
          className="flex min-h-[72px] flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-[11px] leading-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      {bgMusicList.length > 0 && (
        <div className="mt-1.5 flex items-center gap-2">
          <audio src={primaryBgMusic} controls className="h-7 w-full" />
          <button onClick={() => updateGlobalConfig({ bgMusic: '' })} className="shrink-0 text-[10px] text-red-500 hover:underline">清除</button>
        </div>
      )}
      {bgMusicList.length > 1 && (
        <p className="mt-1 text-[10px] text-primary">已配置 {bgMusicList.length} 首背景音乐，成片时将按阿里云规则随机轮换。</p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {PRESET_MUSIC.map((m) => (
          <button
            key={m.label}
            onClick={() => updateGlobalConfig({ bgMusic: m.url })}
            className={`rounded border px-1.5 py-0.5 text-[10px] transition-all ${
              primaryBgMusic === m.url
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
