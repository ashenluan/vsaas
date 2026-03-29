const fs = require('fs');

const content = `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import { WsProvider } from '@/components/ws-provider';
import {
  Home,
  FolderOpen,
  Image as ImageIcon,
  Palette,
  Video,
  Film,
  UserCircle,
  Layers,
  Wallet,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Sparkles,
  Clapperboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NavItem = {
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
};

const navItems: NavItem[] = [
  { label: '首页', desc: '快速开始', href: '/workspace', icon: Home },
  { label: '资产管理', desc: '管理上传和生成的图片', href: '/gallery', icon: FolderOpen },
  { label: '文生图', desc: '高质量AI图片生成', href: '/generate/text-to-image', icon: ImageIcon, badge: '爆火', badgeColor: 'bg-orange-500' },
  { label: '图生图', desc: '基于参考图片生成新图片', href: '/generate/image-to-image', icon: Palette },
  { label: '文生视频', desc: 'AI视频生成，创意无限', href: '/generate/text-to-video', icon: Video, badge: '热门', badgeColor: 'bg-blue-600' },
  { label: '图生视频', desc: '图片驱动生成动态视频', href: '/generate/image-to-video', icon: Film },
  { label: '数字人', desc: '克隆声音，生成数字人视频', href: '/digital-human', icon: UserCircle, badge: 'new', badgeColor: 'bg-emerald-500' },
  { label: '批量混剪', desc: '批量合成数字人视频', href: '/digital-human/compose', icon: Clapperboard },
  { label: '模板广场', desc: '浏览和使用创作模板', href: '/templates', icon: Layers },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    userApi
      .getProfile()
      .then((profile: any) => {
        setBalance(profile.balance ?? 0);
        setUserName(profile.displayName || profile.email || '');
        setCheckedAuth(true);
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.replace('/login');
      });
  }, [router]);

  if (!checkedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/workspace' && pathname.startsWith(href));

  return (
    <WsProvider>
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Sidebar - Modern minimalist flat design */}
        <aside
          className={cn(
            "flex flex-col bg-white border-r border-[#E2E8F0] shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-300",
            sidebarOpen ? 'w-[260px]' : 'w-[72px]'
          )}
        >
          {/* Logo + Toggle */}
          <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[#F1F5F9]">
            {sidebarOpen ? (
              <div className="flex items-center gap-2 font-bold tracking-tight text-xl">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <span className="text-[#1E293B]">PicMagic<span className="text-primary text-2xl leading-none">.</span></span>
              </div>
            ) : (
              <div className="mx-auto w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <Sparkles size={18} />
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors",
                !sidebarOpen && 'hidden'
              )}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          
          {/* Mobile toggle button (when collapsed) */}
          {!sidebarOpen && (
             <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mx-auto mt-4 mb-2 cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
             >
               <PanelLeftOpen size={18} />
             </button>
          )}

          {/* Menu header */}
          {sidebarOpen && (
            <div className="px-5 pb-2 pt-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CREATION TOOLS
              </span>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto py-2 px-3">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!sidebarOpen ? \`\${item.label} - \${item.desc}\` : undefined}
                    className={cn(
                      "relative flex cursor-pointer items-center rounded-lg transition-all duration-200 border border-transparent",
                      sidebarOpen ? 'px-3 py-2.5 gap-3' : 'justify-center p-3 h-12 w-12 mx-auto',
                      active
                        ? 'bg-blue-50 text-primary font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    {/* Icon container */}
                    <Icon
                      size={20}
                      className={cn(
                        "transition-colors shrink-0", 
                        active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />

                    {/* Label + Desc */}
                    {sidebarOpen && (
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <span className="text-sm tracking-tight">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className={cn("px-1.5 py-0 text-[9px] h-4 font-bold border-0 text-white", item.badgeColor)}>
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Credit balance - Card style */}
          {sidebarOpen && (
            <div className="mx-4 mb-4 rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-blue-50/10 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white p-1.5 rounded-md shadow-sm">
                  <Wallet size={16} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Credits</span>
              </div>
              <div cla
