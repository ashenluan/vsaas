'use client';

import { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { voiceApi, mixcutApi } from '@/lib/api';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { Mic2, Globe, Volume2, Loader2, ChevronDown, Search } from 'lucide-react';

type ImsVoice = { id: string; label: string; desc: string };

// Group voice categories into models
const MODEL_GROUPS: { model: string; label: string; desc: string; categories: string[] }[] = [
  {
    model: 'emotion',
    label: '多情感语音',
    desc: '支持多种情感表达',
    categories: ['多情感(荐)'],
  },
  {
    model: 'cosyvoice-v2',
    label: 'CosyVoice v2',
    desc: '新一代自然语音',
    categories: ['CosyVoice v2'],
  },
  {
    model: 'cosyvoice-v1',
    label: 'CosyVoice v1',
    desc: '经典自然语音',
    categories: ['CosyVoice v1'],
  },
];

export function VoiceSelectSection() {
  const [clonedVoices, setClonedVoices] = useState<any[]>([]);
  const [imsVoices, setImsVoices] = useState<Record<string, ImsVoice[]>>({});
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builtin' | 'cloned'>('builtin');
  const [activeModel, setActiveModel] = useState('emotion');
  const [searchQuery, setSearchQuery] = useState('');
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

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

  // Build available models based on actual voice data
  const availableModels = useMemo(() => {
    const cats = Object.keys(imsVoices);
    // First check known model groups
    const models = MODEL_GROUPS.filter((mg) =>
      mg.categories.some((c) => cats.includes(c)),
    );
    // Add any unmatched categories as "other" model
    const matchedCats = new Set(models.flatMap((m) => m.categories));
    const unmatchedCats = cats.filter((c) => !matchedCats.has(c));
    if (unmatchedCats.length > 0) {
      models.push({
        model: 'other',
        label: '其他音色',
        desc: '更多声音选择',
        categories: unmatchedCats,
      });
    }
    return models;
  }, [imsVoices]);

  // Voices for current model
  const currentModelVoices = useMemo(() => {
    const model = availableModels.find((m) => m.model === activeModel);
    if (!model) return [];
    const voices: ImsVoice[] = [];
    for (const cat of model.categories) {
      if (imsVoices[cat]) voices.push(...imsVoices[cat]);
    }
    if (!searchQuery.trim()) return voices;
    const q = searchQuery.trim().toLowerCase();
    return voices.filter(
      (v) => v.label.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q) || v.id.toLowerCase().includes(q),
    );
  }, [activeModel, availableModels, imsVoices, searchQuery]);

  // Total builtin voice count
  const totalBuiltinCount = Object.values(imsVoices).reduce((sum, arr) => sum + arr.length, 0);

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

  // Find which model the currently selected voice belongs to
  const selectedVoiceModel = useMemo(() => {
    if (!selectedVoiceId || selectedVoiceType !== 'builtin') return null;
    for (const model of availableModels) {
      for (const cat of model.categories) {
        if (imsVoices[cat]?.some((v) => v.id === selectedVoiceId)) {
          return model.model;
        }
      }
    }
    return null;
  }, [selectedVoiceId, selectedVoiceType, availableModels, imsVoices]);

  // Find selected voice label
  const selectedVoiceLabel = useMemo(() => {
    if (!selectedVoiceId) return null;
    if (selectedVoiceType === 'cloned') {
      return clonedVoices.find((v) => v.voiceId === selectedVoiceId)?.name;
    }
    for (const voices of Object.values(imsVoices)) {
      const found = voices.find((v) => v.id === selectedVoiceId);
      if (found) return found.label;
    }
    return null;
  }, [selectedVoiceId, selectedVoiceType, imsVoices, clonedVoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] text-muted-foreground">加载声音列表...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Current selection indicator */}
      {selectedVoiceId && selectedVoiceLabel && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <Volume2 size={11} className="text-primary" />
            <span className="text-[11px] font-medium text-primary">{selectedVoiceLabel}</span>
            <span className="text-[9px] text-muted-foreground">
              {selectedVoiceType === 'cloned' ? '(克隆)' : selectedVoiceModel ? `(${availableModels.find((m) => m.model === selectedVoiceModel)?.label || ''})` : ''}
            </span>
          </div>
          <button
            onClick={() => updateGlobalConfig({ voiceId: undefined, voiceType: undefined } as any)}
            className="text-[10px] text-muted-foreground hover:text-destructive"
          >
            清除
          </button>
        </div>
      )}

      {/* Tab switcher: builtin / cloned */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
        <button
          onClick={() => setActiveTab('builtin')}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
            activeTab === 'builtin'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          系统音色 ({totalBuiltinCount})
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
      {!selectedVoiceId && (
        <div className="w-full rounded-lg border border-primary bg-primary/5 p-2.5 text-center text-[11px] font-medium text-primary">
          当前未选择配音
        </div>
      )}

      {activeTab === 'builtin' ? (
        <div className="space-y-2">
          {/* Model switcher */}
          {availableModels.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
              {availableModels.map((m) => (
                <button
                  key={m.model}
                  onClick={() => { setActiveModel(m.model); setSearchQuery(''); }}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                    activeModel === m.model
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-input hover:border-primary/30'
                  }`}
                >
                  <div className={`text-[11px] font-medium ${activeModel === m.model ? 'text-primary' : 'text-foreground'}`}>
                    {m.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索声音..."
              className="flex h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Voice grid */}
          {currentModelVoices.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-muted-foreground">
              {searchQuery ? '未找到匹配的声音' : '暂无音色'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto">
              {currentModelVoices.map((voice) => {
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
