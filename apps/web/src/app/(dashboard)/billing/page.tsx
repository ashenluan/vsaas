'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';
import type { CreditPackage, Order } from '@vsaas/shared-types';
import { Wallet, Sparkles, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatPrice(price: number) {
  return `¥${price.toFixed(price % 1 === 0 ? 0 : 1)}`;
}

function getPackageFlags(packages: CreditPackage[], currentId: string) {
  const sorted = [...packages].sort((a, b) => a.price - b.price);
  const median = sorted[Math.floor(sorted.length / 2)]?.id;
  return {
    popular: currentId === median,
    highlight: currentId === median,
  };
}

const orderStatusLabels: Record<string, string> = {
  PENDING: '待处理',
  PAID: '已入账',
  FAILED: '失败',
  REFUNDED: '已退款',
};

export default function BillingPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userApi.getCredits().catch(() => null),
      userApi.getBillingPackages().catch(() => []),
      userApi.getOrders(1, 6).catch(() => ({ items: [] })),
    ])
      .then(([res, pkgRes, orderRes]: any) => {
        setBalance(typeof res === 'number' ? res : res?.balance ?? 0);
        setPackages(Array.isArray(pkgRes) ? pkgRes : []);
        setOrders(Array.isArray(orderRes?.items) ? orderRes.items : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTopUp = (pack: CreditPackage) => {
    alert(`当前为人工充值模式，请联系管理员为您充值「${pack.name}」：${pack.credits} 积分，价格 ${formatPrice(pack.price)}。`);
  };

  return (
    <div className="mx-auto max-w-5xl w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">账单与积分</h1>
        <p className="text-sm text-slate-500">管理您的积分和余额充值</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Current Balance */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden rounded-2xl relative text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/30 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
          
          <CardContent className="p-8 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 text-blue-100">
                <Wallet size={18} />
                <span className="text-sm font-semibold uppercase tracking-wider">当前余额</span>
              </div>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <div className="h-12 w-24 bg-white/20 rounded-lg animate-pulse"></div>
                ) : (
                  <span className="text-5xl font-extrabold tracking-tight">{balance ?? '--'}</span>
                )}
                <span className="text-lg font-semibold text-blue-200">积分</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-sm font-bold">什么是积分？</span>
              </div>
              <p className="text-xs text-blue-100 max-w-[200px]">积分用于生成内容。不同模型消耗不同数量的积分。</p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">充值积分</h2>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-bold px-3 py-1 text-xs">人工充值</Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
                    <div className="mt-4 h-10 w-28 animate-pulse rounded bg-slate-100" />
                    <div className="mt-6 h-24 animate-pulse rounded bg-slate-50" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : packages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pack) => {
                const { popular, highlight } = getPackageFlags(packages, pack.id);
                return (
              <Card 
                key={pack.id} 
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  highlight 
                    ? 'border-2 border-primary shadow-md bg-blue-50/30' 
                    : 'border border-slate-200 shadow-sm bg-white'
                }`}
              >
                {popular && (
                  <div className="absolute top-0 inset-x-0 bg-primary text-white text-[10px] font-bold uppercase tracking-wider py-1 text-center">
                    最受欢迎
                  </div>
                )}

                <CardHeader className={`pb-4 ${popular ? 'pt-8' : 'pt-6'}`}>
                  <CardTitle className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={18} className={highlight ? 'text-primary' : 'text-slate-400'} />
                      <span className="text-2xl font-extrabold tracking-tight text-slate-900">{pack.credits}</span>
                    </div>
                  </CardTitle>
                  <CardDescription className="font-semibold text-slate-500">{pack.name}</CardDescription>
                </CardHeader>
                
                <CardContent className="pb-6 pt-0">
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">{formatPrice(pack.price)}</span>
                  </div>
                  
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2 text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="font-medium">永不过期</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="font-medium">全模型通用</span>
                    </li>
                  </ul>
                  
                  <Button 
                    className={`w-full h-11 rounded-xl font-bold transition-all shadow-sm ${
                      highlight 
                        ? 'bg-primary hover:bg-blue-700 text-white hover:shadow-md' 
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 hover:shadow-md border border-slate-200'
                    }`}
                    onClick={() => handleTopUp(pack)}
                  >
                    人工充值
                  </Button>
                </CardContent>
              </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-slate-200/60 shadow-sm bg-white rounded-2xl">
              <CardContent className="p-12 text-center text-sm text-slate-500">
                当前还没有可用积分包，请先在管理后台配置套餐。
              </CardContent>
            </Card>
          )}
        </div>

        {/* Transaction History */}
        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4">最近交易</h2>
          <Card className="border-slate-200/60 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">正在加载交易记录...</div>
              ) : orders.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <CreditCard size={28} className="text-slate-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">暂无交易记录</h3>
                  <p className="text-sm text-slate-500 max-w-[250px]">管理员为您充值后，最近订单会显示在这里。</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <div key={order.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{orderStatusLabels[order.status] || order.status}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          订单 {order.id.slice(0, 8)}... · {new Date(order.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-sm font-semibold text-slate-900">+{order.credits} 积分</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatPrice(order.amount)} · {order.paymentMethod || '人工充值'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
