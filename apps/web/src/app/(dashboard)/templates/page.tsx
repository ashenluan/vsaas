'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    apiFetch('/templates').then((data: any) => {
      setTemplates(Array.isArray(data) ? data : data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const categories = [
    { label: '全部', value: 'all' },
    { label: '图片模板', value: 'IMAGE' },
    { label: '视频模板', value: 'VIDEO' },
    { label: '数字人', value: 'DIGITAL_HUMAN' },
  ];

  const filtered = category === 'all' ? templates : templates.filter((t: any) => t.category === category);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">模板库</h1>

      <div className="mb-6 flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
              category === c.value ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          暂无模板
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tpl: any) => (
            <div
              key={tpl.id}
              className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {tpl.thumbnail ? (
                <img src={tpl.thumbnail} alt={tpl.name} className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                  {tpl.name}
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold">{tpl.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {tpl.description || '无描述'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    tpl.category === 'IMAGE' ? 'bg-blue-100 text-blue-700' :
                    tpl.category === 'VIDEO' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {tpl.category === 'IMAGE' ? '图片' : tpl.category === 'VIDEO' ? '视频' : '数字人'}
                  </span>
                  <button className="text-xs text-primary hover:underline">使用模板</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
