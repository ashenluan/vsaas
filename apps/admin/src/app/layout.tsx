import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VSaaS 管理后台',
  description: 'AI创作平台管理后台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
