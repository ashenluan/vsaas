'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, Video, FolderOpen, Mic2, FileText, Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const subNavItems = [
  { label: '我的数字人', href: '/digital-human', icon: UserCircle },
  { label: '创作视频', href: '/digital-human/create', icon: Video },
  { label: '作品管理', href: '/digital-human/works', icon: FolderOpen },
  { label: '声音管理', href: '/digital-human/voices', icon: Mic2 },
  { label: '脚本编辑', href: '/digital-human/scripts', icon: FileText },
  { label: '批量混剪', href: '/digital-human/compose', icon: Clapperboard },
];

export default function DigitalHumanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1400px]">
      <nav className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {subNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
