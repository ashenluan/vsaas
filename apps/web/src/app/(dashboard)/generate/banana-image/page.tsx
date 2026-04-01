'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { ImageIcon } from 'lucide-react';

const SIZES = [
  { label: '1:1', value: '1024x1024', desc: '方形' },
  { label: '5:3', value: '1280x768', desc: '横版' },
  { label: '3:5', value: '768x1280', desc: '竖版' },
];

const COUNTS = [
  { label: '1 张', value: 1 },
  { label: '2 张', value: 2 },
  { label: '4 张', value: 4 },
];

export default function BananaImagePage() {
  const [size, setSize] = useState('1024x1024');
  const [count, setCount] = useState(1);

  const [w, h] = size.split('x').map(Number);

  return (
    <ModelGenerationPage
      modelName="Banana 作图"
      modelDesc="Google Imagen 3.0 · 超高质量图片生成"
      providerId="google-imagen"
      type="image"
      icon={ImageIcon}
      showNegativePrompt
      buildPayload={(prompt, negativePrompt, referenceImage) => ({
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: w,
        height: h,
        providerId: 'google-imagen',
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
      estimateCost={() => count * 10}
    />
  );
}
