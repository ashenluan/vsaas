'use client';

import { useState, useEffect } from 'react';
import { scriptApi } from '@/lib/api';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadScripts = () => {
    setLoading(true);
    scriptApi.list().then((data: any) => {
      setScripts(Array.isArray(data) ? data : data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadScripts(); }, []);

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setTags('');
    setError('');
    setShowEditor(true);
  };

  const openEdit = (script: any) => {
    setEditingId(script.id);
    setTitle(script.title);
    setContent(script.content);
    setTags((script.tags || []).join(', '));
    setError('');
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('请输入标题'); return; }
    if (!content.trim()) { setError('请输入文案内容'); return; }
    setError('');
    setSaving(true);
    try {
      const tagArr = tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      if (editingId) {
        await scriptApi.update(editingId, { title: title.trim(), content: content.trim(), tags: tagArr });
      } else {
        await scriptApi.create({ title: title.trim(), content: content.trim(), tags: tagArr });
      }
      setShowEditor(false);
      loadScripts();
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此脚本？')) return;
    try {
      await scriptApi.delete(id);
      loadScripts();
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">脚本编辑</h1>
        <button
          onClick={openNew}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          新建脚本
        </button>
      </div>

      {/* 编辑弹窗 */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEditor(false)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingId ? '编辑脚本' : '新建脚本'}</h3>
              <button onClick={() => setShowEditor(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="脚本标题"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">文案内容 *</label>
                <p className="mb-2 text-xs text-muted-foreground">支持多段文案，每段将随机组合生成不同版本的视频。用空行分隔不同段落。</p>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  placeholder={"第一段口播文案...\n\n第二段口播文案...\n\n第三段口播文案..."}
                  className="w-full rounded-md border border-input bg-transparent p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">标签（可选）</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="用逗号分隔，例如：带货, 美妆, 测评"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 脚本列表 */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : scripts.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          暂无脚本，点击「新建脚本」开始编写口播文案
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script: any) => (
            <div key={script.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{script.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(script.updatedAt || script.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-4">
                {script.content}
              </p>
              {script.tags?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {script.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(script)}
                  className="text-xs text-primary hover:underline"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(script.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
