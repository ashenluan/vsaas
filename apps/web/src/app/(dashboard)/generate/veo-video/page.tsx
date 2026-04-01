'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { Video } from 'lucide-react';

const MODELS = [
  { label: '快速模式', value: 'fast', desc: '快速生成' },
  { label: '标准模式', value: 'standard', desc: '平衡质量' },
  { label: '质量模式', value: 'quality', desc: '超高质量' },
];

const ASPECT_RATIOS = [
  { label: '9:16', value: '9:16', desc: '竖屏视频' },
  { label: '16:9 HD', value: '16:9', desc: '横屏视频' },
];

const COUNTS = [
  { label: '1 条', value: 1 },
  { label: '3 条', value: 3 },
  { label: '5 条', value: 5 },
  { label: '10 条', value: 10 },
];

export default function VeoVideoPage() {
  const [model, setModel] = useState('fast');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [count, setCount] = useState(1);

  return (
    <ModelGenerationPage
      modelName="Veo 视频生成"
      modelDesc="Google Veo 3.1 · 顶级视频生成模型"
      descTags={['Google 最新视频模型', '队列模式', '自动配音', '智能优化']}
      providerId="veo"
      type="video"
      icon={Video}
      uploadLabel="首尾帧设置"
      uploadHint="上传 1 张图片作为视频的首帧，AI 会基于此图片生成视频内容"
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'veo',
        model,
        aspectRatio,
        count,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            icon="🎬"
            label="模型"
            options={MODELS}
            value={model}
            onChange={setModel}
          />
          <OptionSelector
            icon="📐"
            label="宽高比"
            options={ASPECT_RATIOS}
            value={aspectRatio}
            onChange={setAspectRatio}
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
      estimateCost={() => count * (model === 'quality' ? 44 : model === 'standard' ? 30 : 20)}
    />
  );
}
