'use client';

import { Check } from 'lucide-react';
import { getPreviewUrl } from '../../_lib/effect-previews';
import { FONTS, ALIGNMENTS } from './constants';

export function SubtitleStyleTab({
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
          <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto">
            {subtitleStyles.map((id: string) => {
              const selected = style.effectColorStyleId === id;
              return (
                <button
                  key={id}
                  onClick={() => onUpdate({ effectColorStyleId: id })}
                  className={`relative flex flex-col items-center gap-0.5 rounded-lg border p-1 transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                      : 'border-input hover:border-primary/30 hover:bg-accent'
                  }`}
                >
                  {getPreviewUrl(id) ? (
                    <div className="h-10 w-full overflow-hidden rounded">
                      <img src={getPreviewUrl(id)} alt={id} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                      selected ? 'from-purple-100 to-pink-100' : 'from-muted to-muted/60'
                    }`}>
                      <span className="text-[9px] text-muted-foreground/60">花字</span>
                    </div>
                  )}
                  <span className={`text-[9px] leading-tight text-center line-clamp-1 ${
                    selected ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {id.replace('CS000', '花字')}
                  </span>
                  {selected && (
                    <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
                      <Check size={8} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
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
          <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto">
            {bubbleStyles.map((id: string) => {
              const selected = style.bubbleStyleId === id;
              return (
                <button
                  key={id}
                  onClick={() => onUpdate({ bubbleStyleId: id })}
                  className={`relative flex flex-col items-center gap-0.5 rounded-lg border p-1 transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                      : 'border-input hover:border-primary/30 hover:bg-accent'
                  }`}
                >
                  {getPreviewUrl(id) ? (
                    <div className="h-10 w-full overflow-hidden rounded">
                      <img src={getPreviewUrl(id)} alt={id} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-full items-center justify-center rounded bg-gradient-to-br ${
                      selected ? 'from-blue-100 to-cyan-100' : 'from-muted to-muted/60'
                    }`}>
                      <span className="text-[9px] text-muted-foreground/60">气泡</span>
                    </div>
                  )}
                  <span className={`text-[9px] leading-tight text-center line-clamp-1 ${
                    selected ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {id.replace('BS000', '气泡')}
                  </span>
                  {selected && (
                    <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
                      <Check size={8} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
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
