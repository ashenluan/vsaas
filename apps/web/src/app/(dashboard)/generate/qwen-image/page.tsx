'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { ImageIcon } from 'lucide-react';

const SIZES = [
  { label: '1:1', value: '1024x1024', desc: '方形' },
  { label: '9:16', value: '720x1280', desc: '竖版' },
  { label: '16:9', value: '1280x720', desc: '横版' },
];

const COUNTS = [
  { label: '1 张', value: 1 },
  { label: '2 张', value: 2 },
  { label: '4 张', value: 4 },
];

export default function QwenImagePage() {
  const [size, setSize] = useState('1024x1024');
  const [count, setCount] = useState(1);

  const [w, h] = size.split('x').map(Number);

  return (
    <ModelGenerationPage
      modelName="Qwen 图片"
      modelDesc="阿里通义万相 Wan2.6 · 国产高质量图片生成"
      providerId="qwen"
      type="image"
      icon={ImageIcon}
      showNegativePrompt
      buildPayload={(prompt, negativePrompt, referenceImage) => ({
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: w,
        height: h,
        providerId: 'qwen',
        count,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            label="图片尺寸"
            options={SIZES}
            value={size}
            onChange={setSize}
          />
          <OptionSelector
            label="生成数量"
            options={COUNTS}
            value={count}
            onChange={setCount}
          />
        </>
      )}
      estimateCost={() => count * 5}
    />
  );
}
