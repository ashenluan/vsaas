'use client';

import { useState } from 'react';
import Link from 'next/link';
import { setTokens } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authApi.register(email, password, name || email.split('@')[0]);

      setTokens(data.accessToken, data.refreshToken);
      window.location.href = '/workspace';
    } catch (err: any) {
      setError(err?.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">注册</h1>
        <p className="mt-1 text-sm text-muted-foreground">创建你的AI创作账号</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">昵称（可选）</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="请输入昵称"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="请输入邮箱"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="至少6位密码"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        已有账号？{' '}
        <Link href="/login" className="text-primary hover:underline">
          登录
        </Link>
      </p>
    </div>
  );
}
