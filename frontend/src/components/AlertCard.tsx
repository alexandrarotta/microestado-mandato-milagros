import type { AlertLevel } from "../utils/alerts";

interface AlertCardProps {
  label: string;
  value: string;
  hint?: string;
  alert: AlertLevel;
  meaning: string;
  reason: string;
  suggestion: string;
  expanded: boolean;
  onToggle: () => void;
}

const alertStyles: Record<AlertLevel, { chip: string }> = {
  OK: {
    chip: "bg-ink/10 text-ink/60"
  },
  WARN: {
    chip: "bg-amber-200/60 text-amber-800"
  },
  CRITICAL: {
    chip: "bg-ember/15 text-ember"
  }
};

export default function AlertCard({
  label,
  value,
  hint,
  alert,
  meaning,
  reason,
  suggestion,
  expanded,
  onToggle
}: AlertCardProps) {
  const style = alertStyles[alert];
  return (
    <div className="w-full min-w-0 rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-left transition hover:bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xl font-display text-ink">{value}</p>
          {hint ? <p className="mt-1 text-xs text-ink/60">{hint}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${style.chip}`}
          >
            {alert}
          </span>
          <span className="text-[10px] text-ink/40">
            {expanded ? "Ocultar" : "Ver"}
          </span>
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? "max-h-40 mt-3" : "max-h-0"
        }`}
      >
        <div className="space-y-2 text-xs text-ink/60">
          <div>
            <span className="font-semibold text-ink">Que significa:</span>{" "}
            {meaning}
          </div>
          <div>
            <span className="font-semibold text-ink">Por que alerta:</span>{" "}
            {reason}
          </div>
          <div>
            <span className="font-semibold text-ink">Sugerencia:</span>{" "}
            {suggestion}
          </div>
        </div>
      </div>
    </div>
  );
}
