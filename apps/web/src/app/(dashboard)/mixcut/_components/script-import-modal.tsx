'use client';

import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { scriptApi } from '@/lib/api';
import { useMixcutStore, createShotGroup } from '../_store/use-mixcut-store';
import { FileText, X, Loader2, Search } from 'lucide-react';

export function ScriptImportModal({
  open,
  onClose,
  mode = 'replace',
}: {
  open: boolean;
  onClose: () => void;
  mode?: 'replace' | 'append';
}) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const { project, loadProject, resetProject } = useMixcutStore(
    useShallow((s) => ({ project: s.project, loadProject: s.loadProject, resetProject: s.resetProject })),
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    scriptApi.list().then((data) => {
      setScripts(data);
      setSelectedId(null);
      setSearch('');
    }).finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered = search
    ? scripts.filter(
        (s) =>
          s.title?.toLowerCase().includes(search.toLowerCase()) ||
          s.content?.toLowerCase().includes(search.toLowerCase()),
      )
    : scripts;

  const selectedScript = scripts.find((s) => s.id === selectedId);

  const handleImport = () => {
    if (!selectedScript) return;
    setImporting(true);

    // Parse script content into shot groups
    // Split by double newline (paragraphs) or numbered lines
    const content = selectedScript.content || '';
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    // If only one paragraph, try splitting by single newlines
    const sections = paragraphs.length <= 1
      ? content.split(/\n/).map((p: string) => p.trim()).filter((p: string) => p.length > 0)
      : paragraphs;

    const shotGroups = sections.map((text: string, i: number) => {
      const group = createShotGroup(`镜头_${i + 1}`);
      group.subtitles = [{ text }];
      return group;
    });

    // Ensure at least one group
    if (shotGroups.length === 0) {
      shotGroups.push(createShotGroup('镜头_1'));
    }

    if (mode === 'replace') {
      // Replace current project with script-based groups
      const currentState = useMixcutStore.getState();
      loadProject({
        ...currentState.project,
        name: selectedScript.title || '脚本项目',
        shotGroups,
        subtitleStyle: currentState.subtitleStyle,
        titleStyle: currentState.titleStyle,
        globalConfig: currentState.globalConfig,
        highlightWords: currentState.highlightWords,
      });
    } else {
      // Append to existing groups
      const currentState = useMixcutStore.getState();
      loadProject({
        ...currentState.project,
        shotGroups: [...currentState.project.shotGroups, ...shotGroups],
        subtitleStyle: currentState.subtitleStyle,
        titleStyle: currentState.titleStyle,
        globalConfig: currentState.globalConfig,
        highlightWords: currentState.highlightWords,
      });
    }

    setImporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border bg-card shadow-2xl mx-4" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">导入脚本</h2>
            <p className="text-[11px] text-muted-foreground">
              选择一个脚本，按段落自动拆分为镜头组
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-6 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索脚本..."
              className="flex h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Script list */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">加载脚本列表...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {scripts.length === 0
                  ? '暂无脚本，请先到「脚本编辑」页面创建'
                  : '没有匹配的脚本'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((script: any) => {
                const isSelected = selectedId === script.id;
                const wordCount = script.content?.length || 0;
                const paragraphCount = (script.content || '')
                  .split(/\n\s*\n/)
                  .filter((p: string) => p.trim().length > 0).length;

                return (
                  <button
                    key={script.id}
                    onClick={() => setSelectedId(isSelected ? null : script.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                        : 'bg-card hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-input'
                        }`}
                      >
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium">{script.title}</h3>
                          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                            {wordCount} 字
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            · {paragraphCount || 1} 段
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {script.content}
                        </p>
                        {script.tags?.length > 0 && (
                          <div className="mt-1.5 flex gap-1">
                            {script.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-[11px] text-muted-foreground">
            {selectedScript
              ? `已选: ${selectedScript.title} · 将生成约 ${Math.max(
                  (selectedScript.content || '').split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length,
                  1,
                )} 个镜头组`
              : '请选择一个脚本'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedId || importing}
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> 导入中...
                </span>
              ) : (
                '确认导入'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
