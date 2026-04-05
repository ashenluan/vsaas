'use client';

import { Sparkles, X } from 'lucide-react';
import type { ShotGroup } from '../_store/use-mixcut-store';

// IDs match real IMS VFX effect SubType values
const SCENE_EFFECTS = [
  { id: 'slightshake', label: '抖动', description: '画面轻微抖动' },
  { id: 'zoomslight', label: '放大', description: '镜头缓慢推进' },
  { id: 'zoominout', label: '镜头变焦', description: '镜头推拉效果' },
  { id: 'movie', label: '电影感', description: '电影质感效果' },
  { id: 'bluropen', label: '模糊开幕', description: '从模糊到清晰' },
  { id: 'blurclose', label: '模糊闭幕', description: '从清晰到模糊' },
  { id: 'white', label: '闪白', description: '白色闪烁效果' },
  { id: 'smalljitter', label: '毛刺', description: '数字故障风' },
  { id: 'photograph', label: '咔嚓', description: '拍照快门效果' },
  { id: 'color_to_grey', label: '彩色转黑白', description: '彩色渐变黑白' },
  { id: 'lightsweep', label: '阳光经过', description: '光晕漏光效果' },
  { id: 'soulout', label: '灵魂出窍', description: '灵魂出窍特效' },
];

export function SceneEffectsPanel({
  group,
  onUpdate,
  onClose,
}: {
  group: ShotGroup;
  onUpdate: (partial: Partial<ShotGroup>) => void;
  onClose: () => void;
}) {
  const toggleEffect = (effectId: string) => {
    const current = group.effectList || [];
    const next = current.includes(effectId)
      ? current.filter((e) => e !== effectId)
      : [...current, effectId];
    onUpdate({ effectList: next, effectEnabled: next.length > 0 });
  };

  const handleSmartMatch = () => {
    const shuffled = [...SCENE_EFFECTS].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2 + Math.floor(Math.random() * 3)).map((e) => e.id);
    onUpdate({ effectList: picked, effectEnabled: true });
  };

  const handleClearAll = () => {
    onUpdate({ effectList: [], effectEnabled: false });
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium">场景特效</span>
        <div className="flex gap-1.5">
          <button
            onClick={handleSmartMatch}
            className="rounded border px-2 py-0.5 text-[10px] text-primary hover:bg-primary/5 transition-colors"
          >
            <Sparkles size={10} className="inline mr-0.5" /> 智能匹配
          </button>
          {(group.effectList?.length || 0) > 0 && (
            <button
              onClick={handleClearAll}
              className="rounded border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
            >
              清空
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SCENE_EFFECTS.map((effect) => {
          const active = group.effectList?.includes(effect.id);
          return (
            <button
              key={effect.id}
              onClick={() => toggleEffect(effect.id)}
              title={effect.description}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] transition-all ${
                active
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-input hover:bg-accent text-muted-foreground'
              }`}
            >
              {effect.label}
            </button>
          );
        })}
      </div>
      {(group.effectList?.length || 0) > 0 && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          已选 {group.effectList.length} 个特效，将随机应用到该镜头组的视频片段
        </p>
      )}
    </div>
  );
}
