'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { API_UNAUTHORIZED_EVENT, userApi } from '@/lib/api';
import { logout as authLogout, clearTokens, getAccessToken } from '@/lib/auth';
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
  BookOpen,
  Scissors,
  ScanSearch,
  Shirt,
  Paintbrush,
  Copy,
  Type,
  Hand,
  Blend,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
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
  { label: 'Grok视频', desc: 'xAI Grok-2 Video生成', href: '/generate/grok-video', icon: Video, badge: '热门', badgeColor: 'bg-blue-600' },
  { label: 'Veo3.1视频', desc: 'Google Veo顶级视频', href: '/generate/veo-video', icon: Video, badge: '爆火', badgeColor: 'bg-orange-500' },
  { label: 'Sora视频', desc: 'OpenAI电影级视频', href: '/generate/sora-video', icon: Film },
  { label: '即梦2.0', desc: '字节Seedance高性价比', href: '/generate/jimeng-video', icon: Video },
  { label: 'Grok图片', desc: 'xAI高质量图片生成', href: '/generate/grok-image', icon: ImageIcon, badge: '热门', badgeColor: 'bg-blue-600' },
  { label: 'Qwen图片', desc: '通义万相图片生成', href: '/generate/qwen-image', icon: ImageIcon },
  { label: 'Banana作图', desc: 'Google Imagen超高质量', href: '/generate/banana-image', icon: ImageIcon, badge: '爆火', badgeColor: 'bg-orange-500' },
  { label: '图生图', desc: '基于参考图片生成新图片', href: '/generate/image-to-image', icon: Palette },
  { label: '图生视频', desc: '图片驱动生成动态视频', href: '/generate/image-to-video', icon: Film },
  { label: '一键成片', desc: '分镜脚本多场景成片', href: '/generate/storyboard', icon: Scissors, badge: 'new', badgeColor: 'bg-purple-500' },
  { label: '视频反推', desc: 'AI反向分析生成提示词', href: '/generate/reverse', icon: ScanSearch },
  { label: '一键换装', desc: 'AI智能服饰替换', href: '/generate/virtual-tryon', icon: Shirt },
  { label: '图像编辑', desc: '万相2.7 AI智能图像编辑', href: '/generate/inpaint', icon: Paintbrush },
  { label: '一键仿图', desc: '学习参考图风格生成新图', href: '/generate/style-copy', icon: Copy },
  { label: '无损改字', desc: '智能替换图片中的文字', href: '/generate/text-edit', icon: Type },
  { label: '手持产品', desc: 'AI生成真人手持产品图', href: '/generate/handheld', icon: Hand },
  { label: '多图融合', desc: '多张图片AI智能融合', href: '/generate/multi-fusion', icon: Blend },
  { label: '数字人', desc: '克隆声音，生成数字人视频', href: '/digital-human', icon: UserCircle, badge: 'new', badgeColor: 'bg-emerald-500' },
  { label: '批量混剪', desc: '批量合成数字人视频', href: '/digital-human/dh-batch-v2', icon: Clapperboard },
  { label: '素材中心', desc: '管理图片视频音频素材', href: '/materials', icon: FolderOpen },
  { label: '视频拆分', desc: '长视频拆分为短片段', href: '/video-split', icon: Scissors },
  { label: '智能混剪', desc: '素材智能组合批量出片', href: '/mixcut', icon: Scissors, badge: 'new', badgeColor: 'bg-violet-500' },
  { label: '模板广场', desc: '浏览和使用创作模板', href: '/templates', icon: Layers },
  { label: '提示词广场', desc: '探索AI创作提示词', href: '/prompt', icon: BookOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearTokens();
      router.replace('/login');
    };

    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);

    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return () => {
        window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
      };
    }

    userApi
      .getProfile()
      .then((profile: any) => {
        setBalance(profile.balance ?? 0);
        setUserName(profile.displayName || profile.email || '');
        setCheckedAuth(true);
      })
      .catch((err: any) => {
        if (err?.status === 401 || err?.message === 'Unauthorized') {
          handleUnauthorized();
          return;
        }

        // Non-auth error: still allow page to load
        console.error('Profile load error:', err);
        setCheckedAuth(true);
      });

    return () => {
      window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [router]);

  if (!checkedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>正在加载工作台...</span>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/workspace' && pathname.startsWith(href));

  return (
    <WsProvider>
      <Toaster position="top-center" richColors />
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
              <div className="flex items-center gap-2.5 font-bold tracking-tight text-xl">
                <div className="w-8 h-8 shrink-0 rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Sparkles size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[#1E293B] mt-0.5 tracking-[-0.02em]">青柚<span className="text-blue-600">.</span></span>
              </div>
            ) : (
              <div className="mx-auto w-8 h-8 shrink-0 rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
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
                创作工具
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
                    title={!sidebarOpen ? `${item.label} - ${item.desc}` : undefined}
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
                <span className="text-sm font-semibold text-slate-700">积分</span>
              </div>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-2xl font-bold text-slate-900 leading-none">{balance !== null ? balance : '--'}</span>
                <span className="text-xs text-slate-500 mb-0.5 ml-1">剩余</span>
              </div>
              <Button size="sm" variant="picmagic" className="w-full text-xs font-bold h-8 cursor-pointer" asChild>
                <Link href="/billing">立即充值</Link>
              </Button>
            </div>
          )}

          {/* Bottom user section */}
          <div className="shrink-0 border-t border-[#F1F5F9] p-3">
            {sidebarOpen ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-bold text-slate-800 leading-tight">{userName || '用户'}</p>
                    <Link href="/settings" className="text-[11px] font-medium text-slate-500 hover:text-primary transition-colors block truncate">
                      账号设置
                    </Link>
                  </div>
                </div>
                <button
                  onClick={authLogout}
                  className="shrink-0 cursor-pointer p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="退出登录"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 items-center">
                <Link href="/settings" className="p-2 cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg">
                  <Settings size={20} />
                </Link>
                <button
                  onClick={authLogout}
                  className="p-2 cursor-pointer text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#F8FAFC]">
          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </WsProvider>
  );
}
