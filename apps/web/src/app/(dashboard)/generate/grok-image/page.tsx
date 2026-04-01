'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { ImageIcon } from 'lucide-react';

const SIZES = [
  { label: 'Auto', value: 'auto', desc: '自动' },
  { label: '1:1', value: '1024x1024', desc: '方形' },
  { label: '3:2', value: '1536x1024', desc: '横版' },
  { label: '2:3', value: '1024x1536', desc: '竖版' },
];

export default function GrokImagePage() {
  const [size, setSize] = useState('auto');

  const getWidthHeight = () => {
    if (size === 'auto') return { width: 1024, height: 1024 };
    const [w, h] = size.split('x').map(Number);
    return { width: w, height: h };
  };

  return (
    <ModelGenerationPage
      modelName="Grok 图生图"
      modelDesc="基于参考图片生成新图片"
      providerId="grok"
      type="image"
      icon={ImageIcon}
      buildPayload={(prompt, negativePrompt, referenceImage) => {
        const { width, height } = getWidthHeight();
        return {
          prompt,
          negativePrompt: negativePrompt || undefined,
          width,
          height,
          providerId: 'grok',
          count: 2,
          referenceImage,
        };
      }}
      renderParameters={() => (
        <OptionSelector
          icon="📐"
          label="图片尺寸"
          options={SIZES}
          value={size}
          onChange={setSize}
        />
      )}
      estimateCost={() => 10}
    />
  );
}
