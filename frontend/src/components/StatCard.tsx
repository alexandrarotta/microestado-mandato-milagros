import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  headerRight?: ReactNode;
  onToggle?: () => void;
  expanded?: boolean;
  children?: ReactNode;
}

export default function StatCard({
  label,
  value,
  hint,
  headerRight,
  onToggle,
  expanded,
  children
}: StatCardProps) {
  const headerContent = (
    <>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ocean/70">
          {label}
        </p>
        <p className="mt-2 text-2xl font-display text-ink">{value}</p>
        {hint ? <p className="mt-1 text-xs text-ink/70">{hint}</p> : null}
      </div>
      {headerRight ? <div>{headerRight}</div> : null}
    </>
  );
  return (
    <div className="w-full min-w-0 rounded-2xl bg-white/70 p-4 shadow-soft border border-white/60">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex w-full items-start justify-between gap-3">
          {headerContent}
        </div>
      )}
      {children}
    </div>
  );
}
