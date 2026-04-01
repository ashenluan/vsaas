'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { Video } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '9:16 竖屏', value: '9:16', desc: '抖音/快手' },
  { label: '16:9 横屏', value: '16:9', desc: '传统广告' },
];

const MODELS = [
  { label: 'Sora', value: 'sora', desc: '标准版' },
  { label: 'Sora-Pro', value: 'sora-pro', desc: '专业版' },
];

const DURATIONS = [
  { label: '10 秒', value: 10, desc: 'sora/pro' },
  { label: '15 秒', value: 15, desc: 'sora/pro' },
  { label: '25 秒', value: 25, desc: '仅 Pro' },
];

const COUNTS = [
  { label: '1 条', value: 1 },
  { label: '3 条', value: 3 },
  { label: '5 条', value: 5 },
  { label: '10 条', value: 10 },
];

export default function SoraVideoPage() {
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [model, setModel] = useState('sora');
  const [duration, setDuration] = useState(10);
  const [count, setCount] = useState(1);

  return (
    <ModelGenerationPage
      modelName="Sora 视频生成"
      modelDesc="OpenAI Sora · 电影级视频生成"
      descTags={['队列模式', '提交即返回', '后台自动处理', '失败自动重试']}
      providerId="openai-sora"
      type="video"
      icon={Video}
      uploadHint="上传产品图可生成更贴合实物的广告视频"
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'openai-sora',
        model,
        duration,
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
            icon="🤖"
            label="生成模型"
            options={MODELS}
            value={model}
            onChange={setModel}
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
      estimateCost={() => duration * count * (model === 'sora-pro' ? 25 : 20)}
    />
  );
}
