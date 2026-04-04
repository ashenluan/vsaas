'use client';

import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer } from './shared';
import { FileText, CheckCircle2 } from 'lucide-react';

export function StepScript({ scripts }: { scripts: any[] }) {
  const { selectedScripts, toggleScript } = useDhV2Store();

  return (
    <StepContainer title="选择脚本" description="选择一个或多个脚本，每个脚本将被拆分为交错的数字人/素材片段" canNext={selectedScripts.length > 0}>
      {scripts.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无脚本，请先到「脚本编辑」页面创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scripts.map((script: any) => {
            const isSelected = selectedScripts.includes(script.id);
            return (
              <button
                key={script.id}
                onClick={() => toggleScript(script.id)}
                className={`group relative rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-md'
                    : 'bg-card hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <h3 className="font-medium">{script.title}</h3>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground leading-relaxed">{script.content}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">{script.content?.length || 0} 字</p>
                {isSelected && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle2 size={18} className="text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </StepContainer>
  );
}
