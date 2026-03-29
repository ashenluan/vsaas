'use client';

import { useState, useEffect } from 'react';
import { adminApi, adminFetch } from '@/lib/api';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [providerStats, setProviderStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats().catch(() => null),
      adminFetch('/admin/analytics/daily').catch(() => []),
      adminFetch('/admin/analytics/providers').catch(() => []),
    ]).then(([s, d, p]) => {
      setStats(s);
      setDailyStats(Array.isArray(d) ? d : []);
      setProviderStats(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">数据分析</h1>

      {/* Overview Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '总用户', value: stats?.totalUsers ?? '--', color: 'text-blue-600' },
          { label: '总任务', value: stats?.totalJobs ?? '--', color: 'text-green-600' },
          { label: '总消耗积分', value: stats?.totalCreditsSpent ?? '--', color: 'text-purple-600' },
          { label: '今日任务', value: stats?.todayJobs ?? '--', color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? '...' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Trends - Bar Chart Simulation */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">近7天任务趋势</h3>
          {dailyStats.length > 0 ? (
            <div className="flex items-end gap-2 h-48">
              {dailyStats.slice(-7).map((day: any, i: number) => {
                const max = Math.max(...dailyStats.slice(-7).map((d: any) => d.count || 1));
                const height = ((day.count || 0) / max) * 100;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{day.count || 0}</span>
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{day.date?.slice(5) || ''}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              暂无数据（API 端点 /admin/analytics/daily 待实现）
            </div>
          )}
        </div>

        {/* Provider Usage */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">模型使用量</h3>
          {providerStats.length > 0 ? (
            <div className="space-y-3">
              {providerStats.map((p: any, i: number) => {
                const max = Math.max(...providerStats.map((s: any) => s.count || 1));
                const width = ((p.count || 0) / max) * 100;
                return (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{p.provider}</span>
                      <span className="text-muted-foreground">{p.count} 次</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              暂无数据（API 端点 /admin/analytics/providers 待实现）
            </div>
          )}
        </div>

        {/* Credit Consumption */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">积分消耗概况</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">总消耗</span>
              <span className="text-lg font-bold text-red-600">{stats?.totalCreditsSpent ?? '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">总充值</span>
              <span className="text-lg font-bold text-green-600">{stats?.totalCreditsAdded ?? '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">系统积分余额</span>
              <span className="text-lg font-bold">{stats?.totalCreditsBalance ?? '--'}</span>
            </div>
          </div>
        </div>

        {/* API Cost */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">API 成本分析</h3>
          <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
            API 成本追踪待集成（需要各 Provider 返回 API 调用费用）
          </div>
        </div>
      </div>
    </div>
  );
}
