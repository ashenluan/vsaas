'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<{ userId: string; email: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers({ page, search: search || undefined });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount) return;
    setAdjusting(true);
    try {
      await adminApi.adjustCredits(
        adjustModal.userId,
        parseInt(adjustAmount, 10),
        adjustDesc || `管理员手动调整 ${adjustAmount} 积分`,
      );
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustDesc('');
      loadUsers();
    } catch (err: any) {
      alert(err.message || '调整失败');
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminApi.updateUserStatus(userId, newStatus);
      loadUsers();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邮箱或昵称..."
            className="flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            搜索
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">邮箱</th>
              <th className="px-4 py-3 text-left font-medium">昵称</th>
              <th className="px-4 py-3 text-left font-medium">角色</th>
              <th className="px-4 py-3 text-left font-medium">积分</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">注册时间</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  暂无用户数据
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.displayName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                      user.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'SUPER_ADMIN' ? '超级管理员' :
                       user.role === 'ADMIN' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{user.creditBalance}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'ACTIVE' ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAdjustModal({ userId: user.id, email: user.email })}
                        className="text-xs text-primary hover:underline"
                      >
                        调整积分
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        {user.status === 'ACTIVE' ? '禁用' : '启用'}
                      </button>
                    </div>
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
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * 20 >= total}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">调整积分</h3>
            <p className="mb-4 text-sm text-muted-foreground">用户: {adjustModal.email}</p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">积分数量（正数为充值，负数为扣除）</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="例如: 100 或 -50"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">备注</label>
              <input
                type="text"
                value={adjustDesc}
                onChange={(e) => setAdjustDesc(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="调整原因"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAdjustModal(null)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                取消
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting || !adjustAmount}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {adjusting ? '处理中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
