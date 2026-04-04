'use client';

import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer } from './shared';
import { Cpu, Camera } from 'lucide-react';

export function StepChannel() {
  const { channel, setChannel } = useDhV2Store();

  return (
    <StepContainer
      title="选择通道"
      description="选择数字人驱动方式：内置数字人（无需 S2V）或自定义照片"
      canNext={!!channel}
      showPrev={false}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
        {/* Channel A */}
        <button
          onClick={() => setChannel('A')}
          className={`group relative rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
            channel === 'A'
              ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-lg'
              : 'border-border hover:border-primary/50 hover:shadow-md'
          }`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Cpu className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold">通道 A — 内置数字人</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            使用阿里云 IMS 系统预置数字人（如云乔等），无需 S2V 渲染，速度更快。
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">速度快</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">25+ 形象</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">免 S2V</span>
          </div>
          {channel === 'A' && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">✓</div>
          )}
        </button>

        {/* Channel B */}
        <button
          onClick={() => setChannel('B')}
          className={`group relative rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
            channel === 'B'
              ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-lg'
              : 'border-border hover:border-primary/50 hover:shadow-md'
          }`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <Camera className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-base font-semibold">通道 B — 自定义照片</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            使用您上传的自定义照片，通过万相 S2V 生成数字人视频，形象完全自定义。
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">自定义形象</span>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">S2V 驱动</span>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">高还原</span>
          </div>
          {channel === 'B' && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">✓</div>
          )}
        </button>
      </div>
    </StepContainer>
  );
}
