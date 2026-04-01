'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { Video } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '9:16 竖屏', value: '9:16', desc: '抖音/快手' },
  { label: '16:9 横屏', value: '16:9', desc: '传统广告' },
  { label: '1:1 方形', value: '1:1', desc: '社交' },
];

const RESOLUTIONS = [
  { label: '720P', value: '720p', desc: '标准清晰度' },
  { label: '1080P', value: '1080p', desc: '高清' },
];

const DURATIONS = [
  { label: '5 秒', value: 5, desc: '标准时长' },
  { label: '10 秒', value: 10, desc: '更长时长' },
];

const COUNTS = [
  { label: '1 条', value: 1 },
  { label: '3 条', value: 3 },
  { label: '5 条', value: 5 },
  { label: '10 条', value: 10 },
];

export default function JimengVideoPage() {
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(5);
  const [count, setCount] = useState(1);

  return (
    <ModelGenerationPage
      modelName="即梦 2.0"
      modelDesc="字节跳动 Seedance 2.0 · 国产高性价比视频生成"
      descTags={['最新国产AI视频模型', '队列模式', '后台自动处理']}
      providerId="jimeng-video"
      type="video"
      icon={Video}
      uploadHint="上传产品图可生成更贴合实物的广告视频"
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'jimeng-video',
        duration,
        resolution,
        aspectRatio,
        count,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            icon="📐"
            label="视频比例"
            options={ASPECT_RATIOS}
            value={aspectRatio}
            onChange={setAspectRatio}
          />
          <OptionSelector
            icon="🎯"
            label="清晰度"
            options={RESOLUTIONS}
            value={resolution}
            onChange={setResolution}
          />
          <OptionSelector
            icon="⏱️"
            label="生成时长"
            options={DURATIONS}
            value={duration}
            onChange={setDuration}
          />
          <OptionSelector
            icon="🔢"
            label="生成数量"
            options={COUNTS}
            value={count}
            onChange={setCount}
          />
        </>
      )}
      estimateCost={() => duration * count * 5}
    />
  );
}
