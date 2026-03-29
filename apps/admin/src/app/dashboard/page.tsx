'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats().catch(() => null),
      adminApi.listJobs({ page: 1 }).catch(() => ({ items: [] })),
      adminApi.listUsers({ page: 1 }).catch(() => ({ items: [] })),
    ]).then(([s, j, u]) => {
      setStats(s);
      setRecentJobs((j?.items || []).slice(0, 5));
      setRecentUsers((u?.items || []).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: '总用户数', value: stats?.totalUsers ?? '--', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '总任务数', value: stats?.totalJobs ?? '--', color: 'text-green-600', bg: 'bg-green-50' },
    { label: '运行中任务', value: stats?.activeJobs ?? stats?.processingJobs ?? '--', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '总消耗积分', value: stats?.totalCreditsSpent ?? '--', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const statusLabels: Record<string, string> = {
    PENDING: '排队中', PROCESSING: '处理中', COMPLETED: '已完成', FAILED: '失败',
  };
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700', PROCESSING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700', FAILED: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">系统概览</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-5 shadow-sm ${stat.bg}`}>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {loading ? '...' : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">最近任务</h3>
            <a href="/dashboard/jobs" className="text-xs text-primary hover:underline">查看全部</a>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无任务</p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[job.status] || job.status}
                    </span>
                    <span className="text-sm">{job.type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">最新注册用户</h3>
            <a href="/dashboard/users" className="text-xs text-primary hover:underline">查看全部</a>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无用户</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{user.displayName || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.creditBalance} 积分</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
