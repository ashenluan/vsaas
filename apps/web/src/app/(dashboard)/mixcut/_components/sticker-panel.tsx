'use client';

import { useState } from 'react';
import { uploadToOSS } from '@/lib/upload';
import { toast } from 'sonner';
import { X, Trash2, Loader2, Sticker } from 'lucide-react';
import type { ShotGroup } from '../_store/use-mixcut-store';

const POSITION_PRESETS = [
  { label: '左上', x: 0.05, y: 0.05 },
  { label: '右上', x: 0.75, y: 0.05 },
  { label: '居中', x: 0.4, y: 0.4 },
  { label: '左下', x: 0.05, y: 0.75 },
  { label: '右下', x: 0.75, y: 0.75 },
];

export function StickerPanel({
  group,
  onUpdate,
  onClose,
}: {
  group: ShotGroup;
  onUpdate: (partial: Partial<ShotGroup>) => void;
  onClose: () => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleStickerUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const { url: fileUrl } = await uploadToOSS(file);
        const current = group.stickers || [];
        onUpdate({
          stickers: [...current, { url: fileUrl, x: 0.4, y: 0.4, width: 0.15, height: 0.15 }],
          stickerEnabled: true,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || '贴纸上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeSticker = (index: number) => {
    const current = [...(group.stickers || [])];
    current.splice(index, 1);
    onUpdate({ stickers: current, stickerEnabled: current.length > 0 });
    if (editingIdx === index) setEditingIdx(null);
  };

  const updateSticker = (index: number, partial: Partial<{ x: number; y: number; width: number; height: number }>) => {
    const current = [...(group.stickers || [])];
    current[index] = { ...current[index], ...partial };
    onUpdate({ stickers: current });
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium">贴纸 / Logo / 水印图</span>
        <div className="flex gap-1.5">
          {(group.stickers?.length || 0) > 0 && (
            <button
              onClick={() => onUpdate({ stickers: [], stickerEnabled: false })}
              className="rounded border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
            >
              清空全部
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      </div>

      <p className="mb-2 text-[10px] text-muted-foreground">上传 PNG/SVG 图片作为贴纸覆盖在视频上（支持透明背景）</p>

      {/* Upload area */}
      <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-4 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
        {uploading ? (
          <><Loader2 size={14} className="animate-spin" /> 上传中...</>
        ) : (
          <><Sticker size={14} /> 点击上传贴纸图片（PNG/SVG/GIF）</>
        )}
        <input
          type="file"
          multiple
          accept="image/png,image/svg+xml,image/gif,image/webp"
          onChange={(e) => handleStickerUpload(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {/* Active stickers list */}
      {(group.stickers?.length || 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">已添加的贴纸 ({group.stickers.length})</p>
          {group.stickers.map((sticker, i) => (
            <div key={i} className="rounded-md border bg-card p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={sticker.url} alt={`贴纸${i + 1}`} className="h-8 w-8 rounded object-contain border bg-muted" />
                  <span className="text-[11px] font-medium">贴纸 {i + 1}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingIdx(editingIdx === i ? null : i)}
                    className="rounded border px-1.5 py-0.5 text-[9px] text-primary hover:bg-primary/10"
                  >
                    {editingIdx === i ? '收起' : '调整'}
                  </button>
                  <button
                    onClick={() => removeSticker(i)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {editingIdx === i && (
                <div className="mt-2 space-y-2">
                  {/* Quick position presets */}
                  <div className="flex gap-1">
                    {POSITION_PRESETS.map((pos) => (
                      <button
                        key={pos.label}
                        onClick={() => updateSticker(i, { x: pos.x, y: pos.y })}
                        className="rounded border px-1.5 py-0.5 text-[9px] hover:bg-accent transition-colors"
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>

                  {/* Position sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>X 位置</span>
                        <span>{(sticker.x * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.01}
                        value={sticker.x}
                        onChange={(e) => updateSticker(i, { x: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Y 位置</span>
                        <span>{(sticker.y * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.01}
                        value={sticker.y}
                        onChange={(e) => updateSticker(i, { y: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>宽度</span>
                        <span>{(sticker.width * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min={0.05} max={0.5} step={0.01}
                        value={sticker.width}
                        onChange={(e) => updateSticker(i, { width: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>高度</span>
                        <span>{(sticker.height * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min={0.05} max={0.5} step={0.01}
                        value={sticker.height}
                        onChange={(e) => updateSticker(i, { height: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
