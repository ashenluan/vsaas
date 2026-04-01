'use client';

import { useState, useCallback } from 'react';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { ShotGroupCard } from './shot-group-card';
import { GlobalConfigPanel } from './global-config-panel';
import { PreviewPanel } from './preview-panel';
import { SubtitleDrawer } from './subtitle-drawer';
import { ScriptImportModal } from './script-import-modal';
import { mixcutApi, aiApi } from '@/lib/api';
import { ArrowLeft, Save, Play, Sparkles, Plus, Loader2, Check, Film, Wand2, X } from 'lucide-react';
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
  const [aiWriterOpen, setAiWriterOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTone, setAiTone] = useState('neutral');
  const [aiLength, setAiLength] = useState('medium');
  const [aiAudience, setAiAudience] = useState('general');

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

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const res = await aiApi.generateScript(
        `[风格:${aiTone}][篇幅:${aiLength}][受众:${aiAudience}] ${aiTopic.trim()}`,
        project.shotGroups.length || 5,
      );
      const store = useMixcutStore.getState();
      // Create shot groups from script paragraphs
      res.script.forEach((paragraph, idx) => {
        // Extract first line as speech text
        const lines = paragraph.split('\n').filter(Boolean);
        const speechText = lines[0] || paragraph;
        if (idx < store.project.shotGroups.length) {
          // Update existing group
          const group = store.project.shotGroups[idx];
          store.addSubtitleToShot(group.id, { text: speechText });
        } else {
          // Add new group
          store.addShotGroup();
          const newGroups = useMixcutStore.getState().project.shotGroups;
          const newGroup = newGroups[newGroups.length - 1];
          if (newGroup) {
            store.addSubtitleToShot(newGroup.id, { text: speechText });
          }
        }
      });
      setAiWriterOpen(false);
      setAiTopic('');
    } catch { /* ignore */ }
    setAiGenerating(false);
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
                <button
                  onClick={() => {
                    const el = document.getElementById('mixcut-audio-settings');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="rounded-md border px-2.5 py-1 text-[11px] hover:bg-accent transition-colors"
                >
                  镜头组音频设置
                </button>
                <button
                  onClick={() => setAiWriterOpen(true)}
                  className="rounded-md border px-2.5 py-1 text-[11px] text-primary hover:bg-primary/5 transition-colors"
                >
                  <Wand2 size={10} className="inline mr-0.5" /> AI写作助手
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

      {/* AI Writer Modal */}
      {aiWriterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAiWriterOpen(false)}>
          <div className="w-[480px] rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Wand2 size={14} className="text-primary" /> AI写作助手
              </h3>
              <button onClick={() => setAiWriterOpen(false)} className="rounded p-1 hover:bg-accent">
                <X size={16} />
              </button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">输入主题或关键词，AI 将自动生成短视频脚本并填充到镜头组文案中</p>
            <textarea
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="例如：夏日防晒小技巧、新品发布会开场、健身打卡vlog..."
              rows={3}
              className="mb-3 w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />

            {/* AI Writer Settings */}
            <div className="mb-3 space-y-2.5 rounded-lg border bg-muted/30 p-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">文案风格</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'promotional', label: '促销带货' },
                    { value: 'informational', label: '知识科普' },
                    { value: 'emotional', label: '情感共鸣' },
                    { value: 'humorous', label: '幽默搞笑' },
                    { value: 'neutral', label: '通用中性' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setAiTone(t.value)}
                      className={`rounded-md border px-2 py-1 text-[10px] transition-all ${
                        aiTone === t.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">文案篇幅</label>
                <div className="flex gap-1.5">
                  {[
                    { value: 'short', label: '精简 (每段1-2句)' },
                    { value: 'medium', label: '适中 (每段2-3句)' },
                    { value: 'long', label: '详细 (每段3-5句)' },
                  ].map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setAiLength(l.value)}
                      className={`flex-1 rounded-md border py-1 text-[10px] transition-all ${
                        aiLength === l.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">目标受众</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'general', label: '大众通用' },
                    { value: 'youth', label: '年轻潮流' },
                    { value: 'professional', label: '商务专业' },
                    { value: 'female', label: '女性用户' },
                    { value: 'parent', label: '宝妈宝爸' },
                  ].map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAiAudience(a.value)}
                      className={`rounded-md border px-2 py-1 text-[10px] transition-all ${
                        aiAudience === a.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-3 text-[10px] text-muted-foreground">
              将生成 {project.shotGroups.length || 5} 段脚本，对应当前镜头组数量
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAiWriterOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiTopic.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {aiGenerating ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> 生成中...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Wand2 size={12} /> 生成脚本
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
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
