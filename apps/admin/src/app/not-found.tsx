import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">页面未找到</p>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          返回管理后台
        </Link>
      </div>
    </div>
  );
}
