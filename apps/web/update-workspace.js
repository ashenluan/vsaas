const fs = require('fs');

const content = `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generationApi, userApi } from '@/lib/api';
import {
  Image as ImageIcon,
  Palette,
  Video,
  Film,
  UserCircle,
  Clapperboard,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const toolCards = [
  {
    title: '文生图',
    desc: '输入文字描述，AI生成高质量图片',
    href: '/generate/text-to-image',
    icon: ImageIcon,
    gradient: 'from-blue-500/10 to-blue-500/5',
    iconColor: 'text-blue-600 bg-blue-100',
    badge: '热门',
    badgeClass: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    title: '文生视频',
    desc: '输入文字描述，AI生成视频',
    href: '/generate/text-to-video',
    icon: Video,
    gradient: 'from-emerald-500/10 to-emerald-500/5',
    iconColor: 'text-emerald-600 bg-emerald-100',
    badge: '热门',
    badgeClass: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    title: '图生图',
    desc: '上传参考图，AI进行智能变换',
    href: '/generate/image-to-image',
    icon: Palette,
    gradient: 'from-purple-500/10 to-purple-500/5',
    iconColor: 'text-purple-600 bg-purple-100',
  },
  {
    title: '图生视频',
    desc: '上传图片作为起始帧，生成动态视频',
    href: '/generate/image-to-video',
    icon: Film,
    gradient: 'from-orange-500/10 to-orange-500/5',
    iconColor: 'text-orange-600 bg-orange-100',
  },
  {
    title: '数字人',
    desc: '克隆声音，生成数字人视频',
    href: '/digital-human',
    icon: UserCircle,
    gradient: 'from-pink-500/10 to-pink-500/5',
    iconColor: 'text-pink-600 bg-pink-100',
    badge: 'new',
    badgeClass: 'bg-emerald-500 hover:bg-emerald-600',
  },
  {
    title: '批量混剪',
    desc: '批量合成数字人视频',
    href: '/digital-human/dh-batch-v2',
    icon: Clapperboard,
    gradient: 'from-violet-500/10 to-violet-500/5',
    iconColor: 'text-violet-600 bg-violet-100',
  },
];

export default function WorkspacePage() {
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({ images: 0, videos: 0, total: 0 });

  useEffect(() => {
    generationApi.list({ page: 1 }).then((data: any) => {
      const items = data.items || [];
      setRecentJobs(items.slice(0, 8));
      const images = items.filter((j: any) => j.type?.includes('IMAGE')).length;
      const videos = items.filter((j: any) => j.type?.includes('VIDEO')).length;
      setStats({ images, videos, total: data.total || items.length });
    }).catch(() => {});

    userApi.getCredits().then((c: any) => setBalance(typeof c === 'number' ? c : c?.balance ?? null)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Welcome back, Creator! 🎨</h1>
        <p className="text-slate-500">What would you like to create today?</p>
      </div>

      {/* Stats Cards - Modern minimal style */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <Sparkles size={20} strokeWidth={2.5} />
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Available</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Current Credits</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{balance ?? '--'}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <TrendingUp size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Generations</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Zap size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Images / Videos</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.images}</h3>
                <span className="text-slate-300 text-xl font-light mx-1">/</span>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.videos}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool cards */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">AI Tools</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${tool.iconColor}`}>
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    {tool.badge && (
                      <Badge className={tool.badgeClass + " border-0 font-bold px-2 py-0.5 text-[10px]"}>
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{tool.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4 min-h-[40px]">{tool.desc}</p>
                  </div>
                  
                  <div className="flex items-center font-bold text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    <span className="text-sm">Start Creating</span> 
                    <ArrowRight size={16} cl
