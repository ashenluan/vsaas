'use client';

import { useState } from 'react';
import { useMixcutStore, type ShotGroup, type ShotMaterial } from '../_store/use-mixcut-store';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import {
  ImagePlus, Film, Image as ImageIcon, X, GripVertical,
  Type, Wand2, Sparkles, Sticker, Volume2, VolumeX, Trash2,
} from 'lucide-react';

export function ShotGroupCard({
  group,
  allMaterials,
  onMaterialAdd,
}: {
  group: ShotGroup;
  allMaterials: any[];
  onMaterialAdd: (m: any) => void;
}) {
  const { removeShotGroup, updateShotGroup, addMaterialToShot, removeMaterialFromShot, openDrawer } = useMixcutStore();
  const [uploading, setUploading] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  const totalDuration = group.materials.reduce((acc, m) => acc + (m.duration || 3), 0);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) continue;

        const { url: fileUrl } = await uploadToOSS(file);
        const created = await materialApi.upload({
          name: file.name,
          type: isImage ? 'IMAGE' : 'VIDEO',
          url: fileUrl,
          mimeType: file.type,
        });
        onMaterialAdd(created);
        addMaterialToShot(group.id, {
          id: created.id,
          name: created.name,
          type: created.type,
          url: created.url || created.thumbnailUrl,
          thumbnailUrl: created.thumbnailUrl,
          duration: isVideo ? 5 : 3,
        });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAddFromLibrary = (mat: any) => {
    if (group.materials.some((m) => m.id === mat.id)) return;
    addMaterialToShot(group.id, {
      id: mat.id,
      name: mat.name,
      type: mat.type,
      url: mat.url || mat.thumbnailUrl,
      thumbnailUrl: mat.thumbnailUrl,
      duration: mat.type === 'VIDEO' ? 5 : 3,
    });
    setShowMaterialPicker(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-muted-foreground/50 cursor-grab" />
          <span className="text-sm font-semibold">{group.name}</span>
          <span className="text-[10px] text-muted-foreground">
            素材数量 {group.materials.length} &nbsp; 素材总时长 {formatTime(totalDuration)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateShotGroup(group.id, { keepOriginalAudio: !group.keepOriginalAudio })}
            className={`flex h-6 items-center gap-1 rounded border px-2 text-[10px] transition-colors ${
              group.keepOriginalAudio ? 'border-primary/30 bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {group.keepOriginalAudio ? <Volume2 size={10} /> : <VolumeX size={10} />}
            素材原声
          </button>
          <button
            onClick={() => removeShotGroup(group.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Materials area */}
      <div className="px-4 py-3">
        {/* Add material buttons */}
        <div className="mb-2 flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
            <ImagePlus size={12} /> 添加素材
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </label>
          <button className="rounded-md border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-accent transition-colors">
            热门素材
          </button>
          <button
            onClick={() => setShowMaterialPicker(!showMaterialPicker)}
            className="rounded-md border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-accent transition-colors"
          >
            素材库导入
          </button>
          {uploading && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              上传中...
            </div>
          )}
        </div>

        {/* Material picker dropdown */}
        {showMaterialPicker && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border bg-popover p-2 shadow-md">
            <div className="grid grid-cols-4 gap-1.5">
              {allMaterials
                .filter((m) => m.type === 'IMAGE' || m.type === 'VIDEO')
                .slice(0, 20)
                .map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => handleAddFromLibrary(mat)}
                    disabled={group.materials.some((m) => m.id === mat.id)}
                    className="group relative overflow-hidden rounded border text-left hover:border-primary/50 disabled:opacity-40 transition-colors"
                  >
                    {mat.type === 'IMAGE' && mat.url ? (
                      <img src={mat.thumbnailUrl || mat.url} alt={mat.name} className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-muted">
                        <Film size={14} className="text-muted-foreground/50" />
                      </div>
                    )}
                    <p className="truncate px-1 py-0.5 text-[9px]">{mat.name}</p>
                  </button>
                ))}
            </div>
            {allMaterials.length === 0 && (
              <p className="py-2 text-center text-[11px] text-muted-foreground">暂无素材</p>
            )}
          </div>
        )}

        {/* Material list */}
        {group.materials.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {group.materials.map((mat) => (
              <MaterialThumb
                key={mat.id}
                material={mat}
                onRemove={() => removeMaterialFromShot(group.id, mat.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex border-t">
        <ActionBtn icon={Type} label="字幕配音&标题" onClick={() => openDrawer('subtitle', group.id)} />
        <ActionBtn icon={Wand2} label="智能混剪" sublabel="随音频，视频智能截取" />
        <ActionBtn icon={Sparkles} label="场景特效" />
        <ActionBtn icon={Sticker} label="贴纸" />
      </div>
    </div>
  );
}

function MaterialThumb({ material, onRemove }: { material: ShotMaterial; onRemove: () => void }) {
  return (
    <div className="group relative shrink-0 w-20 overflow-hidden rounded-lg border">
      {material.type === 'IMAGE' ? (
        <img src={material.thumbnailUrl || material.url} alt={material.name} className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-muted">
          <Film size={16} className="text-muted-foreground/50" />
        </div>
      )}
      <div className="px-1.5 py-1">
        <p className="truncate text-[9px] font-medium">{material.name}</p>
        <p className="text-[8px] text-muted-foreground">
          {material.type === 'IMAGE' ? '图片' : '视频'} · {formatDuration(material.duration || 3)}
        </p>
      </div>
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
      >
        <X size={8} />
      </button>
      {/* Type badge */}
      <div className="absolute left-0.5 top-0.5 rounded bg-black/50 px-1 py-0.5 text-[8px] text-white">
        {material.type === 'VIDEO' ? '视频' : '图片'}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, sublabel, onClick }: { icon: any; label: string; sublabel?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 border-r py-2.5 text-[11px] text-muted-foreground last:border-r-0 hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon size={12} />
      <span>{label}</span>
    </button>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(Math.floor((seconds % 1) * 100)).padStart(2, '0')}`;
}
