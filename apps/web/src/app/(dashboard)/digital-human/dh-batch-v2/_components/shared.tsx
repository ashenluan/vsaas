'use client';

import { STEPS, useDhV2Store, type Step } from './use-dh-v2-store';
import { CheckCircle2 } from 'lucide-react';

export function StepIndicator() {
  const step = useDhV2Store((s) => s.step);
  const setStep = useDhV2Store((s) => s.setStep);
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
  const { step, nextStep, prevStep } = useDhV2Store();
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

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}
