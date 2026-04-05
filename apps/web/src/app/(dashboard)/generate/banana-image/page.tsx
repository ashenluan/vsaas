'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { estimateModelCredits, useGenerationPricingCatalog } from '@/lib/generation-pricing';
import { ImageIcon } from 'lucide-react';

const MODELS = [
  { label: '🍌 Banana Pro', value: 'banana-pro' },
  { label: '🍌 Banana 2', value: 'banana-2' },
];

const SIZES = [
  { label: '1:1', value: '1024x1024' },
  { label: '4:3', value: '1024x768' },
  { label: '3:4', value: '768x1024' },
  { label: '16:9', value: '1280x720' },
  { label: '9:16', value: '720x1280' },
  { label: '2:3', value: '1024x1536' },
  { label: '3:2', value: '1536x1024' },
  { label: '21:9', value: '1680x720' },
];

const OUTPUT_SIZES = [
  { label: '1K', value: '1k', desc: '标准' },
  { label: '2K', value: '2k', desc: '高清' },
  { label: '4K', value: '4k', desc: '超清' },
];

const COUNTS = [
  { label: '1 张', value: 1 },
  { label: '3 张', value: 3 },
  { label: '5 张', value: 5 },
  { label: '10 张', value: 10 },
];

export default function BananaImagePage() {
  const [model, setModel] = useState('banana-pro');
  const [size, setSize] = useState('1024x1024');
  const [outputSize, setOutputSize] = useState('1k');
  const [count, setCount] = useState(1);
  const pricingCatalog = useGenerationPricingCatalog();

  const [w, h] = size.split('x').map(Number);

  return (
    <ModelGenerationPage
      modelName="Nano Banana"
      modelDesc="选择 Banana 模型，输入提示词，生成专业级图片"
      titleIcon="🍌"
      providerId="google-imagen"
      type="image"
      icon={ImageIcon}
      promptPlaceholder="详细的描述可以获得更好的生成效果..."
      buildPayload={(prompt, negativePrompt, referenceImage) => ({
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: w,
        height: h,
        providerId: 'google-imagen',
        model,
        outputSize,
        count,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            icon="🤖"
            label="选择模型版本"
            options={MODELS}
            value={model}
            onChange={setModel}
          />
          <OptionSelector
            icon="📐"
            label="图片比例"
            options={SIZES}
            value={size}
            onChange={setSize}
          />
          <OptionSelector
            icon="🖼️"
            label="输出尺寸"
            options={OUTPUT_SIZES}
            value={outputSize}
            onChange={setOutputSize}
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
      estimateCost={() =>
        estimateModelCredits(
          pricingCatalog,
          'google-imagen',
          outputSize === '4k' ? 'banana-4k' : outputSize === '2k' ? 'banana-2k' : 'banana-1k',
          { count },
        )
      }
    />
  );
}
