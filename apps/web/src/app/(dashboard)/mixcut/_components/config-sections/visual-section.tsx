'use client';

import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../../_store/use-mixcut-store';
import {
  Shield, Image as ImageIcon, Film, MonitorSmartphone,
  Smartphone, Monitor, Square,
} from 'lucide-react';
import { ConfigSection, ToggleSwitch } from './shared';
import { getPrimaryMixcutPoolItem, parseMixcutPoolText } from '../../_lib/mixcut-random-pools';

const ASPECT_RATIOS = [
  { label: '9:16', value: '9:16', icon: Smartphone },
  { label: '16:9', value: '16:9', icon: Monitor },
  { label: '1:1', value: '1:1', icon: Square },
  { label: '4:3', value: '4:3', icon: Monitor },
  { label: '3:4', value: '3:4', icon: Smartphone },
];

const RESOLUTIONS: Record<string, { label: string; value: string }[]> = {
  '9:16': [
    { label: '1080×1920', value: '1080x1920' },
    { label: '720×1280', value: '720x1280' },
  ],
  '16:9': [
    { label: '1920×1080', value: '1920x1080' },
    { label: '1280×720', value: '1280x720' },
  ],
  '1:1': [
    { label: '1080×1080', value: '1080x1080' },
    { label: '720×720', value: '720x720' },
  ],
  '4:3': [
    { label: '1440×1080', value: '1440x1080' },
    { label: '960×720', value: '960x720' },
  ],
  '3:4': [
    { label: '1080×1440', value: '1080x1440' },
    { label: '720×960', value: '720x960' },
  ],
};

