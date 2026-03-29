'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';
import { Wallet, Sparkles, CreditCard, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const creditPackages = [
  { id: 'pack1', credits: 100, price: '¥9.9', popular: false, highlight: false },
  { id: 'pack2', credits: 500, price: '¥39.9', popular: true, highlight: true },
  { id: 'pack3', credits: 1000, price: '¥69.9', popular: false, highlight: false },
  { id: 'pack4', credits: 5000, price: '¥299.9', popular: false, highlight: false },
];

export default function BillingPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getCredits()
      .then((res: any) => {
        setBalance(typeof res === 'number' ? res : res?.balance ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleTopUp = (pack: any) => {
    // In a real app, this would redirect to payment
    alert(`正在为您充值 ${pack.credits} 积分，价格 ${pack.price}`);
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
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 text-xs">安全支付</Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pack) => (
              <Card 
                key={pack.id} 
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  pack.highlight 
                    ? 'border-2 border-primary shadow-md bg-blue-50/30' 
                    : 'border border-slate-200 shadow-sm bg-white'
                }`}
              >
                {pack.popular && (
                  <div className="absolute top-0 inset-x-0 bg-primary text-white text-[10px] font-bold uppercase tracking-wider py-1 text-center">
                    最受欢迎
                  </div>
                )}

                <CardHeader className={`pb-4 ${pack.popular ? 'pt-8' : 'pt-6'}`}>
                  <CardTitle className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={18} className={pack.highlight ? 'text-primary' : 'text-slate-400'} />
                      <span className="text-2xl font-extrabold tracking-tight text-slate-900">{pack.credits}</span>
                    </div>
                  </CardTitle>
                  <CardDescription className="font-semibold text-slate-500">积分</CardDescription>
                </CardHeader>
                
                <CardContent className="pb-6 pt-0">
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">{pack.price}</span>
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
                      pack.highlight 
                        ? 'bg-primary hover:bg-blue-700 text-white hover:shadow-md' 
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 hover:shadow-md border border-slate-200'
                    }`}
                    onClick={() => handleTopUp(pack)}
                  >
                    立即购买
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Transaction History Placeholder */}
        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4">最近交易</h2>
          <Card className="border-slate-200/60 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <CreditCard size={28} className="text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">暂无交易记录</h3>
              <p className="text-sm text-slate-500 max-w-[250px]">当您购买积分后，交易记录将显示在此处。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
