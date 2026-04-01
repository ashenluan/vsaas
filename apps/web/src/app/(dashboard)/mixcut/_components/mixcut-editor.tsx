'use client';

import { useState, useCallback } from 'react';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { ShotGroupCard } from './shot-group-card';
import { GlobalConfigPanel } from './global-config-panel';
import { PreviewPanel } from './preview-panel';
import { SubtitleDrawer } from './subtitle-drawer';
import { ScriptImportModal } from './script-import-modal';
import { mixcutApi } from '@/lib/api';
import { ArrowLeft, Save, Play, Sparkles, Plus, Loader2, Check, Film } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function MixcutEditor({
  options,
  allMaterials,
  onMaterialAdd,
}: {
  options: any;
  allMaterials: any[];
  onMaterialAdd: (m: any) => void;
}) {
  const { project, setProjectName, setView, activeDrawer, closeDrawer, subtitleStyle, titleStyle, globalConfig, highlightWords, reorderShotGroups } = useMixcutStore();
  const setProjectId = useMixcutStore((s) => s.setProjectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = project.shotGroups.findIndex((g) => g.id === active.id);
    const toIndex = project.shotGroups.findIndex((g) => g.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) reorderShotGroups(fromIndex, toIndex);
  }, [project.shotGroups, reorderShotGroups]);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await mixcutApi.saveDraft({
        id: project.id,
        name: project.name,
        projectData: {
          shotGroups: project.shotGroups,
          subtitleStyle,
          titleStyle,
          globalConfig,
          highlightWords,
        },
      });
      // Write back the ID so subsequent saves update the same record
      if (result?.id && !project.id) {
        setProjectId(result.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDedup = () => {
    const store = useMixcutStore.getState();
    const updated = store.project.shotGroups.map((group) => {
      const seen = new Set<string>();
      const deduped = group.materials.filter((m) => {
        if (seen.has(m.url)) return false;
        seen.add(m.url);
        return true;
      });
      return { ...group, materials: deduped };
    });
    updated.forEach((g) => store.updateShotGroup(g.id, { materials: g.materials }));
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <input
            type="text"
            value={project.name}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-9 rounded-lg border border-transparent bg-transparent px-2 text-lg font-semibold hover:border-input focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDedup}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Sparkles size={12} /> 智能去重
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} className="text-green-600" /> : <Save size={12} />}
            {saving ? '保存中...' : saved ? '已保存' : '保存混剪项目'}
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('mixcut-preview-panel');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Play size={12} /> 视频混剪预览
          </button>
        </div>
      </div>

      {/* Three-column editor */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {/* Left: Shot Groups */}
        <div className="col-span-5 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">镜头内容与配置</h3>
                <p className="text-[10px] text-muted-foreground">为各个镜头配置素材、文案、时长等信息</p>
              </div>
              <div className="flex gap-1.5">
                <button className="rounded-md border px-2.5 py-1 text-[11px] hover:bg-accent transition-colors">
                  镜头组音频设置
                </button>
                <button className="rounded-md border px-2.5 py-1 text-[11px] text-primary hover:bg-primary/5 transition-colors">
                  AI写作助手
                </button>
                <button
                  onClick={() => setScriptModalOpen(true)}
                  className="rounded-md border px-2.5 py-1 text-[11px] hover:bg-accent transition-colors"
                >
                  导入脚本
                </button>
              </div>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={project.shotGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              {project.shotGroups.map((group) => (
                <SortableShotGroup key={group.id} group={group} allMaterials={allMaterials} onMaterialAdd={onMaterialAdd} />
              ))}
            </SortableContext>
          </DndContext>

          {project.shotGroups.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-input bg-muted/30 p-8 text-center">
              <Film size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">还没有镜头组</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">点击下方「+ 新增镜头组」开始，或使用「导入脚本」快速创建</p>
            </div>
          )}

          <AddShotButton />
        </div>

        {/* Middle: Global Config */}
        <div className="col-span-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <GlobalConfigPanel options={options} />
        </div>

        {/* Right: Preview */}
        <div className="col-span-4">
          <PreviewPanel />
        </div>
      </div>

      {/* Script Import Modal */}
      <ScriptImportModal
        open={scriptModalOpen}
        onClose={() => setScriptModalOpen(false)}
        mode="append"
      />

      {/* Subtitle Drawer */}
      {activeDrawer?.type === 'subtitle' && (
        <SubtitleDrawer
          shotId={activeDrawer.shotId}
          options={options}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}

function SortableShotGroup({ group, allMaterials, onMaterialAdd }: { group: any; allMaterials: any[]; onMaterialAdd: (m: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ShotGroupCard
        group={group}
        allMaterials={allMaterials}
        onMaterialAdd={onMaterialAdd}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function AddShotButton() {
  const addShotGroup = useMixcutStore((s) => s.addShotGroup);
  return (
    <button
      onClick={addShotGroup}
      className="w-full rounded-xl border-2 border-dashed border-input py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
    >
      + 新增镜头组
    </button>
  );
}
