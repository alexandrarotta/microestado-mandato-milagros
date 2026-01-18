import { formatPct } from "../utils/formatPct";

interface TaxSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function getTaxLabel(value: number) {
  if (value <= 30) return "Bajo";
  if (value <= 70) return "Medio";
  return "Alto";
}

export default function TaxSelector({
  value,
  onChange,
  disabled = false
}: TaxSelectorProps) {
  const label = getTaxLabel(value);
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <h3 className="font-display text-xl">Impuestos</h3>
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span>{formatPct(Math.round(value))}</span>
        </div>
        <input
          className="w-full accent-ocean disabled:opacity-60 disabled:cursor-not-allowed"
          type="range"
          min={0}
          max={100}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="mt-2 flex justify-between text-[11px] text-ink/50">
          <span>Bajo</span>
          <span>Medio</span>
          <span>Alto</span>
        </div>
        <p className="mt-3 text-xs text-ink/50">
          Mas impuestos = +ingresos, -felicidad, +evasion.
        </p>
      </div>
    </div>
  );
}
