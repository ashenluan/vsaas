'use client';

import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer } from './shared';
import { Film, CheckCircle2 } from 'lucide-react';

export function StepMaterials({ allMaterials }: { allMaterials: any[] }) {
  const { selectedMaterials, toggleMaterial } = useDhV2Store();
  const videoMaterials = allMaterials.filter((m: any) => m.type === 'VIDEO');

  return (
    <StepContainer
      title="选择素材视频"
      description="选择素材视频用于 MAT（素材+旁白）片段。数字人和素材将交替出现"
      canNext={selectedMaterials.length > 0}
    >
      {videoMaterials.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Film className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无视频素材，请先上传视频素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {videoMaterials.map((material: any) => {
            const isSelected = selectedMaterials.includes(material.id);
            return (
              <button
                key={material.id}
                onClick={() => toggleMaterial(material.id)}
                className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary shadow-md'
                    : 'hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                {material.thumbnailUrl ? (
                  <img src={material.thumbnailUrl} alt={material.name} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <Film className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{material.name}</p>
                </div>
                {isSelected && (
                  <div className="absolute right-2 top-2">
                    <CheckCircle2 size={20} className="text-primary drop-shadow" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedMaterials.length > 0 && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          已选择 {selectedMaterials.length} 个素材。每个输出视频将使用不同的素材组合，确保内容多样性。
        </div>
      )}
    </StepContainer>
  );
}
