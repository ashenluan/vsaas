'use client';

import { useState } from 'react';
import { ModelGenerationPage, OptionSelector } from '@/components/generation/model-generation-page';
import { estimateModelCredits, useGenerationPricingCatalog } from '@/lib/generation-pricing';
import { ImageIcon } from 'lucide-react';

const MODELS = [
  { label: '万相 2.6', value: 'wan2.6-t2i', desc: '推荐·同步' },
  { label: '万相 2.5', value: 'wan2.5-t2i-preview', desc: '推荐·自由尺寸' },
  { label: '万相 2.2 极速', value: 'wan2.2-t2i-flash', desc: '快50%' },
  { label: '万相 2.2 专业', value: 'wan2.2-t2i-plus', desc: '高质量' },
  { label: '万相 2.1 极速', value: 'wanx2.1-t2i-turbo', desc: '快速' },
  { label: '万相 2.1 专业', value: 'wanx2.1-t2i-plus', desc: '稳定' },
  { label: '万相 2.0 极速', value: 'wanx2.0-t2i-turbo', desc: '经济' },
];

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
  const [model, setModel] = useState('wan2.6-t2i');
  const [size, setSize] = useState('1024x1024');
  const [resolution, setResolution] = useState('1k');
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState('');
  const [promptExtend, setPromptExtend] = useState(true);
  const pricingCatalog = useGenerationPricingCatalog();

  const [w, h] = size.split('x').map(Number);

  return (
    <ModelGenerationPage
      modelName="Qwen 图片生成"
      modelDesc="通义万相图片生成，支持多模型切换、文生图和图生图"
      providerId="qwen"
      type="image"
      icon={ImageIcon}
      showNegativePrompt
      maxReferenceImages={3}
      uploadLabel="参考图片（可选，最多3张）"
      buildPayload={(prompt, negativePrompt, referenceImage) => ({
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: w,
        height: h,
        providerId: 'qwen',
        model,
        resolution,
        count,
        seed: seed ? Number(seed) : undefined,
        promptExtend,
        referenceImage,
      })}
      renderParameters={() => (
        <>
          <OptionSelector
            icon="🤖"
            label="选择模型"
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
          <div className="mb-4">
            <label className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>🎲</span> 随机种子
            </label>
            <input
              type="number"
              min={0}
              max={2147483647}
              placeholder="留空则随机"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
            />
            <p className="mt-1 text-[11px] text-muted-foreground/60">相同种子+相同参数可复现结果</p>
          </div>
          <div className="mb-4">
            <label className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>✍️</span> 提示词智能改写
            </label>
            <button
              onClick={() => setPromptExtend(!promptExtend)}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                promptExtend
                  ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              {promptExtend ? '已开启' : '已关闭'}
            </button>
            <p className="mt-1 text-[11px] text-muted-foreground/60">开启后使用大模型优化提示词，短提示词提升明显（+3~4秒）</p>
          </div>
        </>
      )}
      estimateCost={() =>
        estimateModelCredits(
          pricingCatalog,
          'qwen',
          resolution === '2k' ? 'qwen-image-2k' : 'qwen-image-1k',
          { count },
        )
      }
    />
  );
}
