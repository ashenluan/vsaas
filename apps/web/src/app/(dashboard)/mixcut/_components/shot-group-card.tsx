'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMixcutStore, type ShotGroup, type ShotMaterial } from '../_store/use-mixcut-store';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { toast } from 'sonner';
import {
  ImagePlus, Film, Image as ImageIcon, X, GripVertical,
  Type, Wand2, Sparkles, Sticker, Volume2, VolumeX, Trash2,
  Copy, ChevronDown, ChevronRight, Loader2,
} from 'lucide-react';
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
  const { removeShotGroup, updateShotGroup, addMaterialToShot, removeMaterialFromShot, openDrawer, duplicateShotGroup, reorderMaterialsInShot } = useMixcutStore();
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
            onClick={() => removeShotGroup(group.id)}
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
              accept="image/*,video/*"
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
        ) : (
          <div className="flex aspect-square items-center justify-center bg-muted">
            <Film size={16} className="text-muted-foreground/50" />
          </div>
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
    </button>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(Math.floor((seconds % 1) * 100)).padStart(2, '0')}`;
}

/* ========== Hot Materials Panel ========== */

const MATERIAL_FILTERS = [
  { id: 'all', label: '全部', emoji: '📁' },
  { id: 'VIDEO', label: '视频', emoji: '🎬' },
  { id: 'IMAGE', label: '图片', emoji: '🖼️' },
];

function HotMaterialsPanel({
  onAdd,
  onClose,
}: {
  onAdd: (mat: ShotMaterial) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const type = filter === 'all' ? undefined : filter;
    materialApi.list(type).then(setMaterials).catch(() => setMaterials([])).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="mb-3 rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium">📂 素材库</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {MATERIAL_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-md border px-2 py-0.5 text-[10px] transition-all ${
              filter === f.id
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-input hover:bg-accent'
            }`}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : materials.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-muted-foreground">
          暂无素材，请先在素材管理中上传
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 max-h-[240px] overflow-y-auto">
          {materials.map((mat) => (
            <button
              key={mat.id}
              onClick={() => onAdd({
                id: `lib_${mat.id}_${Date.now()}`,
                name: mat.name,
                type: mat.type,
                url: mat.url,
                thumbnailUrl: mat.thumbnailUrl,
                duration: mat.duration || (mat.type === 'VIDEO' ? 5 : 3),
              })}
              className="group relative overflow-hidden rounded-md border hover:border-primary/50 transition-colors"
            >
              <div className="flex aspect-video items-center justify-center bg-muted overflow-hidden">
                {mat.thumbnailUrl ? (
                  <img src={mat.thumbnailUrl} alt={mat.name} className="h-full w-full object-cover" />
                ) : mat.type === 'VIDEO' ? (
                  <Film size={14} className="text-muted-foreground/50" />
                ) : (
                  <ImageIcon size={14} className="text-muted-foreground/50" />
                )}
              </div>
              <div className="px-1.5 py-1">
                <p className="truncate text-[9px] font-medium">{mat.name}</p>
                <span className="text-[8px] text-muted-foreground">{mat.type === 'VIDEO' ? '视频' : '图片'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== Sticker Panel ========== */

const PRESET_STICKERS = [
  { id: 'arrow_up', label: '↑ 箭头', category: '指引' },
  { id: 'arrow_down', label: '↓ 箭头', category: '指引' },
  { id: 'circle', label: '○ 圆圈', category: '标注' },
  { id: 'star', label: '★ 星标', category: '标注' },
  { id: 'heart', label: '♥ 爱心', category: '表情' },
  { id: 'fire', label: '🔥 火焰', category: '表情' },
  { id: 'thumbsup', label: '👍 点赞', category: '表情' },
  { id: 'sparkle', label: '✨ 闪烁', category: '装饰' },
  { id: 'ribbon', label: '🎀 蝴蝶结', category: '装饰' },
  { id: 'crown', label: '👑 皇冠', category: '装饰' },
  { id: 'price_tag', label: '💰 价签', category: '促销' },
  { id: 'sale', label: '🏷️ 折扣', category: '促销' },
  { id: 'new', label: '🆕 新品', category: '促销' },
  { id: 'hot', label: '🔥 热卖', category: '促销' },
  { id: 'subscribe', label: '🔔 关注', category: '社交' },
  { id: 'like', label: '❤️ 点赞', category: '社交' },
];

const STICKER_CATEGORIES = ['全部', '指引', '标注', '表情', '装饰', '促销', '社交'];

const POSITION_PRESETS = [
  { label: '左上', x: 0.05, y: 0.05 },
  { label: '右上', x: 0.75, y: 0.05 },
  { label: '居中', x: 0.4, y: 0.4 },
  { label: '左下', x: 0.05, y: 0.75 },
  { label: '右下', x: 0.75, y: 0.75 },
];

function StickerPanel({
  group,
  onUpdate,
  onClose,
}: {
  group: ShotGroup;
  onUpdate: (partial: Partial<ShotGroup>) => void;
  onClose: () => void;
}) {
  const [stickerCategory, setStickerCategory] = useState('全部');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const filteredStickers = stickerCategory === '全部'
    ? PRESET_STICKERS
    : PRESET_STICKERS.filter((s) => s.category === stickerCategory);

  const addSticker = (stickerId: string) => {
    const sticker = PRESET_STICKERS.find((s) => s.id === stickerId);
    if (!sticker) return;
    const current = group.stickers || [];
    onUpdate({
      stickers: [...current, { url: stickerId, x: 0.4, y: 0.4, width: 0.15, height: 0.15 }],
      stickerEnabled: true,
    });
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
        <span className="text-[12px] font-medium">贴纸</span>
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

      {/* Category filter */}
      <div className="mb-2 flex flex-wrap gap-1">
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setStickerCategory(cat)}
            className={`rounded-md border px-2 py-0.5 text-[10px] transition-all ${
              stickerCategory === cat
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-input hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {filteredStickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => addSticker(sticker.id)}
            className="rounded-md border px-2 py-1.5 text-[11px] hover:border-primary/50 hover:bg-accent transition-colors"
          >
            {sticker.label}
          </button>
        ))}
      </div>

      {/* Active stickers list */}
      {(group.stickers?.length || 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">已添加的贴纸 ({group.stickers.length})</p>
          {group.stickers.map((sticker, i) => {
            const preset = PRESET_STICKERS.find((s) => s.id === sticker.url);
            return (
              <div key={i} className="rounded-md border bg-card p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium">
                    {preset?.label || sticker.url}
                  </span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========== Scene Effects Panel ========== */

const SCENE_EFFECTS = [
  { id: 'shake', label: '抖动', description: '画面轻微抖动' },
  { id: 'zoom_in', label: '放大', description: '镜头缓慢推进' },
  { id: 'zoom_out', label: '缩小', description: '镜头缓慢拉远' },
  { id: 'rotate', label: '旋转', description: '画面旋转效果' },
  { id: 'blur_in', label: '模糊进入', description: '从模糊到清晰' },
  { id: 'blur_out', label: '模糊退出', description: '从清晰到模糊' },
  { id: 'flash', label: '闪白', description: '白色闪烁效果' },
  { id: 'glitch', label: '故障', description: '数字故障风' },
  { id: 'vignette', label: '暗角', description: '边缘暗角效果' },
  { id: 'film_grain', label: '胶片颗粒', description: '复古胶片质感' },
  { id: 'light_leak', label: '漏光', description: '光晕漏光效果' },
  { id: 'slow_motion', label: '慢动作', description: '画面减速播放' },
];

function SceneEffectsPanel({
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
