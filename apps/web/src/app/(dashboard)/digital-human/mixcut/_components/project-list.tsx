'use client';

import { useMixcutStore, createShotGroup } from '../_store/use-mixcut-store';
import { Plus, FileText, Trash2, Film, Clock, Layers } from 'lucide-react';

export function ProjectList() {
  const { setView, resetProject, loadProject } = useMixcutStore();

  const handleCreate = () => {
    resetProject();
    setView('editor');
  };

  const handleCreateFromScript = () => {
    resetProject();
    setView('editor');
  };

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
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="搜索项目..."
              className="flex h-8 w-48 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Example projects */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['示例-自助海鲜店', '示例-室内游乐场', '示例-火锅店'].map((name, i) => (
            <ProjectCard
              key={i}
              name={name}
              resolution="1080 x 1920"
              materialCount={[6, 8, 8][i]}
              shotCount={4}
              onOpen={() => {
                // Create sample project and open editor
                const project = {
                  name,
                  shotGroups: Array.from({ length: 4 }, (_, j) => createShotGroup(`视频组_${j + 1}`)),
                  subtitleStyle: useMixcutStore.getState().subtitleStyle,
                  titleStyle: useMixcutStore.getState().titleStyle,
                  globalConfig: useMixcutStore.getState().globalConfig,
                  highlightWords: [],
                };
                loadProject(project);
              }}
            />
          ))}
        </div>
      </div>
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
  resolution,
  materialCount,
  shotCount,
  onOpen,
}: {
  name: string;
  resolution: string;
  materialCount: number;
  shotCount: number;
  onOpen: () => void;
}) {
  const now = new Date().toLocaleString('zh-CN');

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{name}</h3>
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock size={10} /> 创建时间：{now}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} /> 更新时间：{now}
        </div>
        <div className="flex gap-4 pt-1">
          <span>画面比例：{resolution}</span>
        </div>
        <div className="flex gap-4">
          <span>素材数量：{materialCount}</span>
          <span>镜头数量：{shotCount}</span>
        </div>
      </div>
    </div>
  );
}
