'use client';

import { useState, useEffect } from 'react';
import { voiceApi, mixcutApi } from '@/lib/api';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { Mic2, Globe, Volume2, Loader2, ChevronDown } from 'lucide-react';

type ImsVoice = { id: string; label: string; desc: string };

export function VoiceSelectSection() {
  const [clonedVoices, setClonedVoices] = useState<any[]>([]);
  const [imsVoices, setImsVoices] = useState<Record<string, ImsVoice[]>>({});
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builtin' | 'cloned'>('builtin');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { globalConfig, updateGlobalConfig } = useMixcutStore();

  const selectedVoiceId = (globalConfig as any).voiceId || '';
  const selectedVoiceType = (globalConfig as any).voiceType || 'builtin';

  useEffect(() => {
    Promise.all([
      voiceApi.list().then((data) => {
        setClonedVoices(data.filter((v: any) => v.status === 'READY'));
      }),
      mixcutApi.getOptions().then((opts) => {
        if (opts?.imsVoices) setImsVoices(opts.imsVoices);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSelectBuiltin = (voiceId: string) => {
    updateGlobalConfig({ voiceId, voiceType: 'builtin' } as any);
  };

  const handleSelectCloned = (voiceId: string) => {
    updateGlobalConfig({ voiceId, voiceType: 'cloned' } as any);
  };

  const handlePreview = async (voiceId: string, type?: 'builtin' | 'cloned') => {
    setPreviewingId(voiceId);
    try {
      const result = await voiceApi.preview(voiceId, '欢迎使用智能混剪功能', type);
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

  const imsCategories = Object.keys(imsVoices);

  return (
    <div className="space-y-2">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
        <button
          onClick={() => setActiveTab('builtin')}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
            activeTab === 'builtin'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          系统音色 ({imsCategories.reduce((sum, k) => sum + imsVoices[k].length, 0)})
        </button>
        <button
          onClick={() => setActiveTab('cloned')}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
            activeTab === 'cloned'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          克隆声音 ({clonedVoices.length})
        </button>
      </div>

      {/* None option */}
      <button
        onClick={() => updateGlobalConfig({ voiceId: undefined, voiceType: undefined } as any)}
        className={`w-full rounded-lg border p-2.5 text-left text-[11px] transition-all ${
          !selectedVoiceId
            ? 'border-primary bg-primary/5 font-medium text-primary'
            : 'hover:border-primary/50'
        }`}
      >
        不使用配音
      </button>

      {activeTab === 'builtin' ? (
        /* IMS Built-in voices grouped by category */
        <div className="space-y-1">
          {imsCategories.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-muted-foreground">暂无系统音色</p>
          ) : (
            imsCategories.map((category) => (
              <div key={category} className="rounded-lg border">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium hover:bg-accent/50 transition-colors"
                >
                  <span>{category} ({imsVoices[category].length})</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedCategory === category && (
                  <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                    {imsVoices[category].map((voice) => {
                      const isSelected = selectedVoiceId === voice.id && selectedVoiceType === 'builtin';
                      const isPreviewing = previewingId === voice.id;
                      return (
                        <button
                          key={voice.id}
                          onClick={() => handleSelectBuiltin(voice.id)}
                          className={`group relative rounded-md border px-2 py-1.5 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-medium">{voice.label}</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(voice.id, 'builtin');
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                            >
                              {isPreviewing ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Volume2 size={10} className="text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <div className="text-[9px] text-muted-foreground">{voice.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Cloned voices */
        <div className="space-y-2">
          {clonedVoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Mic2 className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/50" />
              <p className="text-[11px] text-muted-foreground">暂无克隆声音</p>
              <p className="text-[10px] text-muted-foreground">请先到「声音管理」克隆声音</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {clonedVoices.map((voice: any) => {
                const isSelected = selectedVoiceId === voice.voiceId && selectedVoiceType === 'cloned';
                const isPreviewing = previewingId === voice.voiceId;
                return (
                  <button
                    key={voice.id}
                    onClick={() => handleSelectCloned(voice.voiceId)}
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
          )}
        </div>
      )}
    </div>
  );
}
