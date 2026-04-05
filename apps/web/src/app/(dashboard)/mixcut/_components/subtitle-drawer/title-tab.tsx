'use client';

import { FONTS, TITLE_PRESETS } from './constants';

export function TitleTab({
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
          {/* Title style presets */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground">标题模板 (一键应用)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TITLE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onUpdate({
                    font: preset.font,
                    fontSize: preset.fontSize,
                    fontColor: preset.fontColor,
                    y: preset.y,
                  })}
                  className="group relative overflow-hidden rounded-lg border p-2 text-center transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <div
                    className="mb-1 flex h-8 items-center justify-center rounded bg-black/80"
                  >
                    <span
                      className="font-bold drop-shadow"
                      style={{
                        fontSize: Math.max(8, preset.fontSize / 7),
                        color: preset.fontColor,
                      }}
                    >
                      Aa
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground group-hover:text-foreground">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

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
