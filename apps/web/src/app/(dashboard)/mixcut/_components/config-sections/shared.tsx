import type { ReactNode } from 'react';

export function ConfigSection({
  id,
  icon: Icon,
  label,
  badge,
  children,
}: {
  id?: string;
  icon: any;
  label: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="rounded-xl border bg-card p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-[12px] font-medium">{label}</span>
        {badge && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}
