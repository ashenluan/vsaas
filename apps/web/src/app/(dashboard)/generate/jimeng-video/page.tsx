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
  { label: '9:16 竖屏', value: '9:16', desc: '抖音/快手' },
  { label: '16:9 横屏', value: '16:9', desc: '传统广告' },
  { label: '1:1 方形', value: '1:1', desc: '社交' },
];

export default function JimengVideoPage() {
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('9:16');

  return (
    <ModelGenerationPage
      modelName="即梦 2.0"
      modelDesc="字节跳动 Seedance 2.0 · 国产高性价比视频生成"
      providerId="jimeng-video"
      type="video"
      icon={Video}
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'jimeng-video',
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
      estimateCost={() => duration * 5}
    />
  );
}
