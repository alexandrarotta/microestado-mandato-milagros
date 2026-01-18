import type { GameSave } from "../types";
import { formatPct } from "../utils/formatPct";

interface BudgetSlidersProps {
  budget: GameSave["budget"];
  onChange: (
    key: "industryPct" | "welfarePct" | "securityDiplomacyPct",
    value: number
  ) => void;
  autoBalanceUnlocked?: boolean;
  onAutoBalance?: () => void;
  disabled?: boolean;
}

export default function BudgetSliders({
  budget,
  onChange,
  autoBalanceUnlocked,
  onAutoBalance,
  disabled = false
}: BudgetSlidersProps) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Presupuesto</h3>
        <div className="flex items-center gap-2 text-xs text-ink/60">
          <span>Suma {formatPct(100)}</span>
          {autoBalanceUnlocked && onAutoBalance ? (
            <button
              type="button"
              onClick={onAutoBalance}
              disabled={disabled}
              className="rounded-full border border-ink/10 bg-white/80 px-2 py-1 text-[10px] uppercase tracking-[0.2em] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Auto balance
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex justify-between text-sm">
            <span>Industria</span>
            <span>{formatPct(budget.industryPct)}</span>
          </div>
          <input
            className="w-full accent-ocean disabled:opacity-60 disabled:cursor-not-allowed"
            type="range"
            min={0}
            max={100}
            value={budget.industryPct}
            disabled={disabled}
            onChange={(event) => onChange("industryPct", Number(event.target.value))}
          />
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span>Bienestar</span>
            <span>{formatPct(budget.welfarePct)}</span>
          </div>
          <input
            className="w-full accent-sage disabled:opacity-60 disabled:cursor-not-allowed"
            type="range"
            min={0}
            max={100}
            value={budget.welfarePct}
            disabled={disabled}
            onChange={(event) => onChange("welfarePct", Number(event.target.value))}
          />
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span>Seguridad/Diplomacia</span>
            <span>{formatPct(budget.securityDiplomacyPct)}</span>
          </div>
          <input
            className="w-full accent-ember disabled:opacity-60 disabled:cursor-not-allowed"
            type="range"
            min={0}
            max={100}
            value={budget.securityDiplomacyPct}
            disabled={disabled}
            onChange={(event) =>
              onChange("securityDiplomacyPct", Number(event.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}
