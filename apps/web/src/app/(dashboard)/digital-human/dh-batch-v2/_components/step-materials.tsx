'use client';

import { useState } from 'react';
import { useDhV2Store } from './use-dh-v2-store';
import { StepContainer } from './shared';
import { Film, CheckCircle2, Image as ImageIcon, Search } from 'lucide-react';

type FilterType = 'ALL' | 'VIDEO' | 'IMAGE';

export function StepMaterials({ allMaterials }: { allMaterials: any[] }) {
  const { selectedMaterials, toggleMaterial } = useDhV2Store();
  const [filter, setFilter] = useState<FilterType>('VIDEO');
  const [search, setSearch] = useState('');

  const usableMaterials = allMaterials.filter((m: any) => m.type === 'VIDEO' || m.type === 'IMAGE');
  const filtered = usableMaterials.filter((m: any) => {
    if (filter !== 'ALL' && m.type !== filter) return false;
    if (search && !m.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const videoCount = usableMaterials.filter((m: any) => m.type === 'VIDEO').length;
  const imageCount = usableMaterials.filter((m: any) => m.type === 'IMAGE').length;

  return (
    <StepContainer
      title="选择素材"
      description="选择视频或图片素材用于交错混剪中的 [素材+旁白] 片段"
      canNext={selectedMaterials.length > 0}
    >
      {/* 筛选栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-card p-0.5">
          {([['ALL', '全部'], ['VIDEO', `视频 (${videoCount})`], ['IMAGE', `图片 (${imageCount})`]] as [FilterType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索素材名称..."
            className="flex h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm placeholder:text-muted-foreground/50"
          />
        </div>
        {selectedMaterials.length > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            已选 {selectedMaterials.length} 个
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Film className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {usableMaterials.length === 0 ? '暂无素材，请先上传视频或图片素材' : '没有匹配的素材'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((material: any) => {
            const isSelected = selectedMaterials.includes(material.id);
            const isVideo = material.type === 'VIDEO';
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
                {material.thumbnailUrl || material.url ? (
                  <img src={material.thumbnailUrl || material.url} alt={material.name} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    {isVideo ? <Film className="h-8 w-8 text-muted-foreground/30" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/30" />}
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{material.name}</p>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] ${
                    isVideo ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {isVideo ? '视频' : '图片'}
                  </span>
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
          图片素材将以静态画面 + 旁白音频的形式呈现。
        </div>
      )}
    </StepContainer>
  );
}
