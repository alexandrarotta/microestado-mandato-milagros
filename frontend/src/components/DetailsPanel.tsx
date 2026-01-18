import type { GameSave } from "../types";

interface DetailsPanelProps {
  open: boolean;
  onToggle: () => void;
  state: GameSave;
}

export default function DetailsPanel({ open, onToggle, state }: DetailsPanelProps) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <h3 className="font-display text-xl">Detalles</h3>
        <span className="text-sm text-ink/60">{open ? "Ocultar" : "Ver"}</span>
      </button>
      {open ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/70 p-3">
            Empleo: {Math.round(state.employment)}
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            Energia: {Math.round(state.energy)}
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            Innovacion: {Math.round(state.innovation)}
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            Desigualdad: {Math.round(state.inequality)}
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            Huella ambiental: {Math.round(state.environmentalImpact)}
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            Admin: {Math.round(state.admin)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
