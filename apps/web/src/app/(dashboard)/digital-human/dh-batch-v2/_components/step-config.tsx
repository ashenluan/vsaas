'use client';

import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer, Card } from './shared';

export function StepConfig() {
  const { subtitle, updateSubtitle, output, updateOutput, transitionId, setTransitionId } = useDhV2Store();

  return (
    <StepContainer title="输出配置" description="配置字幕、转场和输出参数">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 max-w-3xl">
        {/* 字幕 */}
        <Card>
          <h3 className="mb-3 font-semibold">字幕设置</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">启用字幕</span>
              <button
                onClick={() => updateSubtitle({ open: !subtitle.open })}
                className={`relative h-6 w-11 rounded-full transition-colors ${subtitle.open ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${subtitle.open ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </label>
            {subtitle.open && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">字号</label>
                  <input
                    type="number"
                    min={16}
                    max={72}
                    value={subtitle.fontSize}
                    onChange={(e) => updateSubtitle({ fontSize: Number(e.target.value) })}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">字体颜色</label>
                  <div className="mt-1 flex gap-2">
                    <input type="color" value={subtitle.fontColor} onChange={(e) => updateSubtitle({ fontColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border p-0.5" />
                    <input type="text" value={subtitle.fontColor} onChange={(e) => updateSubtitle({ fontColor: e.target.value })} className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm font-mono" />
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* 输出参数 */}
        <Card>
          <h3 className="mb-3 font-semibold">输出参数</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">视频数量</label>
              <input
                type="number"
                min={1}
                max={50}
                value={output.videoCount}
                onChange={(e) => updateOutput({ videoCount: Number(e.target.value) })}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">分辨率</label>
              <select
                value={output.resolution}
                onChange={(e) => updateOutput({ resolution: e.target.value })}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="1080x1920">1080×1920 (竖屏 1080P)</option>
                <option value="720x1280">720×1280 (竖屏 720P)</option>
                <option value="1920x1080">1920×1080 (横屏 1080P)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">口播音量</label>
                <span className="text-xs font-medium tabular-nums">{Math.round(output.speechVolume * 100)}%</span>
              </div>
              <input type="range" min={0} max={2} step={0.1} value={output.speechVolume} onChange={(e) => updateOutput({ speechVolume: Number(e.target.value) })} className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">背景音乐音量</label>
                <span className="text-xs font-medium tabular-nums">{Math.round(output.bgMusicVolume * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={output.bgMusicVolume} onChange={(e) => updateOutput({ bgMusicVolume: Number(e.target.value) })} className="w-full accent-primary" />
            </div>
          </div>
        </Card>
      </div>
    </StepContainer>
  );
}
