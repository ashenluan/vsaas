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
];

const ASPECT_RATIOS = [
  { label: '9:16', value: '9:16', desc: '竖屏' },
  { label: '16:9', value: '16:9', desc: '横屏' },
];

export default function VeoVideoPage() {
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('9:16');

  return (
    <ModelGenerationPage
      modelName="Veo 3.1 视频"
      modelDesc="Google Veo 3.1 · 顶级视频生成模型"
      providerId="veo"
      type="video"
      icon={Video}
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'veo',
        duration,
        resolution,
        aspectRatio,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            label="视频比例"
            options={ASPECT_RATIOS}
            value={aspectRatio}
            onChange={setAspectRatio}
          />
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
      estimateCost={() => duration * 10}
    />
  );
}
