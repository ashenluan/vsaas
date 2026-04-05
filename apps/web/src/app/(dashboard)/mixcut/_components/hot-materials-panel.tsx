'use client';

import { useState, useEffect } from 'react';
import { materialApi } from '@/lib/api';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import type { ShotMaterial } from '../_store/use-mixcut-store';

const MATERIAL_FILTERS = [
  { id: 'all', label: '全部', emoji: '📁' },
  { id: 'VIDEO', label: '视频', emoji: '🎬' },
  { id: 'IMAGE', label: '图片', emoji: '🖼️' },
];

export function HotMaterialsPanel({
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
                ) : mat.type === 'VIDEO' && mat.url ? (
                  <video src={mat.url} preload="metadata" muted playsInline className="h-full w-full object-cover" onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
                ) : mat.type === 'IMAGE' && mat.url ? (
                  <img src={mat.url} alt={mat.name} className="h-full w-full object-cover" />
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
