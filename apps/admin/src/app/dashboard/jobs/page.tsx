'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listJobs({
        page,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setJobs(data.items || []);
      setTotal(data.total || 0);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => { loadJobs(); }, [page, typeFilter, statusFilter]);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  const statusLabels: Record<string, string> = {
    PENDING: '排队中',
    PROCESSING: '处理中',
    COMPLETED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消',
  };

  const typeLabels: Record<string, string> = {
    IMAGE: '图片',
    VIDEO: '视频',
    VOICE_CLONE: '声音克隆',
    TTS: 'TTS',
    DIGITAL_HUMAN: '数字人',
    VIDEO_EDIT: '视频编辑',
  };

  const statCards = [
    { label: '排队中', value: stats?.pendingJobs ?? '--', color: 'text-yellow-600' },
    { label: '处理中', value: stats?.processingJobs ?? '--', color: 'text-blue-600' },
    { label: '已完成', value: stats?.completedJobs ?? '--', color: 'text-green-600' },
    { label: '失败', value: stats?.failedJobs ?? '--', color: 'text-red-600' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">任务监控</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">全部类型</option>
          <option value="IMAGE">图片</option>
          <option value="VIDEO">视频</option>
          <option value="VOICE_CLONE">声音克隆</option>
          <option value="DIGITAL_HUMAN">数字人</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">全部状态</option>
          <option value="PENDING">排队中</option>
          <option value="PROCESSING">处理中</option>
          <option value="COMPLETED">已完成</option>
          <option value="FAILED">失败</option>
        </select>
        <button
          onClick={loadJobs}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          刷新
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">类型</th>
              <th className="px-4 py-3 text-left font-medium">模型</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">积分</th>
              <th className="px-4 py-3 text-left font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">加载中...</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无任务数据</td>
              </tr>
            ) : (
              jobs.map((job: any) => (
                <tr key={job.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{job.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {typeLabels[job.type] || job.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{job.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[job.status] || ''}`}>
                      {statusLabels[job.status] || job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{job.creditsUsed}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">共 {total} 条</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">上一页</button>
              <button onClick={() => setPage(page + 1)} disabled={page * 20 >= total} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
