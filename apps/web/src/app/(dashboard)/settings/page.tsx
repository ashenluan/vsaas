'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import { logout } from '@/lib/auth';
import { UserCircle, Mail, Key, Shield, LogOut, Save, Sparkles, Phone, CreditCard, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    userApi.getProfile()
      .then(data => {
        setProfile(data);
        setDisplayName(data.displayName || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('显示名称不能为空');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateProfile({ displayName: displayName.trim() });
      setProfile((prev: any) => ({ ...prev, displayName: displayName.trim() }));
      toast.success('个人资料已更新');
    } catch (err: any) {
      toast.error(err?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">设置</h1>
        <p className="text-sm text-slate-500">管理您的账号偏好和账单</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1.5 p-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            {[
              { id: 'profile', label: '个人资料', icon: UserCircle },
              { id: 'security', label: '安全设置', icon: Shield },
              { id: 'billing', label: '账单与套餐', icon: CreditCard },
              { id: 'notifications', label: '通知', icon: Sparkles },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-50 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
                }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'text-primary' : 'text-slate-400'} />
                {tab.label}
              </button>
            ))}
            
            <div className="h-px bg-slate-100 my-2 mx-3"></div>
            
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
          ) : activeTab === 'profile' ? (
            <div className="flex flex-col gap-6">
              <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                  <div className="h-24 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-b border-slate-100"></div>
                  <div className="px-6 pb-6 pt-0 relative">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-white absolute -top-10">
                      {profile?.displayName?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    
                    <div className="mt-14 mb-6">
                      <h2 className="text-xl font-bold text-slate-900">{profile?.displayName || '用户'}</h2>
                      <p className="text-sm text-slate-500 font-medium">{profile?.email}</p>
                    </div>
                    
                    <form className="space-y-4" onSubmit={handleSaveProfile}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 tracking-wider">显示名称</label>
                          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-primary focus-visible:bg-white transition-all px-4 font-medium" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 tracking-wider">邮箱地址</label>
                          <Input defaultValue={profile?.email} readOnly className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-500 px-4 font-medium" />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={saving} className="h-11 px-6 rounded-xl font-bold shadow-md hover:shadow-lg transition-all" variant="default">
                          <Save size={16} className="mr-2" /> {saving ? '保存中...' : '保存修改'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/60 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">删除账号</h3>
                  <p className="text-sm text-slate-500 mb-4">永久删除您的账号及所有关联数据。</p>
                  <Button variant="outline" className="h-10 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl shadow-sm">
                    删除账号
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === 'billing' ? (
            <div className="flex flex-col gap-6">
              <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden rounded-2xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">积分余额</h3>
                      <p className="text-sm text-slate-500">可用于生成的积分</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{profile?.balance || 0}</span>
                    <span className="text-sm font-semibold text-slate-400">积分</span>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="picmagic" className="h-11 px-6 rounded-xl font-bold flex-1" onClick={() => router.push('/billing')}>
                      立即充值
                    </Button>
                    <Button variant="outline" className="h-11 px-6 rounded-xl font-bold border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50">
                      查看记录
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-24 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Settings size={28} className="text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">即将上线</h3>
              <p className="text-sm text-slate-500 max-w-[250px]">该设置将在后续版本中开放。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}