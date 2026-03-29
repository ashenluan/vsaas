'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const subNavItems = [
  { label: '概览', href: '/digital-human' },
  { label: '声音管理', href: '/digital-human/voices' },
  { label: '数字人形象', href: '/digital-human/avatars' },
  { label: '脚本编辑', href: '/digital-human/scripts' },
  { label: '批量混剪', href: '/digital-human/compose' },
];

export default function DigitalHumanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="mb-6 flex gap-1 rounded-lg border bg-muted/50 p-1">
        {subNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
