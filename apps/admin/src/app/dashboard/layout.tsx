'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminNavItems = [
  { label: '概览', href: '/dashboard', icon: '📊' },
  { label: '用户管理', href: '/dashboard/users', icon: '👥' },
  { label: '订单管理', href: '/dashboard/orders', icon: '📦' },
  { label: '任务监控', href: '/dashboard/jobs', icon: '⚡' },
  { label: '模板管理', href: '/dashboard/templates', icon: '📋' },
  { label: '模型配置', href: '/dashboard/models', icon: '🤖' },
  { label: '积分包管理', href: '/dashboard/pricing', icon: '💰' },
  { label: '数据分析', href: '/dashboard/analytics', icon: '📈' },
  { label: '系统设置', href: '/dashboard/settings', icon: '⚙️' },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 flex-col border-r bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-lg font-bold text-primary">VSaaS 管理</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              window.location.href = '/';
            }}
            className="w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <h2 className="text-sm font-medium">
            {adminNavItems.find((item) => item.href === pathname)?.label || '管理后台'}
          </h2>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
