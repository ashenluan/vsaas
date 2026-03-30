'use client';

import { STEPS, useComposeStore, type Step } from './use-compose-store';
import { CheckCircle2 } from 'lucide-react';

/* ---- 可点击跳转的步骤指示器 ---- */
export function StepIndicator() {
  const step = useComposeStore((s) => s.step);
  const setStep = useComposeStore((s) => s.setStep);
  const currentIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mb-8 flex flex-wrap items-center gap-1">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = s.key === step;
        return (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-all duration-200 ${
                active
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm scale-105'
                  : done
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                active ? 'bg-white/20' : done ? 'bg-primary/20' : 'bg-white/10'
              }`}>
                {done ? <CheckCircle2 size={12} /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`mx-0.5 h-px w-4 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- 步骤容器 + 上下导航 ---- */
export function StepContainer({
  title,
  description,
  children,
  canNext = true,
  nextLabel,
  showPrev = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  canNext?: boolean;
  nextLabel?: string;
  showPrev?: boolean;
}) {
  const { step, nextStep, prevStep } = useComposeStore();
  const idx = STEPS.findIndex((s) => s.key === step);
  const isLast = idx === STEPS.length - 1;

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {description && <p className="mb-5 text-sm text-muted-foreground">{description}</p>}
      {children}
      <div className="mt-8 flex justify-between">
        {showPrev && idx > 0 ? (
          <button
            onClick={prevStep}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            ← 上一步
          </button>
        ) : (
          <div />
        )}
        {!isLast && (
          <button
            onClick={nextStep}
            disabled={!canNext}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {nextLabel ?? '下一步 →'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---- Toggle Switch 组件 ---- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/* ---- Card wrapper ---- */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}

/* ---- Chip selector ---- */
export function ChipSelect({
  items,
  selected,
  onToggle,
  allowMultiple = true,
}: {
  items: { id: string; label: string; description?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  allowMultiple?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id)}
          title={item.description}
          className={`rounded-md border px-2.5 py-1 text-xs transition-all duration-150 ${
            selected.includes(item.id)
              ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/20'
              : 'border-input hover:bg-accent hover:border-primary/30'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Color picker inline ---- */
export function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border p-0.5" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

/* ---- Slider ---- */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-medium tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
