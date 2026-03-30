'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer, Card, Toggle, ColorPicker, Slider, ChipSelect } from './shared';
import { Type } from 'lucide-react';

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
  { value: 'TopLeft', label: '顶部左' },
  { value: 'CenterCenter', label: '正中' },
  { value: 'BottomCenter', label: '底部居中' },
  { value: 'BottomLeft', label: '底部左' },
  { value: 'BottomRight', label: '底部右' },
];

export function StepSubtitle({ options }: { options: any }) {
  const { subtitle, updateSubtitle, title, updateTitle, highlightWords, setHighlightWords } = useComposeStore();

  const subtitleStyles = options?.subtitleStyles || [];
  const bubbleStyles = options?.bubbleStyles || [];

  return (
    <StepContainer title="字幕 · 标题 · 关键词" description="配置口播字幕样式、视频标题叠加和关键词高亮">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 左栏：字幕 */}
        <div className="space-y-4">
          {/* 字幕开关 */}
          <Card>
            <Toggle checked={subtitle.enabled} onChange={(v) => updateSubtitle({ enabled: v })} label="启用口播字幕 (ASR)" />
            <p className="mt-1 text-[10px] text-muted-foreground">开启后自动从语音识别生成字幕，与口型同步</p>
          </Card>

          {subtitle.enabled && (
            <>
              {/* 字体样式 */}
              <Card>
                <h3 className="mb-3 text-sm font-semibold">字体样式</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">字体</label>
                    <select
                      value={subtitle.font}
                      onChange={(e) => updateSubtitle({ font: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">字号</label>
                    <input
                      type="number"
                      value={subtitle.fontSize}
                      onChange={(e) => updateSubtitle({ fontSize: Number(e.target.value) })}
                      min={16} max={120}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    />
                  </div>
                  <ColorPicker value={subtitle.fontColor} onChange={(v) => updateSubtitle({ fontColor: v })} label="字体颜色" />
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">对齐方式</label>
                    <select
                      value={subtitle.alignment}
                      onChange={(e) => updateSubtitle({ alignment: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {ALIGNMENTS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 字体风格 */}
                <div className="mt-3 flex gap-2">
                  {[
                    { key: 'bold' as const, label: 'B', title: '粗体' },
                    { key: 'italic' as const, label: 'I', title: '斜体' },
                    { key: 'underline' as const, label: 'U', title: '下划线' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      title={btn.title}
                      onClick={() => updateSubtitle({ [btn.key]: !subtitle[btn.key] })}
                      className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-bold transition-colors ${
                        subtitle[btn.key] ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </Card>

              {/* 描边与位置 */}
              <Card>
                <h3 className="mb-3 text-sm font-semibold">描边与位置</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Slider
                    value={subtitle.outline}
                    onChange={(v) => updateSubtitle({ outline: v })}
                    min={0} max={10} step={1}
                    label="描边宽度"
                    format={(v) => `${v}px`}
                  />
                  <ColorPicker value={subtitle.outlineColour} onChange={(v) => updateSubtitle({ outlineColour: v })} label="描边颜色" />
                  <Slider
                    value={subtitle.y}
                    onChange={(v) => updateSubtitle({ y: v })}
                    min={0} max={1} step={0.05}
                    label="纵向位置"
                    format={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Slider
                    value={subtitle.fontColorOpacity}
                    onChange={(v) => updateSubtitle({ fontColorOpacity: v })}
                    min={0} max={1} step={0.1}
                    label="透明度"
                    format={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                </div>
              </Card>

              {/* 字幕模板 */}
              <Card>
                <h3 className="mb-3 text-sm font-semibold">字幕模板（可选）</h3>
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs text-muted-foreground">花字样式</label>
                  <ChipSelect
                    items={[{ id: '', label: '无' }, ...subtitleStyles.map((id: string) => ({ id, label: id.replace('CS000', '花字') }))]}
                    selected={subtitle.effectColorStyleId ? [subtitle.effectColorStyleId] : [''] }
                    onToggle={(id) => updateSubtitle({ effectColorStyleId: id })}
                    allowMultiple={false}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">气泡样式</label>
                  <ChipSelect
                    items={[{ id: '', label: '无' }, ...bubbleStyles.map((id: string) => ({ id, label: id.replace('BS000', '气泡') }))]}
                    selected={subtitle.bubbleStyleId ? [subtitle.bubbleStyleId] : ['']}
                    onToggle={(id) => updateSubtitle({ bubbleStyleId: id })}
                    allowMultiple={false}
                  />
                </div>
              </Card>
            </>
          )}
        </div>

        {/* 右栏：标题叠加 + 关键词高亮 */}
        <div className="space-y-4">
          {/* 视频标题叠加 (IMS TitleConfig) */}
          <Card>
            <Toggle checked={title.enabled} onChange={(v) => updateTitle({ enabled: v })} label="视频标题叠加" />
            <p className="mt-1 text-[10px] text-muted-foreground">在视频顶部叠加文字标题，支持多条随机选用</p>
          </Card>

          {title.enabled && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold">标题内容</h3>
              <div className="mb-3 space-y-2">
                {title.titles.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => {
                        const newTitles = [...title.titles];
                        newTitles[i] = e.target.value;
                        updateTitle({ titles: newTitles });
                      }}
                      placeholder={`标题 ${i + 1}`}
                      className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <button
                      onClick={() => updateTitle({ titles: title.titles.filter((_, j) => j !== i) })}
                      className="h-9 rounded-md border px-2 text-muted-foreground hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => updateTitle({ titles: [...title.titles, ''] })}
                  className="w-full rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  + 添加标题
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">字体</label>
                  <select
                    value={title.font}
                    onChange={(e) => updateTitle({ font: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">字号</label>
                  <input type="number" value={title.fontSize} onChange={(e) => updateTitle({ fontSize: Number(e.target.value) })} min={20} max={120}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
                </div>
                <ColorPicker value={title.fontColor} onChange={(v) => updateTitle({ fontColor: v })} label="颜色" />
                <Slider value={title.y} onChange={(v) => updateTitle({ y: v })} min={0} max={0.5} step={0.01} label="纵向位置" format={(v) => `${(v * 100).toFixed(0)}%`} />
              </div>
            </Card>
          )}

          {/* 关键词高亮 (IMS SpecialWordsConfig) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Type size={14} className="text-primary" />
              <h3 className="text-sm font-semibold">关键词高亮</h3>
              <span className="text-[10px] text-muted-foreground">（可选，口播字幕中的关键词将以特殊样式显示）</span>
            </div>
            <div className="space-y-2">
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
                    className="flex h-8 w-32 rounded-md border border-input bg-transparent px-2 text-sm"
                  />
                  <input type="color" value={hw.fontColor} onChange={(e) => {
                    const updated = [...highlightWords];
                    updated[i] = { ...updated[i], fontColor: e.target.value };
                    setHighlightWords(updated);
                  }} className="h-8 w-8 cursor-pointer rounded border p-0.5" />
                  <button
                    onClick={() => setHighlightWords(highlightWords.filter((_, j) => j !== i))}
                    className="h-8 rounded border px-2 text-xs text-muted-foreground hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setHighlightWords([...highlightWords, { word: '', fontColor: '#FF6B35', outlineColour: '#000000', bold: true }])}
                className="w-full rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                + 添加关键词
              </button>
            </div>
          </Card>
        </div>
      </div>
    </StepContainer>
  );
}
