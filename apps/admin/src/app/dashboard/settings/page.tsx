'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';

type ProviderRuntimeRow = {
  id: string;
  name: string;
  provider: string;
  isEnabled: boolean;
  available: boolean;
  reason?: string;
  config?: Record<string, unknown>;
};

type SystemCapabilities = {
  mixcutGlobalSpeechEnabled: boolean;
};

const runbookItems = [
  {
    title: '模型密钥',
    status: '环境变量托管',
    description: 'API Key 不在后台页面保存，避免误改线上密钥。需要改动时请更新服务器 .env.production 并重新部署。',
  },
  {
    title: '模型开关与非敏感参数',
    status: '后台可配置',
    description: '启用状态和非敏感 JSON 运行参数请前往“模型/API 配置”页面调整，修改后即时生效。',
  },
  {
    title: '充值链路',
    status: '人工充值模式',
    description: '用户提交充值申请后，由管理员在订单页标记“已入账”，系统会自动增加积分且避免重复入账。',
  },
  {
    title: '部署方式',
    status: 'Docker Compose',
    description: '生产环境运行在服务器 Docker Compose 中，构建、迁移、重启都走现有部署脚本；ADMIN_URL 必须保持为 http://localhost:3002。',
  },
];

export default function AdminSettingsPage() {
  const [providers, setProviders] = useState<ProviderRuntimeRow[]>([]);
  const [systemCapabilities, setSystemCapabilities] = useState<SystemCapabilities>({
    mixcutGlobalSpeechEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [capabilitySaving, setCapabilitySaving] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      adminApi.listProviders(),
      adminApi.getSystemCapabilities(),
    ])
      .then(([providerData, capabilityData]: any) => {
        if (!active) return;
        setProviders(Array.isArray(providerData) ? providerData : []);
        setSystemCapabilities({
          mixcutGlobalSpeechEnabled: capabilityData?.mixcutGlobalSpeechEnabled ?? false,
        });
      })
      .catch((error: Error) => {
        if (!active) return;
        setLoadError(error.message || '加载运行配置失败');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleMixcutGlobalSpeech = async () => {
    setCapabilitySaving(true);
    setLoadError(null);

    try {
      const next = await adminApi.updateSystemCapabilities({
        mixcutGlobalSpeechEnabled: !systemCapabilities.mixcutGlobalSpeechEnabled,
      });

      setSystemCapabilities({
        mixcutGlobalSpeechEnabled: next?.mixcutGlobalSpeechEnabled ?? false,
      });
    } catch (error: any) {
      setLoadError(error?.message || '更新系统能力开关失败');
    } finally {
      setCapabilitySaving(false);
    }
  };

  const providerSummary = useMemo(() => {
    const total = providers.length;
    const enabled = providers.filter((provider) => provider.isEnabled).length;
    const ready = providers.filter((provider) => provider.available).length;

    return { total, enabled, ready };
  }, [providers]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">系统设置</h1>
            <p className="text-sm leading-6 text-slate-600">
              这个页面只展示真实生效的运行规则，不再提供无法落库的假表单。敏感配置由服务器环境变量托管，
              后台只负责展示状态与跳转到实际可修改的配置入口。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/providers"
              className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              打开模型/API 配置
            </Link>
            <Link
              href="/dashboard/orders"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              查看充值订单
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {runbookItems.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {item.status}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-amber-900">系统能力开关</h2>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-amber-800">
                    Mixcut 全局口播
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      systemCapabilities.mixcutGlobalSpeechEnabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {systemCapabilities.mixcutGlobalSpeechEnabled ? '当前已开启' : '当前已关闭'}
                  </span>
                </div>
                <p className="text-sm leading-6 text-amber-900/90">
                  基于线上实测结果，阿里云脚本化自动成片当前的顶层 <code>SpeechTextArray</code> 会卡在 <code>Init</code>，
                  因此该能力默认关闭。关闭后，用户端只能稳定使用分组口播。
                </p>
              </div>
              <button
                onClick={handleToggleMixcutGlobalSpeech}
                disabled={loading || capabilitySaving}
                className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  systemCapabilities.mixcutGlobalSpeechEnabled
                    ? 'bg-slate-900 text-white hover:bg-slate-700'
                    : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}
              >
                {capabilitySaving
                  ? '保存中...'
                  : systemCapabilities.mixcutGlobalSpeechEnabled
                    ? '关闭全局口播'
                    : '开启全局口播'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Provider 运行状态</h2>
              <p className="mt-1 text-sm text-slate-500">
                状态来自真实运行时诊断，可用于判断模型是否缺少环境变量或被后台禁用。
              </p>
            </div>
            <Link href="/dashboard/providers" className="text-sm font-medium text-primary hover:underline">
              去配置页
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">正在读取真实运行状态...</div>
          ) : loadError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          ) : providers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">当前没有可展示的 Provider 配置。</div>
          ) : (
            <div className="mt-5 space-y-3">
              {providers.map((provider) => {
                const configKeys = Object.keys(provider.config || {});

                return (
                  <div
                    key={provider.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {provider.provider}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              provider.isEnabled
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {provider.isEnabled ? '后台已启用' : '后台已禁用'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              provider.available
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {provider.available ? '运行环境就绪' : '运行环境缺失'}
                          </span>
                        </div>
                        {provider.reason ? (
                          <p className="mt-2 text-sm text-slate-600">{provider.reason}</p>
                        ) : null}
                      </div>

                      <div className="text-sm text-slate-500">
                        {configKeys.length > 0
                          ? `非敏感参数 ${configKeys.length} 项`
                          : '未配置额外 JSON 参数'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">运行摘要</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{loading ? '--' : providerSummary.total}</p>
                <p className="mt-1 text-xs text-slate-500">Provider 总数</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{loading ? '--' : providerSummary.enabled}</p>
                <p className="mt-1 text-xs text-slate-500">后台已启用</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-4 text-center">
                <p className="text-2xl font-bold text-sky-700">{loading ? '--' : providerSummary.ready}</p>
                <p className="mt-1 text-xs text-slate-500">环境就绪</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-900">当前运维规则</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-900">
              <li>不要在后台录入 API Key，密钥统一由服务器环境变量维护。</li>
              <li>模型参数改动后无需重新发布；密钥和基础设施改动后需要重新部署。</li>
              <li>生产环境的 ADMIN_URL 必须指向 http://localhost:3002，不能写成公网 a.newcn.cc:3002，否则会破坏后台登录与 CORS。</li>
              <li>用户充值仍是人工审核流程，到账动作必须在订单页完成，避免直接手动改余额绕过订单记录。</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
