'use client';

import { useState, useEffect } from 'react';
import { generationApi } from '@/lib/api';
import { Image as ImageIcon, Video, FolderOpen, Search, Filter, Download, Trash2, Expand, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    generationApi.list({ page: 1 })
      .then((data: any) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'IMAGE') return item.type?.includes('IMAGE');
    if (filter === 'VIDEO') return item.type?.includes('VIDEO');
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">我的资产</h1>
          <p className="text-sm text-slate-500">管理您生成的图片和视频</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="搜索提示词..." 
              className="w-full sm:w-64 pl-9 h-10 bg-white border-slate-200 rounded-xl focus-visible:ring-primary shadow-sm"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 bg-white shadow-sm">
            <Filter size={18} className="text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200 pb-4 overflow-x-auto no-scrollbar">
        <Button 
          variant={filter === 'ALL' ? 'default' : 'ghost'} 
          className={`rounded-full h-8 px-4 text-xs font-semibold transition-all ${filter === 'ALL' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          onClick={() => setFilter('ALL')}
        >
          全部
        </Button>
        <Button 
          variant={filter === 'IMAGE' ? 'default' : 'ghost'} 
          className={`rounded-full h-8 px-4 text-xs font-semibold transition-all ${filter === 'IMAGE' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          onClick={() => setFilter('IMAGE')}
        >
          <ImageIcon size={14} className="mr-1.5" /> 图片
        </Button>
        <Button 
          variant={filter === 'VIDEO' ? 'default' : 'ghost'} 
          className={`rounded-full h-8 px-4 text-xs font-semibold transition-all ${filter === 'VIDEO' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          onClick={() => setFilter('VIDEO')}
        >
          <Video size={14} className="mr-1.5" /> 视频
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">暂无资产</h3>
          <p className="text-sm text-slate-500 max-w-[250px] mb-6">您还没有生成任何{filter === 'IMAGE' ? '图片' : filter === 'VIDEO' ? '视频' : ''}资产。</p>
          <Button variant="default" className="rounded-xl shadow-sm bg-primary hover:bg-blue-700" onClick={() => window.location.href = '/workspace'}>
            开始创作
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              {/* Image/Video Container */}
              <div className="relative aspect-square bg-slate-100 overflow-hidden">
                {item.status === 'COMPLETED' && (item.output?.images?.[0] || item.output?.url || item.outputUrl) ? (
                  item.type?.includes('VIDEO') ? (
                    <video
                      src={item.output?.url || item.output?.videoUrl || item.outputUrl}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img
                      src={item.output?.images?.[0] || item.output?.url || item.outputUrl}
                      alt={item.prompt || '生成内容'}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400">
                    {item.status === 'FAILED' ? '失败' : '处理中...'}
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute left-3 top-3">
                  <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-slate-800 border-0 shadow-sm text-[10px] font-bold px-2 py-0.5 pointer-events-none">
                    {item.type?.includes('VIDEO') ? <Video size={10} className="mr-1 inline" /> : <ImageIcon size={10} className="mr-1 inline" />}
                    {item.type?.includes('VIDEO') ? '视频' : '图片'}
                  </Badge>
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-between p-3">
                  <div className="flex justify-end gap-1.5">
                    <button className="w-8 h-8 rounded-full bg-white/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors">
                      <Download size={14} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-white/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors">
                      <Expand size={14} />
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button className="w-8 h-8 rounded-full bg-white/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Meta Info */}
              <div className="p-3 bg-white">
                <p className="truncate text-xs font-medium text-slate-700 mb-1" title={item.prompt}>
                  {item.prompt || '未命名'}
                </p>
                <p className="text-[10px] font-medium text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}