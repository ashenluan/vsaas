'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api';

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('IMAGE');
  const [thumbnail, setThumbnail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = () => {
    setLoading(true);
    adminFetch('/admin/templates')
      .then((data: any) => setTemplates(Array.isArray(data) ? data : data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError('请输入模板名称'); return; }
    setSaving(true);
    setError('');
    try {
      await adminFetch('/admin/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category,
          thumbnail: thumbnail || undefined,
          config: {},
        }),
      });
      setShowCreate(false);
      setName('');
      setThumbnail('');
      loadTemplates();
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此模板？')) return;
    try {
      await adminFetch(`/admin/templates/${id}`, { method: 'DELETE' });
      loadTemplates();
    } catch {}
  };

  const handleTogglePublic = async (tpl: any) => {
    try {
      await adminFetch(`/admin/templates/${tpl.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: !tpl.isPublic }),
      });
      loadTemplates();
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">模板管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          新建模板
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">新建模板</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">模板名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="模板名称"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">分类</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="IMAGE">图片模板</option>
                  <option value="VIDEO">视频模板</option>
                  <option value="DIGITAL_HUMAN">数字人模板</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">缩略图URL（可选）</label>
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          暂无模板，点击「新建模板」创建
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium">分类</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">创建时间</th>
                <th className="px-4 py-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl: any) => (
                <tr key={tpl.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{tpl.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      tpl.category === 'IMAGE' ? 'bg-blue-100 text-blue-700' :
                      tpl.category === 'VIDEO' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {tpl.category === 'IMAGE' ? '图片' : tpl.category === 'VIDEO' ? '视频' : '数字人'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      tpl.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tpl.isPublic ? '已发布' : '未发布'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(tpl.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTogglePublic(tpl)}
                        className="text-xs text-primary hover:underline"
                      >
                        {tpl.isPublic ? '下架' : '发布'}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
