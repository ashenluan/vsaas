'use client';

import { SubtitleVoiceSection, AudioSettingsSection, BgMusicSection } from './config-sections/audio-music-section';
import { TransitionSection } from './config-sections/transition-section';
import { FilterSection } from './config-sections/filter-section';
import { EffectsSection } from './config-sections/effects-section';
import { QualitySection } from './config-sections/quality-section';
import {
  WatermarkSection, BackgroundSection, CoverSection,
  DedupSection, AspectRatioSection,
} from './config-sections/visual-section';

export function GlobalConfigPanel({ options }: { options: any }) {
  const mixcutGlobalSpeechEnabled =
    options?.capabilities?.mixcutGlobalSpeechEnabled ?? false;

  return (
    <div className="space-y-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">视频配置</h3>
        <p className="text-[10px] text-muted-foreground">为整体效果进行统一配置</p>
      </div>

      <SubtitleVoiceSection mixcutGlobalSpeechEnabled={mixcutGlobalSpeechEnabled} />
      <AudioSettingsSection />
      <BgMusicSection />
      <TransitionSection options={options} />
      <WatermarkSection />
      <FilterSection options={options} />
      <EffectsSection options={options} />
      <QualitySection />
      <BackgroundSection />
      <CoverSection />
      <DedupSection />
      <AspectRatioSection />
    </div>
  );
}
