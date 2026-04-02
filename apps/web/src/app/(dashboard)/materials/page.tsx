'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { materialApi } from '@/lib/api';
import { uploadToOSS } from '@/lib/upload';
import { IMS_ALL_ACCEPT, validateImsFile, getImsFormatHint } from '@/lib/ims-formats';
import {
  FolderOpen, Upload, Trash2, Search, Loader2, Film, Image as ImageIcon,
  Music, LayoutGrid, List, X, Eye, CheckSquare, Square, Filter,
} from 'lucide-react';

const TYPE_FILTERS = [
  { id: 'all', label: '全部', icon: FolderOpen },
  { id: 'VIDEO', label: '视频', icon: Film },
  { id: 'IMAGE', label: '图片', icon: ImageIcon },
  { id: 'AUDIO', label: '音频', icon: Music },
];

interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const type = filter === 'all' ? undefined : filter;
      const data = await materialApi.list(type);
      setMaterials(data || []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const total = files.length;
    let done = 0;

    try {
      for (const file of Array.from(files)) {
        const formatError = validateImsFile(file, ['image', 'video', 'audio']);
        if (formatError) {
          console.warn(`Skipped ${file.name}: ${formatError}`);
          continue;
        }
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');

        const { url: fileUrl } = await uploadToOSS(file);
        await materialApi.upload({
          name: file.name,
          type: isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'AUDIO',
          url: fileUrl,
          mimeType: file.type,
        });
        done++;
        setUploadProgress(Math.round((done / total) * 100));
      }
      fetchMaterials();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`确定删除 ${ids.length} 个素材？`)) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => materialApi.delete(id)));
      setSelectedIds(new Set());
      fetchMaterials();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files);
    }
  }, []);

  const filtered = materials.filter((m) => {
    if (search) {
      return m.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      ref={dropRef}
      className="relative mx-auto max-w-7xl space-y-4 p-4 md:p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Upload size={40} className="text-primary" />
            <span className="text-sm font-medium text-primary">松开鼠标上传素材</span>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FolderOpen size={22} className="text-primary" /> 素材中心
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            管理您的图片、视频、音频素材，可直接用于混剪和数字人项目
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={IMS_ALL_ACCEPT}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                上传中 {uploadProgress}%
              </>
            ) : (
              <>
                <Upload size={14} /> 上传素材
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        {/* Type filters */}
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] transition-all ${
                filter === f.id
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-input hover:bg-accent'
              }`}
            >
              <f.icon size={12} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索素材名称..."
            className="flex h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-[12px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors ${
              viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors ${
              viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <List size={14} />
          </button>
        </div>

        {/* Batch actions */}
        {selectedIds.size > 0 && (
          <>
            <div className="h-6 w-px bg-border" />
            <span className="text-[12px] text-muted-foreground">已选 {selectedIds.size} 项</span>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              disabled={deleting}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-3 text-[12px] text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              删除
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="rounded-lg border bg-card px-4 py-2 shadow-sm">
          <span className="text-[10px] text-muted-foreground">总数</span>
          <p className="text-lg font-bold tabular-nums">{materials.length}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 shadow-sm">
          <span className="text-[10px] text-muted-foreground">视频</span>
          <p className="text-lg font-bold tabular-nums">{materials.filter((m) => m.type === 'VIDEO').length}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 shadow-sm">
          <span className="text-[10px] text-muted-foreground">图片</span>
          <p className="text-lg font-bold tabular-nums">{materials.filter((m) => m.type === 'IMAGE').length}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 shadow-sm">
          <span className="text-[10px] text-muted-foreground">音频</span>
          <p className="text-lg font-bold tabular-nums">{materials.filter((m) => m.type === 'AUDIO').length}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-input bg-muted/30 p-12 text-center">
          <FolderOpen size={40} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? '没有找到匹配的素材' : '暂无素材'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            {search ? '请尝试其他搜索关键词' : '点击「上传素材」开始添加图片、视频或音频'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div>
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={selectAll}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
              {selectedIds.size === filtered.length && filtered.length > 0 ? '取消全选' : '全选'}
            </button>
            <span className="text-[11px] text-muted-foreground">{filtered.length} 个素材</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((mat) => (
              <div
                key={mat.id}
                className={`group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
                  selectedIds.has(mat.id) ? 'ring-2 ring-primary border-primary' : ''
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden bg-muted"
                  onClick={() => setPreviewMaterial(mat)}
                >
                  {mat.thumbnailUrl || mat.type === 'IMAGE' ? (
                    <img
                      src={mat.thumbnailUrl || mat.url}
                      alt={mat.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : mat.type === 'VIDEO' ? (
                    <div className="flex h-full items-center justify-center">
                      <Film size={24} className="text-muted-foreground/30" />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Music size={24} className="text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Type badge */}
                  <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                    {mat.type === 'VIDEO' ? '视频' : mat.type === 'IMAGE' ? '图片' : '音频'}
                  </div>
                  {/* Preview icon */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                    <Eye size={20} className="text-white" />
                  </div>
                </div>
                {/* Info */}
                <div className="p-2">
                  <p className="truncate text-[11px] font-medium">{mat.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {formatSize(mat.size)} · {formatDate(mat.createdAt)}
                    {mat.metadata?.duration ? ` · ${formatDuration(mat.metadata.duration)}` : ''}
                  </p>
                </div>
                {/* Select checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(mat.id); }}
                  className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border text-[10px] transition-all ${
                    selectedIds.has(mat.id)
                      ? 'border-primary bg-primary text-white'
                      : 'border-white/60 bg-black/30 text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {selectedIds.has(mat.id) && '\u2713'}
                </button>
                {/* Quick delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete([mat.id]); }}
                  className="absolute bottom-8 right-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-white group-hover:flex hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-2.5 text-left">
                  <button onClick={selectAll} className="text-muted-foreground hover:text-foreground">
                    {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">素材</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">类型</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">大小</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">日期</th>
                <th className="w-20 px-3 py-2.5 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mat) => (
                <tr key={mat.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                  selectedIds.has(mat.id) ? 'bg-primary/5' : ''
                }`}>
                  <td className="px-3 py-2">
                    <button onClick={() => toggleSelect(mat.id)} className="text-muted-foreground hover:text-foreground">
                      {selectedIds.has(mat.id) ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                        {mat.thumbnailUrl || mat.type === 'IMAGE' ? (
                          <img src={mat.thumbnailUrl || mat.url} alt="" className="h-full w-full object-cover" />
                        ) : mat.type === 'VIDEO' ? (
                          <div className="flex h-full items-center justify-center"><Film size={12} className="text-muted-foreground/50" /></div>
                        ) : (
                          <div className="flex h-full items-center justify-center"><Music size={12} className="text-muted-foreground/50" /></div>
                        )}
                      </div>
                      <span className="truncate font-medium" style={{ maxWidth: 200 }}>{mat.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      mat.type === 'VIDEO' ? 'bg-blue-100 text-blue-700' :
                      mat.type === 'IMAGE' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {mat.type === 'VIDEO' ? '视频' : mat.type === 'IMAGE' ? '图片' : '音频'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatSize(mat.size)}
                    {mat.metadata?.duration ? <span className="ml-1 text-[10px]">({formatDuration(mat.metadata.duration)})</span> : ''}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(mat.createdAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreviewMaterial(mat)}
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete([mat.id])}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewMaterial(null)}>
          <div className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMaterial(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={16} />
            </button>
            {previewMaterial.type === 'VIDEO' ? (
              <video src={previewMaterial.url} controls autoPlay className="max-h-[85vh] max-w-[85vw]" />
            ) : previewMaterial.type === 'AUDIO' ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Music size={48} className="mb-4 text-white/40" />
                <audio src={previewMaterial.url} controls autoPlay className="w-80" />
              </div>
            ) : (
              <img src={previewMaterial.url} alt={previewMaterial.name} className="max-h-[85vh] max-w-[85vw] object-contain" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
              <p className="text-sm text-white">{previewMaterial.name}</p>
              <p className="text-[10px] text-white/60">
                {previewMaterial.type === 'VIDEO' ? '视频' : previewMaterial.type === 'IMAGE' ? '图片' : '音频'}
                {previewMaterial.size ? ` · ${formatSize(previewMaterial.size)}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