export function WatermarkSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  return (
    <ConfigSection icon={Shield} label="水印设置">
      <input
        type="text"
        value={globalConfig.watermarkText}
        onChange={(e) => updateGlobalConfig({ watermarkText: e.target.value })}
        placeholder="输入水印文字（留空则不添加）"
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {globalConfig.watermarkText && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">水印位置</label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { value: 'topLeft' as const, label: '左上' },
                { value: 'topRight' as const, label: '右上' },
                { value: 'bottomLeft' as const, label: '左下' },
                { value: 'bottomRight' as const, label: '右下' },
              ].map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => updateGlobalConfig({ watermarkPosition: pos.value })}
                  className={`rounded border py-1 text-[10px] transition-all ${
                    globalConfig.watermarkPosition === pos.value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground">透明度</label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(globalConfig.watermarkOpacity * 100)}%</span>
            </div>
            <input
              type="range" min={0.1} max={1} step={0.05}
              value={globalConfig.watermarkOpacity}
              onChange={(e) => updateGlobalConfig({ watermarkOpacity: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          {/* Watermark preview */}
          <div className="relative mt-2 h-20 rounded-lg border bg-black/80 overflow-hidden">
            <div
              className="absolute text-white font-medium"
              style={{
                ...(globalConfig.watermarkPosition === 'topLeft' ? { top: 6, left: 6 } : {}),
                ...(globalConfig.watermarkPosition === 'topRight' ? { top: 6, right: 6 } : {}),
                ...(globalConfig.watermarkPosition === 'bottomLeft' ? { bottom: 6, left: 6 } : {}),
                ...(globalConfig.watermarkPosition === 'bottomRight' ? { bottom: 6, right: 6 } : {}),
                opacity: globalConfig.watermarkOpacity,
                fontSize: 11,
              }}
            >
              {globalConfig.watermarkText}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-white/30">水印位置预览</span>
            </div>
          </div>
        </div>
      )}
    </ConfigSection>
  );
}

export function BackgroundSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );
  const bgImageList = parseMixcutPoolText(globalConfig.bgImage);
  const primaryBgImage = getPrimaryMixcutPoolItem(globalConfig.bgImage);

  return (
    <ConfigSection icon={ImageIcon} label="背景设置">
      <div className="flex gap-2">
        {(['none', 'color', 'blur', 'image'] as const).map((type) => (
          <button
            key={type}
            onClick={() => updateGlobalConfig({ bgType: type })}
            className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-all ${
              globalConfig.bgType === type
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-input hover:bg-accent'
            }`}
          >
            {type === 'none' ? '无' : type === 'color' ? '颜色' : type === 'blur' ? '模糊' : '图片'}
          </button>
        ))}
      </div>
      {globalConfig.bgType === 'color' && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={globalConfig.bgColor}
            onChange={(e) => updateGlobalConfig({ bgColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border p-0.5"
          />
          <span className="text-[11px] font-mono text-muted-foreground">{globalConfig.bgColor}</span>
        </div>
      )}
      {globalConfig.bgType === 'image' && (
        <div className="mt-2">
          <textarea
            value={globalConfig.bgImage}
            onChange={(e) => updateGlobalConfig({ bgImage: e.target.value })}
            rows={3}
            placeholder="每行一个背景图 URL，可填写多个作为随机背景图池"
            className="w-full rounded-md border px-2.5 py-1.5 text-[11px] leading-5 placeholder:text-muted-foreground/50"
          />
          {bgImageList.length > 1 && (
            <p className="mt-1 text-[10px] text-primary">已配置 {bgImageList.length} 张背景图，成片时将随机轮换。</p>
          )}
          {primaryBgImage && (
            <div className="mt-1.5 relative rounded-md overflow-hidden border" style={{ aspectRatio: '16/9', maxHeight: 80 }}>
              <img src={primaryBgImage} alt="背景预览" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}
    </ConfigSection>
  );
}

export function CoverSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  return (
    <ConfigSection icon={Film} label="视频封面">
      <div className="flex gap-1.5 mb-2">
        {[
          { value: 'auto' as const, label: '自动截取' },
          { value: 'custom' as const, label: '自定义封面' },
          { value: 'smart' as const, label: '智能封面' },
        ].map((type) => (
          <button
            key={type.value}
            onClick={() => updateGlobalConfig({ coverType: type.value })}
            className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-all ${
              globalConfig.coverType === type.value
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-input hover:bg-accent'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
      {globalConfig.coverType === 'custom' && (
        <div className="space-y-2">
          <input
            type="text"
            value={globalConfig.coverUrl}
            onChange={(e) => updateGlobalConfig({ coverUrl: e.target.value })}
            placeholder="输入封面图片 URL"
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {globalConfig.coverUrl && (
            <div className="relative mx-auto w-32 overflow-hidden rounded-lg border">
              <img src={globalConfig.coverUrl} alt="封面预览" className="w-full object-cover" style={{ aspectRatio: globalConfig.aspectRatio.replace(':', '/') }} />
              <button
                onClick={() => updateGlobalConfig({ coverUrl: '' })}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-[10px] hover:bg-black/80"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
      {globalConfig.coverType === 'smart' && (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground">系统将自动从视频中截取精彩画面，并叠加标题文字生成封面</p>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">封面标题</label>
            <input
              type="text"
              value={globalConfig.coverTitle}
              onChange={(e) => updateGlobalConfig({ coverTitle: e.target.value })}
              placeholder="输入封面标题文字（留空则不叠加文字）"
              maxLength={30}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="mt-0.5 text-[9px] text-muted-foreground text-right">{globalConfig.coverTitle.length}/30</p>
          </div>
          {globalConfig.coverTitle && (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">标题字号</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={32} max={96} step={4}
                    value={globalConfig.coverTitleSize}
                    onChange={(e) => updateGlobalConfig({ coverTitleSize: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="w-8 text-right text-[11px] tabular-nums">{globalConfig.coverTitleSize}</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">标题颜色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={globalConfig.coverTitleColor}
                    onChange={(e) => updateGlobalConfig({ coverTitleColor: e.target.value })}
                    className="h-7 w-9 cursor-pointer rounded border p-0.5"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">{globalConfig.coverTitleColor}</span>
                  <div className="ml-auto flex gap-1">
                    {['#ffffff', '#FFD700', '#FF4444', '#00E5FF'].map((c) => (
                      <button
                        key={c}
                        onClick={() => updateGlobalConfig({ coverTitleColor: c })}
                        className={`h-5 w-5 rounded-full border-2 transition-all ${
                          globalConfig.coverTitleColor === c ? 'border-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">标题位置</label>
                <div className="flex gap-1.5">
                  {[
                    { value: 'top' as const, label: '顶部' },
                    { value: 'center' as const, label: '居中' },
                    { value: 'bottom' as const, label: '底部' },
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateGlobalConfig({ coverTitlePosition: pos.value })}
                      className={`flex-1 rounded-md border py-1 text-[10px] transition-all ${
                        globalConfig.coverTitlePosition === pos.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {/* Smart cover preview */}
          <div className="relative mx-auto w-40 overflow-hidden rounded-lg border bg-gradient-to-b from-black/60 via-black/30 to-black/60" style={{ aspectRatio: globalConfig.aspectRatio.replace(':', '/') }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Film size={20} className="text-white/20" />
            </div>
            {globalConfig.coverTitle && (
              <div className={`absolute left-2 right-2 text-center pointer-events-none ${
                globalConfig.coverTitlePosition === 'top' ? 'top-3' : globalConfig.coverTitlePosition === 'bottom' ? 'bottom-3' : 'top-1/2 -translate-y-1/2'
              }`}>
                <span
                  className="font-bold drop-shadow-lg"
                  style={{
                    fontSize: Math.max(8, globalConfig.coverTitleSize / 6),
                    color: globalConfig.coverTitleColor,
                  }}
                >
                  {globalConfig.coverTitle}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </ConfigSection>
  );
}

export function DedupSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  return (
    <ConfigSection icon={Shield} label="二创去重">
      <p className="text-[10px] text-muted-foreground mb-2">打开后系统将智能对素材进行处理，有效降低成片重复度</p>
      <div className="space-y-2">
        {[
          { key: 'smartCrop' as const, label: '智能截取', desc: '对长素材随机截取不同片段，降低重复度' },
          { key: 'smartZoom' as const, label: '智能缩放', desc: '自动缩放裁剪画面，提升视觉多样性' },
          { key: 'smartMirror' as const, label: '智能镜像', desc: '左右镜像处理，增加画面变化感' },
          { key: 'transparentMask' as const, label: '透明蒙版', desc: '抽取部分区域作透明蒙版覆盖' },
          { key: 'randomSpeed' as const, label: '随机变速', desc: '轻微变速，不影响整体效果' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium">{item.label}</div>
              <div className="text-[9px] text-muted-foreground truncate">{item.desc}</div>
            </div>
            <ToggleSwitch
              checked={globalConfig.dedupConfig[item.key]}
              onChange={(v) => updateGlobalConfig({
                dedupConfig: { ...globalConfig.dedupConfig, [item.key]: v },
              })}
            />
          </div>
        ))}
      </div>
      {Object.values(globalConfig.dedupConfig).some(Boolean) && (
        <div className="mt-2 rounded-md border border-green-200 bg-green-50/50 px-2 py-1.5">
          <p className="text-[10px] text-green-700">
            已启用 {Object.values(globalConfig.dedupConfig).filter(Boolean).length} 项去重功能
          </p>
          <p className="text-[9px] text-green-500">系统将智能处理素材，有效降低成片中的重复度</p>
        </div>
      )}
    </ConfigSection>
  );
}

export function AspectRatioSection() {
  const { globalConfig, updateGlobalConfig } = useMixcutStore(
    useShallow((s) => ({ globalConfig: s.globalConfig, updateGlobalConfig: s.updateGlobalConfig })),
  );

  return (
    <ConfigSection icon={MonitorSmartphone} label="选择比例">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {ASPECT_RATIOS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.value}
              onClick={() => {
                updateGlobalConfig({ aspectRatio: r.value });
                const resolutions = RESOLUTIONS[r.value];
                if (resolutions?.[0]) updateGlobalConfig({ resolution: resolutions[0].value });
              }}
              className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-all ${
                globalConfig.aspectRatio === r.value
                  ? 'border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary'
                  : 'border-input hover:border-primary/50'
              }`}
            >
              <Icon size={14} />
              <span className="text-[10px]">{r.label}</span>
            </button>
          );
        })}
      </div>
      {!ASPECT_RATIOS.some((r) => r.value === globalConfig.aspectRatio) && (
        <div className="mb-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-[10px] text-primary font-medium">自定义比例: {globalConfig.aspectRatio}</span>
        </div>
      )}
      <div className="mb-2">
        <button
          onClick={() => {
            const input = prompt('输入自定义比例 (格式: 宽:高，如 2:3, 5:4)', '');
            if (!input) return;
            const match = input.match(/^(\d+)\s*[:：xX×]\s*(\d+)$/);
            if (!match) { alert('格式无效，请使用 宽:高 格式'); return; }
            const w = Number(match[1]);
            const h = Number(match[2]);
            if (w <= 0 || h <= 0) { alert('宽高必须大于0'); return; }
            const ratio = `${w}:${h}`;
            const maxDim = 1080;
            let resW: number, resH: number;
            if (w >= h) {
              resW = maxDim;
              resH = Math.round(maxDim * h / w);
            } else {
              resH = maxDim;
              resW = Math.round(maxDim * w / h);
            }
            resW = resW % 2 === 0 ? resW : resW + 1;
            resH = resH % 2 === 0 ? resH : resH + 1;
            updateGlobalConfig({ aspectRatio: ratio, resolution: `${resW}x${resH}` });
          }}
          className="w-full rounded-md border border-dashed py-1.5 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          + 自定义比例
        </button>
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-muted-foreground">视频分辨率</label>
        {RESOLUTIONS[globalConfig.aspectRatio] ? (
          <div className="flex gap-2">
            {(RESOLUTIONS[globalConfig.aspectRatio] || []).map((res) => (
              <button
                key={res.value}
                onClick={() => updateGlobalConfig({ resolution: res.value })}
                className={`flex-1 rounded-md border py-1.5 text-[11px] transition-all ${
                  globalConfig.resolution === res.value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {globalConfig.resolution.replace('x', ' × ')}
          </div>
        )}
      </div>
    </ConfigSection>
  );
}
