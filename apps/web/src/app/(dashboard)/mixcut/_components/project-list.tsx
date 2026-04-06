'use client';

import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMixcutStore } from '../_store/use-mixcut-store';
import { ScriptImportModal } from './script-import-modal';
import { hydrateMixcutProjectFromJob } from '../_lib/mixcut-project-hydration';
import { mixcutApi } from '@/lib/api';
import { Plus, FileText, Trash2, Film, Clock, Layers, Loader2, RefreshCw, Download, Play, ExternalLink, CheckCircle, Eye } from 'lucide-react';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: { label: '等待中', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  PROCESSING: { label: '处理中', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: '已完成', className: 'bg-green-50 text-green-700 border-green-200' },
  FAILED: { label: '失败', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function ProjectList() {
  const { setView, resetProject, loadProject } = useMixcutStore(
    useShallow((s) => ({ setView: s.setView, resetProject: s.resetProject, loadProject: s.loadProject })),
  );
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProjects = () => {
    setLoading(true);
    mixcutApi.list().then(setProjects).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = () => {
    resetProject();
    setView('editor');
  };

  const handleCreateFromScript = () => {
    setScriptModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个混剪项目吗？')) return;
    try {
      await mixcutApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  };

  const handleOpenProject = (job: any) => {
    const store = useMixcutStore.getState();
    const hydrated = hydrateMixcutProjectFromJob(job, store.project);

    loadProject(hydrated.project);
    store.setOutputVideos(hydrated.outputVideos);
    store.setPreviewProject(hydrated.previewProject);
    store.setJobStatus(hydrated.jobStatus);
  };

  const filtered = search
    ? projects.filter((p) => {
        const name = p.input?.name || p.id;
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : projects;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">智能混剪</h1>

      {/* Action cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ActionCard
          icon={Plus}
          title="创建混剪项目"
          description="批量剪辑(一天批量剪辑1000个视频),一键定时发布"
          onClick={handleCreate}
          primary
        />
        <ActionCard
          icon={FileText}
          title="从脚本创建混剪项目"
          description="导入脚本快速创建多镜头混剪项目"
          onClick={handleCreateFromScript}
        />
        <ActionCard
          icon={Film}
          title="一键成片"
          description="片段一键成片，省去繁琐剪辑，让创意快速落地"
        />
        <ActionCard
          icon={FileText}
          title="脚本剪辑"
          description="在线化脚本编辑器，提供强大的智能写作能力"
        />
        <ActionCard
          icon={Layers}
          title="图文剪辑"
          description="智能文案与图集无缝配合，为你的内容创作省时省力"
        />
      </div>

      {/* Project list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">混剪项目</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProjects}
              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索项目..."
              className="flex h-8 w-48 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">加载项目列表...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-16 text-center">
            <Film className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {projects.length === 0 ? '还没有混剪项目，点击上方创建' : '没有匹配的项目'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job) => {
              const input = job.input || {};
              const name = input.name || '混剪项目';
              const shotGroups = input.shotGroups || input.projectData?.shotGroups || [];
              const materialCount = shotGroups.reduce(
                (sum: number, g: any) => sum + (g.materialUrls?.length || g.materials?.length || 0),
                0,
              );
              return (
                <ProjectCard
                  key={job.id}
                  name={name}
                  status={job.status}
                  isDraft={!!input.isDraft}
                  resolution={input.resolution || input.globalConfig?.resolution || job.input?.projectData?.globalConfig?.resolution || '—'}
                  materialCount={materialCount}
                  shotCount={shotGroups.length}
                  createdAt={job.createdAt}
                  updatedAt={job.updatedAt}
                  outputVideos={(job.output as any)?.outputVideos || []}
                  isPreviewOnly={(job.output as any)?.isPreviewOnly || false}
                  videoCount={input.videoCount}
                  scheduledAt={input.scheduledAt}
                  onOpen={() => handleOpenProject(job)}
                  onDelete={() => handleDelete(job.id)}
                />
              );
            })}
          </div>
        )}
      </div>
      <ScriptImportModal
        open={scriptModalOpen}
        onClose={() => setScriptModalOpen(false)}
        mode="replace"
      />
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  primary,
}: {
  icon: any;
  title: string;
  description: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start rounded-xl border p-5 text-left transition-all duration-200 hover:shadow-md ${
        primary
          ? 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10'
          : 'bg-card hover:border-primary/50'
      }`}
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
          primary ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        } transition-colors`}
      >
        <Icon size={20} />
      </div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="text-[11px] text-muted-foreground line-clamp-2">{description}</p>
    </button>
  );
}

function ProjectCard({
  name,
  status,
  isDraft,
  resolution,
  materialCount,
  shotCount,
  createdAt,
  updatedAt,
  outputVideos,
  isPreviewOnly,
  videoCount,
  scheduledAt,
  onOpen,
  onDelete,
}: {
  name: string;
  status: string;
  isDraft: boolean;
  resolution: string;
  materialCount: number;
  shotCount: number;
  createdAt?: string;
  updatedAt?: string;
  outputVideos: { mediaId: string; mediaURL: string; duration?: number }[];
  isPreviewOnly: boolean;
  videoCount?: number;
  scheduledAt?: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const badge = isDraft
    ? { label: '草稿', className: 'bg-gray-50 text-gray-600 border-gray-200' }
    : STATUS_BADGES[status] || STATUS_BADGES.PENDING;

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleBatchDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setDownloadProgress(0);
    for (let i = 0; i < outputVideos.length; i++) {
      const v = outputVideos[i];
      const a = document.createElement('a');
      a.href = v.mediaURL;
      a.download = `${name}_${i + 1}.mp4`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadProgress(Math.round(((i + 1) / outputVideos.length) * 100));
      if (i < outputVideos.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    setDownloading(false);
  };

  const handleSingleDownload = (e: React.MouseEvent, v: { mediaURL: string }, idx: number) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = v.mediaURL;
    a.download = `${name}_${idx + 1}.mp4`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">{name}</h3>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        {createdAt && (
          <div className="flex items-center gap-1.5">
            <Clock size={10} /> 创建：{new Date(createdAt).toLocaleString('zh-CN')}
          </div>
        )}
        {updatedAt && (
          <div className="flex items-center gap-1.5">
            <Clock size={10} /> 更新：{new Date(updatedAt).toLocaleString('zh-CN')}
          </div>
        )}
        {scheduledAt && (
          <div className="flex items-center gap-1.5 text-amber-600">
            <Clock size={10} /> 定时：{new Date(scheduledAt).toLocaleString('zh-CN')}
          </div>
        )}
        <div className="flex gap-4 pt-1">
          <span>分辨率：{resolution}</span>
          {videoCount && <span>目标：{videoCount}条</span>}
        </div>
        <div className="flex gap-4">
          <span>素材：{materialCount}</span>
          <span>镜头：{shotCount}</span>
        </div>
      </div>

      {/* Output videos for completed jobs */}
      {status === 'COMPLETED' && isPreviewOnly && outputVideos.length === 0 && (
        <div className="mt-3 border-t pt-3">
          <span className="text-[11px] font-medium text-blue-600">
            <Eye size={10} className="inline mr-1" />
            预览完成（预览模式不生成视频文件）
          </span>
        </div>
      )}
      {status === 'COMPLETED' && outputVideos.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-green-700">
              <CheckCircle size={10} className="inline mr-1" />
              已生成 {outputVideos.length} 个视频
            </span>
            <button
              onClick={handleBatchDownload}
              disabled={downloading}
              className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
            >
              {downloading ? (
                <><Loader2 size={10} className="animate-spin" /> {downloadProgress}%</>
              ) : (
                <><Download size={10} /> 批量下载 ({outputVideos.length})</>
              )}
            </button>
          </div>
          {downloading && (
            <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-primary/10">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {outputVideos.slice(0, 8).map((v, i) => (
              <div
                key={v.mediaId || i}
                className="flex items-center gap-0.5 rounded bg-muted text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <a
                  href={v.mediaURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-1.5 py-1"
                >
                  <Play size={8} /> {i + 1}
                  {v.duration && <span className="text-[9px]">({Math.round(v.duration)}s)</span>}
                </a>
                <button
                  onClick={(e) => handleSingleDownload(e, v, i)}
                  className="px-1 py-1 hover:text-primary transition-colors"
                  title={`下载视频${i + 1}`}
                >
                  <Download size={8} />
                </button>
              </div>
            ))}
            {outputVideos.length > 8 && (
              <span className="flex items-center px-2 py-1 text-[10px] text-muted-foreground">+{outputVideos.length - 8}更多</span>
            )}
          </div>
        </div>
      )}

      {/* Progress indicator for processing jobs */}
      {status === 'PROCESSING' && (
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="animate-spin text-blue-500" />
            <span className="text-[11px] text-blue-600">视频生成中...</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-blue-100">
            <div className="h-full animate-pulse rounded-full bg-blue-400" style={{ width: '60%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
