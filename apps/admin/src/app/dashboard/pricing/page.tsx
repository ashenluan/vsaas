'use client';

import { useEffect, useState } from 'react';
import type { CreditPackage } from '@vsaas/shared-types';
import { adminApi } from '@/lib/api';

function formatPrice(price: number) {
  return `¥${price.toFixed(price % 1 === 0 ? 0 : 1)}`;
}

export default function AdminPricingPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getCreditPackages()
      .then((data: any) => setPackages(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">积分包管理</h1>
        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          只读视图
        </span>
      </div>
      {loading ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          正在加载积分包...
        </div>
      ) : packages.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{pkg.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-primary">{formatPrice(pkg.price)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pkg.credits} 积分</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    pkg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pkg.isActive ? '启用中' : '已停用'}
                </span>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                排序权重 #{pkg.sortOrder} · 数据源自数据库 credit_packages
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          暂无积分包数据。请检查数据库 seed 是否已执行。
        </div>
      )}
    </div>
  );
}
