'use client';

import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer, Card } from './shared';
import { Music, Type, Settings2, Volume2, Gauge, Film, Sparkles } from 'lucide-react';

export function StepConfig() {
  const {
    subtitle, updateSubtitle,
    output, updateOutput,
    bgMusic, setBgMusic,
    transitionId, setTransitionId,
  } = useDhV2Store();

  return (
    <StepContainer title="输出配置" description="配置字幕、背景音乐、音量和输出参数">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 max-w-4xl">

        {/* ====== 字幕设置 ====== */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Type size={14} />
            </div>
            <h3 className="font-semibold">字幕设置</h3>
            <div className="ml-auto">
              <button
                onClick={() => updateSubtitle({ open: !subtitle.open })}
                className={`relative h-6 w-11 rounded-full transition-colors ${subtitle.open ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${subtitle.open ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
          {subtitle.open && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-xs text-muted-foreground">字体</label>
                  <select
                    value={subtitle.font}
                    onChange={(e) => updateSubtitle({ font: e.target.value })}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="alibaba-sans">阿里巴巴普惠体</option>
                    <option value="SimHei">黑体</option>
                    <option value="SimSun">宋体</option>
                    <option value="KaiTi">楷体</option>
                    <option value="FangSong">仿宋</option>
                    <option value="Microsoft YaHei">微软雅黑</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">字体颜色</label>
                <div className="mt-1 flex gap-2">
                  <input type="color" value={subtitle.fontColor} onChange={(e) => updateSubtitle({ fontColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border p-0.5" />
                  <input type="text" value={subtitle.fontColor} onChange={(e) => updateSubtitle({ fontColor: e.target.value })} className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm font-mono" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['#FFFFFF', '#FFFF00', '#00FF00', '#FF6B6B', '#4ECDC4', '#FFD93D'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateSubtitle({ fontColor: c })}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${subtitle.fontColor === c ? 'border-primary scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ====== 输出参数 ====== */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Settings2 size={14} />
            </div>
            <h3 className="font-semibold">输出参数</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
                  <option value="1280x720">1280×720 (横屏 720P)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">最大时长 (秒)</label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={output.maxDuration}
                  onChange={(e) => updateOutput({ maxDuration: Number(e.target.value) })}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">视频质量 (CRF)</label>
                <select
                  value={output.crf}
                  onChange={(e) => updateOutput({ crf: Number(e.target.value) })}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value={20}>高质量 (CRF 20)</option>
                  <option value={23}>较高质量 (CRF 23)</option>
                  <option value={27}>标准质量 (CRF 27)</option>
                  <option value={30}>较低质量 (CRF 30)</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* ====== 音量控制 ====== */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Volume2 size={14} />
            </div>
            <h3 className="font-semibold">音量控制</h3>
          </div>
          <div className="space-y-4">
            <SliderRow
              label="口播音量"
              value={output.speechVolume}
              onChange={(v) => updateOutput({ speechVolume: v })}
              min={0} max={2} step={0.1}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="素材音量"
              value={output.mediaVolume}
              onChange={(v) => updateOutput({ mediaVolume: v })}
              min={0} max={2} step={0.1}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="背景音乐音量"
              value={output.bgMusicVolume}
              onChange={(v) => updateOutput({ bgMusicVolume: v })}
              min={0} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="语速调整"
              value={output.speechRate}
              onChange={(v) => updateOutput({ speechRate: v })}
              min={-3} max={3} step={0.5}
              format={(v) => v === 0 ? '正常' : v > 0 ? `快 ${v}` : `慢 ${Math.abs(v)}`}
            />
          </div>
        </Card>

        {/* ====== 背景音乐 & 转场 ====== */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Music size={14} />
            </div>
            <h3 className="font-semibold">背景音乐 & 转场</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">背景音乐 URL</label>
              <input
                type="text"
                value={bgMusic}
                onChange={(e) => setBgMusic(e.target.value)}
                placeholder="输入 OSS 音频 URL（可选）"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground/50"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">支持 MP3/WAV 格式，留空则无背景音乐</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">片段转场效果</label>
              <select
                value={transitionId}
                onChange={(e) => setTransitionId(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">无转场</option>
                <option value="fade">淡入淡出</option>
                <option value="smoothleft">向左滑动</option>
                <option value="smoothright">向右滑动</option>
                <option value="smoothup">向上滑动</option>
                <option value="smoothdown">向下滑动</option>
                <option value="circlecrop">圆形裁切</option>
                <option value="dissolve">溶解</option>
                <option value="pixelize">像素化</option>
                <option value="radial">径向</option>
              </select>
            </div>

            {bgMusic && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-2.5">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <Music size={12} />
                  <span className="truncate">{bgMusic.split('/').pop()}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </StepContainer>
  );
}

function SliderRow({
  label, value, onChange, min, max, step, format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-medium tabular-nums min-w-[3rem] text-right">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-primary"
      />
    </div>
  );
}
