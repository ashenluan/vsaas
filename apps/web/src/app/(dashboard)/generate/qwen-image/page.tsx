'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { ImageIcon } from 'lucide-react';

const SIZES = [
  { label: '1:1', value: '1024x1024' },
  { label: '2:3', value: '1024x1536' },
  { label: '3:2', value: '1536x1024' },
  { label: '3:4', value: '768x1024' },
  { label: '4:3', value: '1024x768' },
  { label: '9:16', value: '720x1280' },
  { label: '16:9', value: '1280x720' },
  { label: '21:9', value: '1680x720' },
];

const RESOLUTIONS = [
  { label: '1K', value: '1k', desc: '标准' },
  { label: '2K', value: '2k', desc: '高清' },
];

const COUNTS = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
];

export default function QwenImagePage() {
  const [size, setSize] = useState('1024x1024');
  const [resolution, setResolution] = useState('1k');
  const [count, setCount] = useState(1);

  const [w, h] = size.split('x').map(Number);

  return (
    <ModelGenerationPage
      modelName="Qwen 图片生成"
      modelDesc="通义万相图片生成，支持文生图和图生图"
      providerId="qwen"
      type="image"
      icon={ImageIcon}
      maxReferenceImages={3}
      uploadLabel="参考图片（可选，最多3张）"
      buildPayload={(prompt, negativePrompt, referenceImage) => ({
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: w,
        height: h,
        providerId: 'qwen',
        resolution,
        count,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            icon="📐"
            label="图片比例"
            options={SIZES}
            value={size}
            onChange={setSize}
          />
          <OptionSelector
            icon="🎯"
            label="分辨率"
            options={RESOLUTIONS}
            value={resolution}
            onChange={setResolution}
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
      estimateCost={() => count * (resolution === '2k' ? 8 : 5)}
    />
  );
}
