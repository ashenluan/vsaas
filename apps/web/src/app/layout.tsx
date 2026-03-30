import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '青柚 - AI 创作平台',
  description: '一站式 AI 图片、视频、数字人创作平台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen bg-background" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
