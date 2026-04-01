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
          <button className="rounded border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">文案库选择</button>
          <button className="rounded border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            <Wand2 size={10} className="inline mr-0.5" /> 文案仿写
          </button>
        </div>
      </div>

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
        <h4 className="mb-2 text-[12px] font-medium">重点词管理</h4>
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
