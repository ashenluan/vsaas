'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

export default function ProvidersConfigPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProviders = () => {
    setLoading(true);
    adminApi.listProviders()
      .then((data: any) => setProviders(Array.isArray(data) ? data : data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProviders(); }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await adminApi.updateProvider(id, { isEnabled: !currentEnabled });
      loadProviders();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const handleEditConfig = (provider: any) => {
    setEditingId(provider.id);
    setConfigJson(JSON.stringify(provider.config || {}, null, 2));
  };

  const handleSaveConfig = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const config = JSON.parse(configJson);
      await adminApi.updateProvider(editingId, { config });
      setEditingId(null);
      loadProviders();
    } catch (err: any) {
      alert(err.message || '保存失败，请检查JSON格式');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">模型/API 配置</h1>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          暂无 Provider 配置。请检查数据库 seed 是否已执行。
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider: any) => (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{provider.name}</h3>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    provider.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {provider.isEnabled ? '已启用' : '已禁用'}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    provider.available ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {provider.available ? '环境就绪' : '环境未就绪'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">ID: {provider.provider}</p>
                {!provider.available && provider.reason ? (
                  <p className="mt-1 text-xs text-amber-700">{provider.reason}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditConfig(provider)}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  配置
                </button>
                <button
                  onClick={() => handleToggle(provider.id, provider.isEnabled)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    provider.isEnabled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {provider.isEnabled ? '禁用' : '启用'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config Editor Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">编辑配置</h3>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">非敏感运行配置（JSON 格式，不包含 API Key 等密钥）</p>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={12}
              className="w-full rounded-md border border-input bg-transparent p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingId(null)} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
