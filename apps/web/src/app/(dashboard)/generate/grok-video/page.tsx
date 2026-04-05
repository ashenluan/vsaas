'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { estimateModelCredits, useGenerationPricingCatalog } from '@/lib/generation-pricing';
import { Video } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '1:1', value: '1:1' },
  { label: '9:16', value: '9:16', desc: '竖屏视频' },
  { label: '16:9', value: '16:9', desc: '横屏视频' },
];

const RESOLUTIONS = [
  { label: '720P', value: '720p', desc: '标准清晰度' },
  { label: '1080P', value: '1080p', desc: '高清' },
];

const DURATIONS = [
  { label: '6 秒', value: 6, desc: '标准时长' },
  { label: '10 秒', value: 10, desc: '更长时长' },
];

export default function GrokVideoPage() {
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(6);
  const pricingCatalog = useGenerationPricingCatalog();

  return (
    <ModelGenerationPage
      modelName="Grok 视频生成"
      modelDesc="xAI Grok-2 Video · 高质量AI视频生成"
      descTags={['队列模式', '提交即返回', '后台自动处理', '失败自动重试']}
      providerId="grok-video"
      type="video"
      icon={Video}
      uploadHint="上传产品图可生成更贴合实物的广告视频"
      buildPayload={(prompt, _neg, referenceImage) => ({
        prompt,
        providerId: 'grok-video',
        duration,
        resolution,
        aspectRatio,
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
        </>
      )}
      estimateCost={() => estimateModelCredits(pricingCatalog, 'grok', 'grok-video', { duration })}
    />
  );
}
