'use client';

import { useComposeStore } from './use-compose-store';
import { StepContainer } from './shared';
import { FileText } from 'lucide-react';

export function StepScript({ scripts }: { scripts: any[] }) {
  const { selectedScripts, toggleScript } = useComposeStore();

  const selectAll = () => {
    const allIds = scripts.map((s: any) => s.id);
    const allSelected = allIds.every((id: string) => selectedScripts.includes(id));
    if (allSelected) {
      // 取消全选
      allIds.forEach((id: string) => {
        if (selectedScripts.includes(id)) toggleScript(id);
      });
    } else {
      // 全选
      allIds.forEach((id: string) => {
        if (!selectedScripts.includes(id)) toggleScript(id);
      });
    }
  };

  return (
    <StepContainer
      title="选择口播脚本"
      description={`可多选，每个脚本将生成不同的视频版本 · 已选 ${selectedScripts.length} 个`}
      canNext={selectedScripts.length > 0}
    >
      {scripts.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无脚本，请先到「脚本编辑」页面创建</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">共 {scripts.length} 个脚本</span>
            <button
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              {scripts.every((s: any) => selectedScripts.includes(s.id)) ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="space-y-2.5">
            {scripts.map((script: any) => {
              const isSelected = selectedScripts.includes(script.id);
              const wordCount = script.content?.length || 0;
              return (
                <button
                  key={script.id}
                  onClick={() => toggleScript(script.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                      : 'bg-card hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                      isSelected ? 'border-primary bg-primary text-white' : 'border-input'
                    }`}>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{script.title}</h3>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{wordCount} 字</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{script.content}</p>
                      {script.tags?.length > 0 && (
                        <div className="mt-1.5 flex gap-1">
                          {script.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </StepContainer>
  );
}
