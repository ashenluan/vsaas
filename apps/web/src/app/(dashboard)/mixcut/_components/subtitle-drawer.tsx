'use client';

import { useState } from 'react';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { aiApi } from '@/lib/api';
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Wand2, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const FONTS = [
  { value: 'Alibaba PuHuiTi 2.0 65 Medium', label: '阿里巴巴普惠体' },
  { value: 'Alibaba PuHuiTi 2.0 95 ExtraBold', label: '阿里巴巴普惠体(粗)' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'SimHei', label: '黑体' },
  { value: 'SimSun', label: '宋体' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'HappyZcool-2016', label: '快乐体' },
  { value: 'FZLanTingHei-M-GBK', label: '方正兰亭黑' },
];

const ALIGNMENTS = [
  { value: 'TopCenter', label: '顶部居中' },
  { value: 'BottomCenter', label: '底部居中' },
  { value: 'CenterCenter', label: '正中' },
];

export function SubtitleDrawer({
  shotId,
  options,
  onClose,
}: {
  shotId: string;
  options: any;
  onClose: () => void;
}) {
  const {
    project, addSubtitleToShot, updateSubtitleInShot, removeSubtitleFromShot,
    subtitleStyle, updateSubtitleStyle,
    titleStyle, updateTitleStyle,
    highlightWords, setHighlightWords,
  } = useMixcutStore();

  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'title'>('content');

  const shotGroup = project.shotGroups.find((g) => g.id === shotId);
  if (!shotGroup) return null;

  const subtitleStyles = options?.subtitleStyles || [];
  const bubbleStyles = options?.bubbleStyles || [];

  const currentIdx = project.shotGroups.findIndex((g) => g.id === shotId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[680px] max-w-full animate-in slide-in-from-right duration-300">
        {/* Phone preview */}
        <div className="flex w-[220px] shrink-0 flex-col items-center justify-center bg-gray-900 p-4">
          <div
            className="relative w-full overflow-hidden rounded-xl border border-gray-700 bg-black"
            style={{ aspectRatio: '9/16' }}
          >
            <div className="absolute inset-0 flex items-end justify-center pb-12">
              <p className="max-w-[80%] text-center text-sm font-medium text-white drop-shadow-lg">
                {shotGroup.subtitles[0]?.text || '字幕预览'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-gray-400">关闭抖音视图</p>
        </div>

        {/* Config panel */}
        <div className="flex flex-1 flex-col bg-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">添加字幕配音&标题-{shotGroup.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {currentIdx > 0 && (
                <button className="rounded border px-2 py-1 text-[11px] hover:bg-accent transition-colors">
                  <ChevronLeft size={12} /> 上一个
                </button>
              )}
              {currentIdx < project.shotGroups.length - 1 && (
                <button className="rounded border px-2 py-1 text-[11px] hover:bg-accent transition-colors">
                  下一个 <ChevronRight size={12} />
                </button>
              )}
              <button onClick={onClose} className="rounded p-1 hover:bg-accent">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { key: 'content' as const, label: '文案设置' },
              { key: 'style' as const, label: '字幕设置' },
              { key: 'title' as const, label: '标题设置' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'content' && (
              <SubtitleContent
                shotId={shotId}
                subtitles={shotGroup.subtitles}
                onAdd={() => addSubtitleToShot(shotId, { text: '' })}
                onUpdate={(i, data) => updateSubtitleInShot(shotId, i, data)}
                onRemove={(i) => removeSubtitleFromShot(shotId, i)}
                highlightWords={highlightWords}
                setHighlightWords={setHighlightWords}
              />
            )}
            {activeTab === 'style' && (
              <SubtitleStyleTab
                style={subtitleStyle}
                onUpdate={updateSubtitleStyle}
                subtitleStyles={subtitleStyles}
                bubbleStyles={bubbleStyles}
              />
            )}
            {activeTab === 'title' && (
              <TitleTab
                titleStyle={titleStyle}
                onUpdate={updateTitleStyle}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <button onClick={onClose} className="rounded-md border px-4 py-1.5 text-sm hover:bg-accent transition-colors">
              取消
            </button>
            <button onClick={onClose} className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
              确定
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SubtitleContent({
  shotId,
  subtitles,
  onAdd,
  onUpdate,
  onRemove,
  highlightWords,
  setHighlightWords,
}: {
  shotId: string;
  subtitles: { text: string; voiceId?: string }[];
  onAdd: () => void;
  onUpdate: (i: number, data: { text?: string; voiceId?: string }) => void;
  onRemove: (i: number) => void;
  highlightWords: { word: string; fontColor: string; bold: boolean }[];
  setHighlightWords: (w: { word: string; fontColor: string; bold: boolean }[]) => void;
}) {
  const [rewriteLoading, setRewriteLoading] = useState<number | null>(null);
  const [rewriteResults, setRewriteResults] = useState<{ index: number; variants: string[] } | null>(null);
  const [riskLoading, setRiskLoading] = useState<number | null>(null);
  const [riskResults, setRiskResults] = useState<{ index: number; safe: boolean; risks: { word: string; reason: string }[] } | null>(null);
  const [showCopyLib, setShowCopyLib] = useState(false);
  const [copyLibCategory, setCopyLibCategory] = useState('促销');

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

      <div>
        <h4 className="mb-2 text-[12px] font-medium">添加字幕内容</h4>
        <p className="mb-2 text-[10px] text-muted-foreground">如果添加了多组字幕&配音，将被平均分配给镜头组合</p>

        <div className="mb-2 flex gap-2">
          <button className="rounded border px-2.5 py-1 text-[11px] text-primary border-primary/30 bg-primary/5">手动设置字幕</button>
          <button className="rounded border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">音频生成字幕</button>
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
            // Delay to allow new subtitle to be created, then update it
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
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>预计时长: {Math.ceil((sub.text?.length || 0) / 5)}秒</span>
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
                // Extract common words from subtitles
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
    </div>
  );
}

function SubtitleStyleTab({
  style,
  onUpdate,
  subtitleStyles,
  bubbleStyles,
}: {
  style: any;
  onUpdate: (p: any) => void;
  subtitleStyles: string[];
  bubbleStyles: string[];
}) {
  return (
    <div className="space-y-4">
      <button className="w-full rounded-md border py-1.5 text-[11px] text-primary hover:bg-primary/5">
        视频字幕设置应用到全部镜头组
      </button>

      {/* 花字开关 */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium">花字随机</span>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ effectColorStyleId: '' })}
            className={`rounded px-2 py-0.5 text-[11px] ${!style.effectColorStyleId ? 'bg-primary text-primary-foreground' : 'border'}`}
          >
            关
          </button>
          <button
            onClick={() => onUpdate({ effectColorStyleId: subtitleStyles[0] || 'random' })}
            className={`rounded px-2 py-0.5 text-[11px] ${style.effectColorStyleId ? 'bg-primary text-primary-foreground' : 'border'}`}
          >
            开
          </button>
        </div>
      </div>

      {/* Flower text styles */}
      {style.effectColorStyleId && subtitleStyles.length > 0 && (
        <div>
          <div className="mb-1 flex gap-2">
            <button className="rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">推荐花字</button>
            <button className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground">系统花字</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subtitleStyles.map((id: string) => (
              <button
                key={id}
                onClick={() => onUpdate({ effectColorStyleId: id })}
                className={`rounded-md border px-2 py-1 text-[10px] transition-all ${
                  style.effectColorStyleId === id
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {id.replace('CS000', '花字')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 气泡字开关 */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium">气泡字随机</span>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ bubbleStyleId: '' })}
            className={`rounded px-2 py-0.5 text-[11px] ${!style.bubbleStyleId ? 'bg-primary text-primary-foreground' : 'border'}`}
          >
            关
          </button>
          <button
            onClick={() => onUpdate({ bubbleStyleId: bubbleStyles[0] || 'random' })}
            className={`rounded px-2 py-0.5 text-[11px] ${style.bubbleStyleId ? 'bg-primary text-primary-foreground' : 'border'}`}
          >
            开
          </button>
        </div>
      </div>

      {/* Bubble text styles */}
      {style.bubbleStyleId && bubbleStyles.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] text-muted-foreground">选择气泡字样式</div>
          <div className="flex flex-wrap gap-1.5">
            {bubbleStyles.map((id: string) => (
              <button
                key={id}
                onClick={() => onUpdate({ bubbleStyleId: id })}
                className={`rounded-md border px-2 py-1 text-[10px] transition-all ${
                  style.bubbleStyleId === id
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {id.replace('BS000', '气泡')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outline settings */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">描边宽度</label>
          <input
            type="number"
            min={0}
            max={10}
            value={style.outline}
            onChange={(e) => onUpdate({ outline: Number(e.target.value) })}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">描边颜色</label>
          <div className="flex gap-1.5">
            <input
              type="color"
              value={style.outlineColour}
              onChange={(e) => onUpdate({ outlineColour: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border p-0.5"
            />
            <span className="flex items-center text-[10px] font-mono text-muted-foreground">{style.outlineColour}</span>
          </div>
        </div>
      </div>

      {/* Font settings */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">字体</label>
          <select
            value={style.font}
            onChange={(e) => onUpdate({ font: e.target.value })}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">字号</label>
          <input
            type="number"
            value={style.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">字体颜色</label>
          <div className="flex gap-1.5">
            <input
              type="color"
              value={style.fontColor}
              onChange={(e) => onUpdate({ fontColor: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border p-0.5"
            />
            <span className="flex items-center text-[10px] font-mono text-muted-foreground">{style.fontColor}</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">样式</label>
          <div className="flex gap-1">
            {[
              { key: 'bold' as const, label: 'B' },
              { key: 'italic' as const, label: 'I' },
              { key: 'underline' as const, label: 'U' },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => onUpdate({ [btn.key]: !style[btn.key] })}
                className={`flex h-8 w-8 items-center justify-center rounded border text-[11px] font-bold transition-colors ${
                  style[btn.key] ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">对齐方式</label>
          <select
            value={style.alignment}
            onChange={(e) => onUpdate({ alignment: e.target.value })}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
          >
            {ALIGNMENTS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function TitleTab({
  titleStyle,
  onUpdate,
}: {
  titleStyle: any;
  onUpdate: (p: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium">启用标题</span>
        <button
          onClick={() => onUpdate({ enabled: !titleStyle.enabled })}
          className={`relative h-5 w-9 rounded-full transition-colors ${titleStyle.enabled ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${titleStyle.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      {titleStyle.enabled && (
        <>
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">标题文字</label>
            <input
              type="text"
              value={titleStyle.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="输入视频标题..."
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">字体</label>
              <select
                value={titleStyle.font}
                onChange={(e) => onUpdate({ font: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">字号</label>
              <input
                type="number"
                value={titleStyle.fontSize}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">颜色</label>
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={titleStyle.fontColor}
                  onChange={(e) => onUpdate({ fontColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border p-0.5"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">纵向位置</label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={titleStyle.y}
                onChange={(e) => onUpdate({ y: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">{(titleStyle.y * 100).toFixed(0)}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ========== Copywriting Template Library ========== */

const COPY_TEMPLATES: Record<string, { title: string; text: string }[]> = {
  '促销': [
    { title: '限时优惠', text: '限时特惠来啦！原价XXX，现在只要XXX！数量有限，先到先得，手慢无！' },
    { title: '新品上市', text: '全新升级，重磅来袭！我们精心打磨了这款新品，只为给你最好的体验。' },
    { title: '买一送一', text: '买一送一！没有套路，就是实实在在的福利！快来抢购吧，错过再等一年！' },
    { title: '清仓甩卖', text: '清仓大甩卖！全场低至X折，库存见底，卖完即止！赶紧来捡漏！' },
    { title: '满减活动', text: '满XXX减XXX，越买越划算！凑单攻略已经帮你整理好了，闭眼入不踩雷！' },
  ],
  '种草': [
    { title: '好物推荐', text: '用了一个月，真的回购了三次！这个宝藏好物必须安利给你们！' },
    { title: '测评分享', text: '全网最火的XXX，到底值不值得买？今天给大家做一个真实测评！' },
    { title: '平替推荐', text: '大牌平替来了！只要十分之一的价格，效果却不输大牌！' },
    { title: '合集推荐', text: '这几款神器我真的离不开了！每一个都是精挑细选，闭眼入！' },
  ],
  '知识': [
    { title: '科普讲解', text: '你知道吗？其实很多人都不了解这个小知识，今天就来给大家科普一下！' },
    { title: '干货分享', text: '整理了X个超实用的技巧，每一个都能帮你省时省力，建议收藏！' },
    { title: '误区纠正', text: '注意！这个你一直以为对的做法，其实是错的！正确的方法应该是……' },
    { title: '行业揭秘', text: '行业内部人员告诉你，这些不为人知的内幕，看完你就明白了！' },
  ],
  '情感': [
    { title: '励志鸡汤', text: '生活总会有不如意的时候，但请相信，所有的努力都不会白费。' },
    { title: '情感共鸣', text: '有没有那么一瞬间，你突然觉得自己很累？其实你不必那么坚强。' },
    { title: '人生感悟', text: '走过了这么多路，才明白最珍贵的不是沿途的风景，而是陪你看风景的人。' },
  ],
  '生活': [
    { title: '日常分享', text: '今天的一日三餐分享！简单又美味的家常菜，跟着做就行！' },
    { title: '收纳整理', text: '换季收纳小技巧！学会这几招，再小的房间也能井井有条！' },
    { title: '出行攻略', text: '去XXX旅游一定要看这篇攻略！帮你避开所有坑，省钱又省心！' },
  ],
  'Vlog': [
    { title: '日常Vlog', text: '记录今天的生活，平凡却幸福的一天。来看看我的日常吧！' },
    { title: '挑战Vlog', text: '挑战XXX！这真的太难了，但我决定试一试，最后的结果连我自己都没想到！' },
    { title: '探店Vlog', text: '打卡了一家超火的XXX店！到底是名不虚传还是言过其实？跟我来看看！' },
  ],
};

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
