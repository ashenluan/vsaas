'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer, Card, Slider } from './shared';
import { Settings2, MonitorSmartphone, Smartphone, Monitor, Square, Volume2, Gauge } from 'lucide-react';

const RESOLUTIONS = [
  { label: '竖屏', sub: '1080×1920', value: '1080x1920', icon: Smartphone },
  { label: '横屏', sub: '1920×1080', value: '1920x1080', icon: Monitor },
  { label: '方形', sub: '1080×1080', value: '1080x1080', icon: Square },
];

const VIDEO_COUNTS = [1, 3, 5, 10, 20, 30, 50];

export function StepConfig() {
  const { output, updateOutput } = useComposeStore();

  return (
    <StepContainer title="输出配置" description="设置生成视频的数量、分辨率和音频参数">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 左栏 */}
        <div className="space-y-4">
          {/* 生成数量 */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Settings2 size={14} /> 生成数量
            </h3>
            <div className="flex flex-wrap gap-2">
              {VIDEO_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => updateOutput({ videoCount: n })}
                  className={`relative min-w-[48px] rounded-lg border px-4 py-2.5 text-center text-sm transition-all ${
                    output.videoCount === n
                      ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-md'
                      : 'border-input hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">自定义：</span>
              <input
                type="number"
                value={output.videoCount}
                onChange={(e) => updateOutput({ videoCount: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
                min={1} max={100}
                className="flex h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm text-center tabular-nums"
              />
              <span className="text-xs text-muted-foreground">条（最多100条）</span>
            </div>
          </Card>

          {/* 分辨率 */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MonitorSmartphone size={14} /> 分辨率
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {RESOLUTIONS.map((r) => {
                const Icon = r.icon;
                const selected = output.resolution === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => updateOutput({ resolution: r.value })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                        : 'border-input hover:border-primary/50'
                    }`}
                  >
                    <Icon size={24} className={selected ? 'text-primary' : 'text-muted-foreground'} />
                    <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{r.label}</span>
                    <span className="text-[10px] text-muted-foreground">{r.sub}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 视频时长与质量 */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Gauge size={14} /> 时长与质量
            </h3>
            <div className="space-y-4">
              <Slider
                value={output.maxDuration}
                onChange={(v) => updateOutput({ maxDuration: v })}
                min={5} max={180} step={5}
                label="最大视频时长"
                format={(v) => `${v}s`}
              />
              <Slider
                value={output.crf}
                onChange={(v) => updateOutput({ crf: v })}
                min={18} max={35} step={1}
                label="视频质量 (CRF)"
                format={(v) => v <= 22 ? `${v} 高质量` : v <= 28 ? `${v} 标准` : `${v} 压缩`}
              />
            </div>
          </Card>
        </div>

        {/* 右栏 - 音频 */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Volume2 size={14} /> 音频控制
            </h3>
            <div className="space-y-5">
              <Slider
                value={output.mediaVolume}
                onChange={(v) => updateOutput({ mediaVolume: v })}
                min={0} max={2} step={0.1}
                label="素材原声音量"
                format={(v) => v === 0 ? '静音' : `${(v * 100).toFixed(0)}%`}
              />
              <Slider
                value={output.speechVolume}
                onChange={(v) => updateOutput({ speechVolume: v })}
                min={0} max={2} step={0.1}
                label="口播音量"
                format={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Slider
                value={output.bgMusicVolume}
                onChange={(v) => updateOutput({ bgMusicVolume: v })}
                min={0} max={1} step={0.05}
                label="背景音乐音量"
                format={(v) => v === 0 ? '静音' : `${(v * 100).toFixed(0)}%`}
              />
              <Slider
                value={output.speechRate}
                onChange={(v) => updateOutput({ speechRate: v })}
                min={-500} max={500} step={50}
                label="口播语速"
                format={(v) => v === 0 ? '正常' : v > 0 ? `加速 ${v}` : `减速 ${v}`}
              />
            </div>
          </Card>

          {/* 费用预估卡 */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">费用预估</span>
              <span className="text-2xl font-bold text-primary tabular-nums">{output.videoCount * 20}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>单价 20 积分/条 × {output.videoCount} 条视频</p>
              <p>分辨率 {output.resolution.replace('x', '×')} · CRF {output.crf}</p>
              <p>最大时长 {output.maxDuration}s</p>
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
