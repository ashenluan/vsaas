'use client';

import { useState, useEffect } from 'react';
import { voiceApi } from '@/lib/api';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { Mic2, Globe, Volume2, Loader2 } from 'lucide-react';

export function VoiceSelectSection() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const { globalConfig, updateGlobalConfig } = useMixcutStore();

  const selectedVoiceId = (globalConfig as any).voiceId || '';

  useEffect(() => {
    voiceApi.list().then((data) => {
      setVoices(data.filter((v: any) => v.status === 'READY'));
    }).finally(() => setLoading(false));
  }, []);

  const handlePreview = async (voiceId: string) => {
    setPreviewingId(voiceId);
    try {
      const result = await voiceApi.preview(voiceId, '欢迎使用智能混剪功能');
      if (result?.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
        audio.onended = () => setPreviewingId(null);
      } else {
        setPreviewingId(null);
      }
    } catch {
      setPreviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] text-muted-foreground">加载声音列表...</span>
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <Mic2 className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/50" />
        <p className="text-[11px] text-muted-foreground">暂无可用声音</p>
        <p className="text-[10px] text-muted-foreground">请先到「声音管理」克隆声音</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* None option */}
      <button
        onClick={() => updateGlobalConfig({ voiceId: undefined } as any)}
        className={`w-full rounded-lg border p-2.5 text-left text-[11px] transition-all ${
          !selectedVoiceId
            ? 'border-primary bg-primary/5 font-medium text-primary'
            : 'hover:border-primary/50'
        }`}
      >
        不使用配音
      </button>

      {/* Voice grid */}
      <div className="grid grid-cols-1 gap-2">
        {voices.map((voice: any) => {
          const isSelected = selectedVoiceId === voice.voiceId;
          const isPreviewing = previewingId === voice.voiceId;
          return (
            <button
              key={voice.id}
              onClick={() => updateGlobalConfig({ voiceId: voice.voiceId } as any)}
              className={`group relative rounded-lg border p-2.5 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                  : 'hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? 'border-primary bg-primary text-white' : 'border-input'
                    }`}
                  >
                    {isSelected && <span className="text-[8px]">✓</span>}
                  </div>
                  <span className="text-[11px] font-medium">{voice.name}</span>
                  {voice.isPublic && (
                    <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600">
                      <Globe size={8} /> 公共
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(voice.voiceId);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent transition-colors"
                >
                  {isPreviewing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Volume2 size={12} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
