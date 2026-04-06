'use client';

import { useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import { aiApi, voiceApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { X, Plus, Trash2, Wand2, Loader2, AlertTriangle, CheckCircle, Volume2, Mic2, Ban } from 'lucide-react';
import { COPY_TEMPLATES } from './constants';

export function SubtitleContent({
  shotId,
  subtitles,
  disabled,
  disabledMessage,
  onAdd,
  onUpdate,
  onRemove,
  highlightWords,
  setHighlightWords,
  forbiddenWords,
  setForbiddenWords,
}: {
  shotId: string;
  subtitles: { text: string; voiceId?: string }[];
  disabled?: boolean;
  disabledMessage?: string;
  onAdd: () => void;
  onUpdate: (i: number, data: { text?: string; voiceId?: string }) => void;
  onRemove: (i: number) => void;
  highlightWords: { word: string; fontColor: string; bold: boolean }[];
  setHighlightWords: (w: { word: string; fontColor: string; bold: boolean }[]) => void;
  forbiddenWords: { word: string; soundReplaceMode: 'mute' | 'beep' }[];
  setForbiddenWords: (w: { word: string; soundReplaceMode: 'mute' | 'beep' }[]) => void;
}) {
  const [rewriteLoading, setRewriteLoading] = useState<number | null>(null);
  const [rewriteResults, setRewriteResults] = useState<{ index: number; variants: string[] } | null>(null);
  const [riskLoading, setRiskLoading] = useState<number | null>(null);
  const [riskResults, setRiskResults] = useState<{ index: number; safe: boolean; risks: { word: string; reason: string }[] } | null>(null);
  const [showCopyLib, setShowCopyLib] = useState(false);
  const [copyLibCategory, setCopyLibCategory] = useState('促销');
  const [asrLoading, setAsrLoading] = useState(false);
  const [voicePreviewLoading, setVoicePreviewLoading] = useState<number | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { globalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig })),
  );

  if (disabled) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
          {disabledMessage || '当前内容不可编辑。'}
        </div>
        {subtitles.length > 0 && (
          <div className="space-y-2">
            {subtitles.map((sub, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="mb-1 text-[11px] font-medium">镜头字幕{index + 1}</div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{sub.text || '未填写字幕内容'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleVoicePreview = async (index: number) => {
    const text = subtitles[index]?.text;
    const voiceId = subtitles[index]?.voiceId || (globalConfig as any).voiceId;
    if (!text || !voiceId) return;
    setVoicePreviewLoading(index);
    try {
      const result = await voiceApi.preview(voiceId, text.slice(0, 100));
      if (result?.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
        audio.onended = () => setVoicePreviewLoading(null);
      } else {
        setVoicePreviewLoading(null);
      }
    } catch {
      setVoicePreviewLoading(null);
    }
  };

  const handleAsrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAsrLoading(true);
    try {
      const { url } = await uploadToOSS(file);
      const res = await aiApi.transcribeAudio(url);
      const store = useMixcutStore.getState();
      for (const text of res.texts) {
        store.addSubtitleToShot(shotId, { text });
      }
    } catch { /* ignore */ }
    setAsrLoading(false);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleRewrite = async (index: number) => {
    const text = subtitles[index]?.text;
    if (!text) return;
    setRewriteLoading(index);
    setRewriteResults(null);
    try {
      const res = await aiApi.rewriteCopy(text, 3);
      setRewriteResults({ index, variants: res.variants });
    } catch { /* ignore */ }
    setRewriteLoading(null);
  };

  const handleRiskDetect = async (index: number) => {
    const text = subtitles[index]?.text;
    if (!text) return;
    setRiskLoading(index);
    setRiskResults(null);
    try {
      const res = await aiApi.detectRiskWords(text);
      setRiskResults({ index, safe: res.safe, risks: res.risks });
    } catch { /* ignore */ }
    setRiskLoading(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground">文字转语音消耗0.1个算力/100字</p>
      <p className="text-[10px] text-muted-foreground">
        支持直接输入 SSML。使用标签时请用 <code>{'<speak>'}</code> 包裹全文；普通音色支持 <code>{'<break>'}</code>、<code>{'<s>'}</code>、<code>{'<sub>'}</code>、<code>{'<w>'}</code>、<code>{'<phoneme>'}</code>、<code>{'<say-as>'}</code>，CosyVoice/克隆音色仅支持前三种。
      </p>

      <div>
        <h4 className="mb-2 text-[12px] font-medium">添加字幕内容</h4>
        <p className="mb-2 text-[10px] text-muted-foreground">如果添加了多组字幕&配音，将被平均分配给镜头组合</p>

        <div className="mb-2 flex gap-2">
          <button className="rounded border px-2.5 py-1 text-[11px] text-primary border-primary/30 bg-primary/5">手动设置字幕</button>
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={asrLoading}
            className="rounded border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            {asrLoading ? <><Loader2 size={10} className="inline animate-spin mr-0.5" />识别中...</> : '音频生成字幕'}
          </button>
          <input ref={audioInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleAsrUpload} />
          <button className="rounded border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">重点词管理</button>
          <button
            onClick={() => setShowCopyLib(!showCopyLib)}
            className={`rounded border px-2.5 py-1 text-[11px] transition-colors ${showCopyLib ? 'border-primary/30 bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
          >
            文案库选择
          </button>
          <button className="rounded border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            <Wand2 size={10} className="inline mr-0.5" /> 文案仿写
          </button>
        </div>
      </div>

      {/* Copy library panel */}
      {showCopyLib && (
        <CopywritingLibrary
          category={copyLibCategory}
          onCategoryChange={setCopyLibCategory}
          onSelect={(text) => {
            onAdd();
            setTimeout(() => {
              const store = useMixcutStore.getState();
              const shot = store.project.shotGroups.find((g) => g.id === shotId);
              if (shot) {
                const lastIdx = shot.subtitles.length - 1;
                if (lastIdx >= 0) store.updateSubtitleInShot(shotId, lastIdx, { text });
              }
            }, 50);
          }}
          onClose={() => setShowCopyLib(false)}
        />
      )}

      {/* Subtitles list */}
      <div className="space-y-3">
        {subtitles.map((sub, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium">字幕{i + 1}</span>
              <div className="flex gap-1.5">
                <button className="text-[10px] text-muted-foreground hover:text-primary">字幕特效设置</button>
                <button className="text-[10px] text-muted-foreground hover:text-primary">文案库导入</button>
                <button
                  onClick={() => handleVoicePreview(i)}
                  disabled={voicePreviewLoading === i || !sub.text || !(sub.voiceId || (globalConfig as any).voiceId)}
                  className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-50"
                  title={!(sub.voiceId || (globalConfig as any).voiceId) ? '请先选择配音声音' : '试听配音效果'}
                >
                  {voicePreviewLoading === i ? <><Loader2 size={10} className="inline animate-spin mr-0.5" />播放中...</> : <><Volume2 size={10} className="inline mr-0.5" />试听</>}
                </button>
                <button
                  onClick={() => handleRiskDetect(i)}
                  disabled={riskLoading === i}
                  className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {riskLoading === i ? <><Loader2 size={10} className="inline animate-spin mr-0.5" />检测中...</> : '风险词检测'}
                </button>
                <button
                  onClick={() => handleRewrite(i)}
                  disabled={rewriteLoading === i || !sub.text}
                  className="text-[10px] text-primary hover:underline disabled:opacity-50"
                >
                  {rewriteLoading === i ? <><Loader2 size={10} className="inline animate-spin mr-0.5" />仿写中...</> : <><Wand2 size={10} className="inline mr-0.5" />仿写</>}
                </button>
                <button
                  onClick={() => onRemove(i)}
                  className="text-[10px] text-muted-foreground hover:text-red-500"
                >
                  删除
                </button>
              </div>
            </div>
            <textarea
              value={sub.text}
              onChange={(e) => onUpdate(i, { text: e.target.value })}
              placeholder="输入字幕文案..."
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>预计时长: {Math.ceil((sub.text?.length || 0) / 5)}秒</span>
                <span>阅读速度: ~{Math.round((sub.text?.length || 0) / Math.max(Math.ceil((sub.text?.length || 0) / 5), 1))}字/秒</span>
                {(sub.voiceId || (globalConfig as any).voiceId) && (
                  <span className="flex items-center gap-0.5 text-primary">
                    <Mic2 size={9} /> 已配音
                  </span>
                )}
              </div>
              <span>{sub.text?.length || 0} / 2000</span>
            </div>

            {/* Risk detection results */}
            {riskResults && riskResults.index === i && (
              <div className={`mt-2 rounded-md border p-2 text-[11px] ${riskResults.safe ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                {riskResults.safe ? (
                  <div className="flex items-center gap-1 text-green-700">
                    <CheckCircle size={12} /> 未检测到风险词
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-amber-700 font-medium">
                      <AlertTriangle size={12} /> 检测到 {riskResults.risks.length} 个风险词
                    </div>
                    {riskResults.risks.map((r, ri) => (
                      <div key={ri} className="ml-4 text-amber-600">
                        <span className="font-medium text-red-600">{r.word}</span> — {r.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rewrite results */}
            {rewriteResults && rewriteResults.index === i && (
              <div className="mt-2 space-y-1.5 rounded-md border border-primary/20 bg-primary/5 p-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-primary">
                  <span><Wand2 size={10} className="inline mr-0.5" /> 仿写结果</span>
                  <button onClick={() => setRewriteResults(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                </div>
                {rewriteResults.variants.map((v, vi) => (
                  <div key={vi} className="flex items-start gap-1.5">
                    <p className="flex-1 text-[11px] leading-relaxed">{v}</p>
                    <button
                      onClick={() => { onUpdate(i, { text: v }); setRewriteResults(null); }}
                      className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                    >
                      使用
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="w-full rounded-lg border border-dashed py-2.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus size={12} className="inline mr-1" /> 添加字幕
      </button>

      {/* Highlight words */}
      <div className="border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[12px] font-medium">重点词管理</h4>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                const allText = subtitles.map((s) => s.text).join(' ');
                const words = allText.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
                const freq: Record<string, number> = {};
                words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
                const topWords = Object.entries(freq)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([w]) => w)
                  .filter((w) => !highlightWords.some((hw) => hw.word === w));
                if (topWords.length > 0) {
                  const newWords = topWords.map((w) => ({ word: w, fontColor: '#FF6B35', bold: true }));
                  setHighlightWords([...highlightWords, ...newWords]);
                }
              }}
              className="text-[10px] text-primary hover:underline"
            >
              智能提取
            </button>
            <button
              onClick={() => {
                setHighlightWords(highlightWords.filter((hw) => hw.word.trim()));
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              清除空项
            </button>
          </div>
        </div>

        {/* Batch import */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="批量输入关键词，用逗号分隔（如：优惠,限时,爆款）"
            className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-[11px] placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = (e.target as HTMLInputElement).value.trim();
                if (!input) return;
                const words = input.split(/[,，、\s]+/).filter(Boolean);
                const newWords = words
                  .filter((w) => !highlightWords.some((hw) => hw.word === w))
                  .map((w) => ({ word: w, fontColor: '#FF6B35', bold: true }));
                if (newWords.length > 0) {
                  setHighlightWords([...highlightWords, ...newWords]);
                }
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          {highlightWords.map((hw, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={hw.word}
                onChange={(e) => {
                  const updated = [...highlightWords];
                  updated[i] = { ...updated[i], word: e.target.value };
                  setHighlightWords(updated);
                }}
                placeholder="关键词"
                className="flex h-7 w-28 rounded border border-input bg-transparent px-2 text-[11px]"
              />
              <input
                type="color"
                value={hw.fontColor}
                onChange={(e) => {
                  const updated = [...highlightWords];
                  updated[i] = { ...updated[i], fontColor: e.target.value };
                  setHighlightWords(updated);
                }}
                className="h-7 w-7 cursor-pointer rounded border p-0.5"
              />
              <button
                onClick={() => {
                  const updated = [...highlightWords];
                  updated[i] = { ...updated[i], bold: !updated[i].bold };
                  setHighlightWords(updated);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded border text-[11px] font-bold transition-colors ${
                  hw.bold ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                }`}
              >
                B
              </button>
              <button
                onClick={() => setHighlightWords(highlightWords.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setHighlightWords([...highlightWords, { word: '', fontColor: '#FF6B35', bold: true }])}
            className="text-[11px] text-primary hover:underline"
          >
            + 添加关键词
          </button>
        </div>

        {/* Preview */}
        {highlightWords.filter((hw) => hw.word).length > 0 && subtitles.length > 0 && (
          <div className="mt-2 rounded-md border bg-muted/30 p-2">
            <p className="mb-1 text-[10px] text-muted-foreground">预览效果</p>
            <p className="text-[11px] leading-relaxed">
              {(() => {
                const text = subtitles[0]?.text || '';
                if (!text) return <span className="text-muted-foreground">暂无文案</span>;
                const activeWords = highlightWords.filter((hw) => hw.word && text.includes(hw.word));
                if (activeWords.length === 0) return text;
                const regex = new RegExp(`(${activeWords.map((hw) => hw.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
                const parts = text.split(regex);
                return parts.map((part, pi) => {
                  const match = activeWords.find((hw) => hw.word === part);
                  if (match) {
                    return <span key={pi} style={{ color: match.fontColor, fontWeight: match.bold ? 'bold' : 'normal' }}>{part}</span>;
                  }
                  return <span key={pi}>{part}</span>;
                });
              })()}
            </p>
          </div>
        )}
      </div>

      {/* Forbidden words */}
      <div className="border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[12px] font-medium flex items-center gap-1">
            <Ban size={12} /> 屏蔽词管理
          </h4>
          <button
            onClick={() => setForbiddenWords(forbiddenWords.filter((fw) => fw.word.trim()))}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            清除空项
          </button>
        </div>
        <p className="mb-2 text-[10px] text-muted-foreground">配音遇到屏蔽词时自动静音或用"嘀"声替代</p>

        {/* Batch import */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="批量输入屏蔽词，用逗号分隔"
            className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-[11px] placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = (e.target as HTMLInputElement).value.trim();
                if (!input) return;
                const words = input.split(/[,，、\s]+/).filter(Boolean);
                const newWords = words
                  .filter((w) => !forbiddenWords.some((fw) => fw.word === w))
                  .map((w) => ({ word: w, soundReplaceMode: 'mute' as const }));
                if (newWords.length > 0) {
                  setForbiddenWords([...forbiddenWords, ...newWords]);
                }
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          {forbiddenWords.map((fw, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={fw.word}
                onChange={(e) => {
                  const updated = [...forbiddenWords];
                  updated[i] = { ...updated[i], word: e.target.value };
                  setForbiddenWords(updated);
                }}
                placeholder="屏蔽词"
                className="flex h-7 w-28 rounded border border-input bg-transparent px-2 text-[11px]"
              />
              <div className="flex rounded border overflow-hidden">
                <button
                  onClick={() => {
                    const updated = [...forbiddenWords];
                    updated[i] = { ...updated[i], soundReplaceMode: 'mute' };
                    setForbiddenWords(updated);
                  }}
                  className={`px-2 py-0.5 text-[10px] transition-colors ${
                    fw.soundReplaceMode === 'mute'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  静音
                </button>
                <button
                  onClick={() => {
                    const updated = [...forbiddenWords];
                    updated[i] = { ...updated[i], soundReplaceMode: 'beep' };
                    setForbiddenWords(updated);
                  }}
                  className={`px-2 py-0.5 text-[10px] transition-colors ${
                    fw.soundReplaceMode === 'beep'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  嘀声
                </button>
              </div>
              <button
                onClick={() => setForbiddenWords(forbiddenWords.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setForbiddenWords([...forbiddenWords, { word: '', soundReplaceMode: 'mute' }])}
            className="text-[11px] text-primary hover:underline"
          >
            + 添加屏蔽词
          </button>
        </div>
      </div>
    </div>
  );
}

function CopywritingLibrary({
  category,
  onCategoryChange,
  onSelect,
  onClose,
}: {
  category: string;
  onCategoryChange: (c: string) => void;
  onSelect: (text: string) => void;
  onClose: () => void;
}) {
  const categories = Object.keys(COPY_TEMPLATES);
  const templates = COPY_TEMPLATES[category] || [];

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium">文案库</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition-all ${
              category === cat
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-input hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="max-h-48 space-y-1.5 overflow-y-auto">
        {templates.map((tpl, i) => (
          <div
            key={i}
            className="group flex items-start gap-2 rounded-md border bg-card p-2 hover:border-primary/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground mb-0.5">{tpl.title}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{tpl.text}</p>
            </div>
            <button
              onClick={() => onSelect(tpl.text)}
              className="shrink-0 rounded border px-2 py-1 text-[10px] text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              使用
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
