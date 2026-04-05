'use client';

import { useState, useEffect } from 'react';
import { adminApi, adminFetch } from '@/lib/api';
import { formatOrderAmount } from '@/lib/order-amount';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/admin/orders?page=${page}`)
      .then((data: any) => {
        setOrders(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const updateOrderStatus = async (orderId: string, status: 'PAID' | 'FAILED') => {
    setUpdatingOrderId(orderId);
    setNotice(null);

    try {
      const updated = await adminApi.updateOrderStatus(orderId, status);
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, ...updated } : order)),
      );
      setNotice({
        type: 'success',
        message:
          status === 'PAID'
            ? '订单已标记为已入账，用户积分已同步增加。'
            : '订单已标记为失败。',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '更新订单状态失败，请稍后重试。',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const statusLabels: Record<string, string> = {
    PENDING: '待支付', PAID: '已支付', FAILED: '失败', REFUNDED: '已退款',
  };
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700', REFUNDED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">订单管理</h1>

      {notice && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">订单ID</th>
              <th className="px-4 py-3 text-left font-medium">用户</th>
              <th className="px-4 py-3 text-left font-medium">金额</th>
              <th className="px-4 py-3 text-left font-medium">积分</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">创建时间</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">加载中...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  暂无人工充值申请
                </td>
              </tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-xs">{order.user?.email || order.userId}</td>
                  <td className="px-4 py-3 font-medium">¥{formatOrderAmount(order.amount)}</td>
                  <td className="px-4 py-3">{order.credits}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] || ''}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    {order.status === 'PENDING' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PAID')}
                          disabled={updatingOrderId === order.id}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingOrderId === order.id ? '处理中...' : '标记已入账'}
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'FAILED')}
                          disabled={updatingOrderId === order.id}
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          标记失败
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {order.status === 'PAID' ? '已完成入账' : '无需处理'}
                      </span>
                    )}
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
