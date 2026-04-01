'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { Video } from 'lucide-react';

const RESOLUTIONS = [
  { label: '9:16 竖屏', value: '1080x1920', desc: '抖音/快手' },
  { label: '16:9 横屏', value: '1920x1080', desc: '传统广告' },
];

const DURATIONS = [
  { label: '5 秒', value: 5, desc: '短片' },
  { label: '10 秒', value: 10, desc: '标准' },
];

export default function GrokVideoPage() {
  const [resolution, setResolution] = useState('1080x1920');
  const [duration, setDuration] = useState(5);

  return (
    <ModelGenerationPage
      modelName="Grok 视频"
      modelDesc="xAI Grok-2 Video · 高质量AI视频生成"
      providerId="grok-video"
      type="video"
      icon={Video}
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'grok-video',
        duration,
        resolution,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            label="视频比例"
            options={RESOLUTIONS}
            value={resolution}
            onChange={setResolution}
          />
          <OptionSelector
            label="生成时长"
            options={DURATIONS}
            value={duration}
            onChange={setDuration}
          />
        </>
      )}
      estimateCost={() => duration * 5}
    />
  );
}
