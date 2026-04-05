'use client';

import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore, type ShotGroup, type ShotMaterial } from '../_store/use-mixcut-store';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { toast } from 'sonner';
import { IMS_MEDIA_ACCEPT, validateImsFile } from '@/lib/ims-formats';
import {
  ImagePlus, Film, Image as ImageIcon, X, GripVertical,
  Type, Wand2, Sparkles, Sticker, Volume2, VolumeX, Trash2,
  Copy, ChevronDown, ChevronRight, Loader2,
} from 'lucide-react';
import { SceneEffectsPanel } from './scene-effects-panel';
import { StickerPanel } from './sticker-panel';
import { HotMaterialsPanel } from './hot-materials-panel';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function ShotGroupCard({
  group,
  allMaterials,
  onMaterialAdd,
  dragHandleProps,
}: {
  group: ShotGroup;
  allMaterials: any[];
  onMaterialAdd: (m: any) => void;
  dragHandleProps?: Record<string, any>;
}) {
  const { removeShotGroup, updateShotGroup, addMaterialToShot, removeMaterialFromShot, openDrawer, duplicateShotGroup, reorderMaterialsInShot } = useMixcutStore(
    useShallow((s) => ({
      removeShotGroup: s.removeShotGroup, updateShotGroup: s.updateShotGroup,
      addMaterialToShot: s.addMaterialToShot, removeMaterialFromShot: s.removeMaterialFromShot,
      openDrawer: s.openDrawer, duplicateShotGroup: s.duplicateShotGroup,
      reorderMaterialsInShot: s.reorderMaterialsInShot,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<ShotMaterial | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEffects, setShowEffects] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showHotMaterials, setShowHotMaterials] = useState(false);

  const matSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleMaterialDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = group.materials.findIndex((m) => m.id === active.id);
    const toIndex = group.materials.findIndex((m) => m.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) reorderMaterialsInShot(group.id, fromIndex, toIndex);
  }, [group.id, group.materials, reorderMaterialsInShot]);

  const totalDuration = group.materials.reduce((acc, m) => acc + (m.duration || 3), 0);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formatError = validateImsFile(file, ['image', 'video']);
        if (formatError) {
          toast.error(`${file.name}: ${formatError}`);
          continue;
        }
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

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
    } catch (err: any) {
      toast.error(err?.message || '素材上传失败');
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
    <div className={`rounded-xl border bg-card shadow-sm transition-opacity ${!group.enabled ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span {...dragHandleProps} className="text-muted-foreground/50 cursor-grab active:cursor-grabbing">
            <GripVertical size={14} />
          </span>
          <button
            onClick={() => updateShotGroup(group.id, { enabled: !group.enabled })}
            className={`relative h-4 w-7 rounded-full transition-colors ${group.enabled ? 'bg-primary' : 'bg-muted'}`}
            title={group.enabled ? '点击禁用此镜头组' : '点击启用此镜头组'}
          >
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${group.enabled ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground transition-colors">
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
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
          <span className="text-[9px] text-muted-foreground" title="分组音量">
            🔊 {Math.round((group.volume ?? 1) * 100)}%
          </span>
          <button
            onClick={() => duplicateShotGroup(group.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
            title="复制镜头组"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={() => { if (confirm('确定要删除这个镜头组吗？')) removeShotGroup(group.id); }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Materials area */}
      {!collapsed && <div className="px-4 py-3">
        {/* Add material buttons */}
        <div className="mb-2 flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
            <ImagePlus size={12} /> 添加素材
            <input
              type="file"
              multiple
              accept={IMS_MEDIA_ACCEPT}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowHotMaterials(!showHotMaterials)}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${showHotMaterials ? 'border-primary/30 bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
          >
            素材库
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
          {group.materials.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (selectedIds.size === group.materials.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(group.materials.map((m) => m.id)));
                  }
                }}
                className="rounded-md border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
              >
                {selectedIds.size === group.materials.length && selectedIds.size > 0 ? '取消全选' : '全选'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => {
                    selectedIds.forEach((id) => removeMaterialFromShot(group.id, id));
                    setSelectedIds(new Set());
                  }}
                  className="rounded-md border border-red-200 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  删除选中({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hot materials panel */}
        {showHotMaterials && (
          <HotMaterialsPanel
            onAdd={(mat) => {
              if (group.materials.some((m) => m.url === mat.url)) return;
              addMaterialToShot(group.id, mat);
            }}
            onClose={() => setShowHotMaterials(false)}
          />
        )}

        {/* Material picker dropdown */}
        {showMaterialPicker && (
          <MaterialPickerDropdown
            allMaterials={allMaterials.filter((m) => m.type === 'IMAGE' || m.type === 'VIDEO')}
            existingIds={new Set(group.materials.map((m) => m.id))}
            onAdd={handleAddFromLibrary}
          />
        )}

        {/* Material list */}
        {group.materials.length > 0 && (
          <DndContext sensors={matSensors} collisionDetection={closestCenter} onDragEnd={handleMaterialDragEnd}>
            <SortableContext items={group.materials.map((m) => m.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {group.materials.map((mat) => (
                  <SortableMaterialThumb
                    key={mat.id}
                    material={mat}
                    onRemove={() => removeMaterialFromShot(group.id, mat.id)}
                    onPreview={() => setPreviewMaterial(mat)}
                    selected={selectedIds.has(mat.id)}
                    onToggleSelect={() => {
                      const next = new Set(selectedIds);
                      if (next.has(mat.id)) next.delete(mat.id);
                      else next.add(mat.id);
                      setSelectedIds(next);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>}

      {/* Material preview modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewMaterial(null)}>
          <div className="relative max-h-[80vh] max-w-[80vw] overflow-hidden rounded-xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewMaterial(null)} className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
              <X size={16} />
            </button>
            {previewMaterial.type === 'VIDEO' ? (
              <video src={previewMaterial.url} controls autoPlay className="max-h-[80vh] max-w-[80vw]" />
            ) : (
              <img src={previewMaterial.url} alt={previewMaterial.name} className="max-h-[80vh] max-w-[80vw] object-contain" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
              <p className="text-sm text-white">{previewMaterial.name}</p>
              <p className="text-[10px] text-white/60">{previewMaterial.type === 'VIDEO' ? '视频' : '图片'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-group volume & sub-heading */}
      {!collapsed && (
        <div className="border-t px-4 py-2.5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-muted-foreground">分组音量</label>
                <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round((group.volume ?? 1) * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={2} step={0.05}
                value={group.volume ?? 1}
                onChange={(e) => updateShotGroup(group.id, { volume: Number(e.target.value) })}
                className="w-full accent-primary h-1"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => updateShotGroup(group.id, { volume: 0.3 })}
                className={`rounded border px-1.5 py-0.5 text-[9px] transition-colors ${(group.volume ?? 1) === 0.3 ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'}`}
              >
                口播
              </button>
              <button
                onClick={() => updateShotGroup(group.id, { volume: 1 })}
                className={`rounded border px-1.5 py-0.5 text-[9px] transition-colors ${(group.volume ?? 1) === 1 ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'}`}
              >
                原声
              </button>
            </div>
          </div>
          {/* Sub-heading input */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">副标题（可选，如价格/参数）</label>
            <input
              type="text"
              value={group.subHeadings?.[0] || ''}
              onChange={(e) => updateShotGroup(group.id, { subHeadings: e.target.value ? [e.target.value] : [] })}
              placeholder="例：¥99.9 限时特惠"
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!collapsed && <div className="flex border-t">
        <ActionBtn icon={Type} label="字幕配音&标题" onClick={() => openDrawer('subtitle', group.id)} />
        <ActionBtn icon={Wand2} label="智能混剪" sublabel={group.smartTrim ? '已开启·随音频截取' : '关闭'} onClick={() => updateShotGroup(group.id, { smartTrim: !group.smartTrim })} active={group.smartTrim} />
        <ActionBtn icon={Sparkles} label="场景特效" onClick={() => setShowEffects(!showEffects)} />
        <ActionBtn icon={Sticker} label="贴纸" onClick={() => setShowStickers(!showStickers)} />
      </div>}

      {/* Scene effects panel */}
      {!collapsed && showEffects && (
        <SceneEffectsPanel
          group={group}
          onUpdate={(partial) => updateShotGroup(group.id, partial)}
          onClose={() => setShowEffects(false)}
        />
      )}

      {/* Sticker panel */}
      {!collapsed && showStickers && (
        <StickerPanel
          group={group}
          onUpdate={(partial) => updateShotGroup(group.id, partial)}
          onClose={() => setShowStickers(false)}
        />
      )}
    </div>
  );
}

function SortableMaterialThumb({ material, onRemove, onPreview, selected, onToggleSelect }: { material: ShotMaterial; onRemove: () => void; onPreview: () => void; selected?: boolean; onToggleSelect?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: material.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`group relative shrink-0 w-20 overflow-hidden rounded-lg border cursor-grab active:cursor-grabbing ${selected ? 'ring-2 ring-primary border-primary' : ''}`}>
      <div onClick={onPreview} className="cursor-pointer">
        {material.type === 'IMAGE' ? (
          <img src={material.thumbnailUrl || material.url} alt={material.name} className="aspect-square w-full object-cover" />
        ) : material.thumbnailUrl ? (
          <img src={material.thumbnailUrl} alt={material.name} className="aspect-square w-full object-cover" />
        ) : (
          <video
            src={material.url}
            preload="metadata"
            muted
            playsInline
            className="aspect-square w-full object-cover"
            onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
          />
        )}
      </div>
      <div className="px-1.5 py-1">
        <p className="truncate text-[9px] font-medium">{material.name}</p>
        <p className="text-[8px] text-muted-foreground">
          {material.type === 'IMAGE' ? '图片' : '视频'} · {formatDuration(material.duration || 3)}
        </p>
      </div>
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
      >
        <X size={8} />
      </button>
      {/* Type badge */}
      <div className="absolute left-0.5 top-0.5 rounded bg-black/50 px-1 py-0.5 text-[8px] text-white">
        {material.type === 'VIDEO' ? '视频' : '图片'}
      </div>
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-sm border text-[8px] transition-colors ${
            selected ? 'border-primary bg-primary text-white' : 'border-white/60 bg-black/30 text-transparent group-hover:border-white'
          }`}
        >
          {selected && '✓'}
        </button>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, sublabel, onClick, active }: { icon: any; label: string; sublabel?: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 border-r py-2.5 text-[11px] last:border-r-0 hover:bg-accent hover:text-foreground transition-colors ${
        active ? 'text-primary bg-primary/5 font-medium' : 'text-muted-foreground'
      }`}
    >
      <Icon size={12} />
      <span>{label}</span>
      {sublabel && <span className="text-[9px] opacity-70">{sublabel}</span>}
    </button>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(Math.floor((seconds % 1) * 100)).padStart(2, '0')}`;
}

/* ========== Material Picker Dropdown (with pagination) ========== */

function MaterialPickerDropdown({
  allMaterials,
  existingIds,
  onAdd,
}: {
  allMaterials: any[];
  existingIds: Set<string>;
  onAdd: (mat: any) => void;
}) {
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = allMaterials.slice(0, visibleCount);
  const hasMore = visibleCount < allMaterials.length;

  return (
    <div className="mb-3 max-h-52 overflow-y-auto rounded-lg border bg-popover p-2 shadow-md">
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map((mat) => (
          <button
            key={mat.id}
            onClick={() => onAdd(mat)}
            disabled={existingIds.has(mat.id)}
            className="group relative overflow-hidden rounded border text-left hover:border-primary/50 disabled:opacity-40 transition-colors"
          >
            {mat.thumbnailUrl ? (
              <img src={mat.thumbnailUrl} alt={mat.name} className="aspect-square w-full object-cover" />
            ) : mat.type === 'VIDEO' && mat.url ? (
              <video src={mat.url} preload="metadata" muted playsInline className="aspect-square w-full object-cover" onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
            ) : mat.type === 'IMAGE' && mat.url ? (
              <img src={mat.url} alt={mat.name} className="aspect-square w-full object-cover" />
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
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-2 w-full rounded-md border py-1.5 text-[10px] text-primary hover:bg-primary/5 transition-colors"
        >
          加载更多（还有 {allMaterials.length - visibleCount} 条）
        </button>
      )}
    </div>
  );
}



