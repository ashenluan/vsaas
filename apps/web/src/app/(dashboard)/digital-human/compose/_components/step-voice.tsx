'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer } from './shared';
import { Mic2, Globe } from 'lucide-react';

export function StepVoice({ voices }: { voices: any[] }) {
  const { selectedVoice, setSelectedVoice } = useComposeStore();
  const readyVoices = voices.filter((v: any) => v.status === 'READY');

  return (
    <StepContainer title="选择克隆声音" description="选择一个已克隆的声音用于数字人口播" canNext={!!selectedVoice}>
      {readyVoices.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Mic2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无可用声音，请先到「声音管理」页面克隆声音</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readyVoices.map((voice: any) => {
            const isPublic = voice.isPublic;
            const isSelected = selectedVoice === voice.voiceId;
            return (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.voiceId)}
                className={`group relative rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-md'
                    : 'bg-card hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{voice.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(voice.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  {isPublic && (
                    <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">
                      <Globe size={10} /> 公共
                    </span>
                  )}
                </div>
                {/* 选中指示器 */}
                <div className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? 'border-primary bg-primary text-white' : 'border-input group-hover:border-primary/50'
                }`}>
                  {isSelected && <span className="text-[10px]">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </StepContainer>
  );
}
