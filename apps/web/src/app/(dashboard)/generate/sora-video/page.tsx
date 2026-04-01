'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { Video } from 'lucide-react';

const RESOLUTIONS = [
  { label: '720p', value: '720p', desc: '标准' },
  { label: '1080p', value: '1080p', desc: '高清' },
];

const DURATIONS = [
  { label: '5 秒', value: 5, desc: '短片' },
  { label: '10 秒', value: 10, desc: '标准' },
  { label: '15 秒', value: 15, desc: '长片' },
  { label: '20 秒', value: 20, desc: '超长' },
];

export default function SoraVideoPage() {
  const [resolution, setResolution] = useState('1080p');
  const [duration, setDuration] = useState(5);

  return (
    <ModelGenerationPage
      modelName="Sora 视频"
      modelDesc="OpenAI Sora-2 · 电影级视频生成"
      providerId="openai-sora"
      type="video"
      icon={Video}
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'openai-sora',
        duration,
        resolution,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            label="分辨率"
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
      estimateCost={() => duration * 20}
    />
  );
}
