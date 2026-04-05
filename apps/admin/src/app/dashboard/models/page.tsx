'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PricingCatalogModelEntry, PricingCostUnit } from '@vsaas/shared-types';
import { adminApi } from '@/lib/api';
import { formatModelCreditCost, summarizeModelCapabilities } from '@/lib/model-configs';

type ModelRow = PricingCatalogModelEntry & {
  providerName?: string;
  available: boolean;
  reason?: string;
};

type ModelDraft = {
  displayName?: string;
  creditCost?: number;
  costUnit?: PricingCostUnit;
  isActive?: boolean;
  sortOrder?: number;
  maxDuration?: number;
};

const COST_UNITS: Array<{ label: string; value: PricingCostUnit }> = [
  { label: '按张', value: 'per_image' },
  { label: '按秒', value: 'per_second' },
  { label: '按次', value: 'per_job' },
];

const TYPE_LABELS: Record<string, string> = {
  TEXT_TO_IMAGE: '文生图',
  IMAGE_TO_IMAGE: '图生图',
  TEXT_TO_VIDEO: '文生视频',
  IMAGE_TO_VIDEO: '图生视频',
  DIGITAL_HUMAN_VIDEO: '数字人',
};

export default function AdminModelsPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ModelDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async () => {
    setLoading(true);
    setError(null);

    try {
      setModels(await adminApi.listModels());
    } catch (err: any) {
      setError(err.message || '加载模型目录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModels();
  }, []);

  const summary = useMemo(() => {
    const total = models.length;
    const active = models.filter((model) => model.isActive).length;
    const ready = models.filter((model) => model.available).length;

    return { total, active, ready };
  }, [models]);

  const updateDraft = <K extends keyof ModelDraft>(id: string, key: K, value: ModelDraft[K]) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  };

  const getRowState = (model: ModelRow) => ({
    ...model,
    ...(drafts[model.id] || {}),
  });

  const handleSave = async (model: ModelRow) => {
    const draft = drafts[model.id];
    if (!draft) return;

    setSavingId(model.id);
    setError(null);

    try {
      const updated = await adminApi.updateModel(model.provider, model.modelId, draft);
      setModels((current) => current.map((row) => (row.id === model.id ? { ...row, ...updated } : row)));
      setDrafts((current) => {
        const next = { ...current };
        delete next[model.id];
        return next;
      });
    } catch (err: any) {
      setError(err.message || `保存 ${model.displayName} 失败`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">模型配置</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              这里管理真实生效的模型定价目录。价格、启用状态和排序会直接写入后端可编辑目录，
              前台定价展示与后端扣费都将基于这份目录统一读取。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-2xl font-bold text-slate-900">{loading ? '--' : summary.total}</p>
              <p className="mt-1 text-xs text-slate-500">目录总数</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-2xl font-bold text-emerald-700">{loading ? '--' : summary.active}</p>
              <p className="mt-1 text-xs text-slate-500">已启用</p>
            </div>
            <div className="rounded-xl bg-sky-50 px-4 py-3">
              <p className="text-2xl font-bold text-sky-700">{loading ? '--' : summary.ready}</p>
              <p className="mt-1 text-xs text-slate-500">环境就绪</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">正在读取真实模型目录...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">服务商 / 模型</th>
                  <th className="px-4 py-3 font-medium">类型 / 能力</th>
                  <th className="px-4 py-3 font-medium">展示名</th>
                  <th className="px-4 py-3 font-medium">积分价格</th>
                  <th className="px-4 py-3 font-medium">排序 / 限制</th>
                  <th className="px-4 py-3 font-medium">运行状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const row = getRowState(model);
                  const dirty = Boolean(drafts[model.id]);

                  return (
                    <tr key={model.id} className="border-b border-slate-200 align-top last:border-b-0">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{model.providerName || model.provider}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {model.provider}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-slate-500">{model.modelId}</div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {TYPE_LABELS[model.type] || model.type}
                          </div>
                          <p className="text-xs leading-5 text-slate-500">
                            {summarizeModelCapabilities(model.capabilities)}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <input
                          value={row.displayName}
                          onChange={(event) => updateDraft(model.id, 'displayName', event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={row.creditCost}
                              onChange={(event) => updateDraft(model.id, 'creditCost', Number(event.target.value))}
                              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary"
                            />
                            <select
                              value={row.costUnit}
                              onChange={(event) => updateDraft(model.id, 'costUnit', event.target.value as PricingCostUnit)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary"
                            >
                              {COST_UNITS.map((unit) => (
                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-xs text-slate-500">{formatModelCreditCost(row.creditCost, row.costUnit)}</p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500">排序</label>
                            <input
                              type="number"
                              value={row.sortOrder}
                              onChange={(event) => updateDraft(model.id, 'sortOrder', Number(event.target.value))}
                              className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary"
                            />
                          </div>
                          {model.type !== 'TEXT_TO_IMAGE' ? (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">最大时长</label>
                              <input
                                type="number"
                                min={0}
                                value={row.maxDuration ?? ''}
                                onChange={(event) => updateDraft(model.id, 'maxDuration', event.target.value ? Number(event.target.value) : undefined)}
                                className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary"
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <button
                            onClick={() => updateDraft(model.id, 'isActive', !row.isActive)}
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              row.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {row.isActive ? '已启用' : '已禁用'}
                          </button>
                          <div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                model.available
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {model.available ? '环境就绪' : '环境缺失'}
                            </span>
                            {model.reason ? (
                              <p className="mt-2 text-xs leading-5 text-amber-700">{model.reason}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <button
                            onClick={() => handleSave(model)}
                            disabled={!dirty || savingId === model.id}
                            className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savingId === model.id ? '保存中...' : dirty ? '保存改动' : '已同步'}
                          </button>
                          {dirty ? (
                            <button
                              onClick={() =>
                                setDrafts((current) => {
                                  const next = { ...current };
                                  delete next[model.id];
                                  return next;
                                })
                              }
                              className="block text-xs text-slate-500 hover:text-slate-800"
                            >
                              取消编辑
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
