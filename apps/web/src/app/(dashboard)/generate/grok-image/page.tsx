'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { ImageIcon } from 'lucide-react';

const SIZES = [
  { label: '1:1', value: '1024x1024', desc: '方形' },
  { label: '2:3', value: '1024x1536', desc: '竖版' },
  { label: '3:2', value: '1536x1024', desc: '横版' },
];

const COUNTS = [
  { label: '1 张', value: 1 },
  { label: '2 张', value: 2 },
  { label: '4 张', value: 4 },
];

export default function GrokImagePage() {
  const [size, setSize] = useState('1024x1024');
  const [count, setCount] = useState(1);

  const [w, h] = size.split('x').map(Number);

  return (
    <ModelGenerationPage
      modelName="Grok 图片"
      modelDesc="xAI Grok-2 Image · 高质量AI图片生成"
      providerId="grok"
      type="image"
      icon={ImageIcon}
      showNegativePrompt
      buildPayload={(prompt, negativePrompt, referenceImage) => ({
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: w,
        height: h,
        providerId: 'grok',
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
      estimateCost={() => count * 8}
    />
  );
}
