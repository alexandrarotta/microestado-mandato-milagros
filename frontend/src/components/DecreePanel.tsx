import type { DecreeConfig, GameSave } from "../types";

interface DecreePanelProps {
  decrees: DecreeConfig[];
  save: GameSave;
  onAssign: (slotId: number, decreeId: string | null) => void;
  onActivate: (slotId: number) => void;
  disabled?: boolean;
}

export default function DecreePanel({
  decrees,
  save,
  onAssign,
  onActivate,
  disabled = false
}: DecreePanelProps) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Decretos</h3>
        <span className="text-xs text-ink/60">2 ranuras</span>
      </div>
      <div className="mt-4 grid gap-4">
        {save.decreeSlots.map((slot) => {
          const decree = decrees.find((item) => item.id === slot.decreeId);
          const isActive = slot.decreeId && save.tickCount < slot.activeUntil;
          const isCooldown = slot.decreeId && save.tickCount < slot.cooldownUntil;
          const status = isActive
            ? "Activo"
            : isCooldown
            ? "Cooldown"
            : "Listo";

          return (
            <div key={slot.slotId} className="rounded-xl bg-white/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-ink/60">
                  Ranura {slot.slotId}
                </span>
                <span className="text-xs text-ink/60">{status}</span>
              </div>
              <select
                className="mt-3 w-full rounded-lg border border-ink/10 bg-white/90 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                value={slot.decreeId ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  onAssign(slot.slotId, event.target.value || null)
                }
              >
                <option value="">Sin decreto</option>
                {decrees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-ink/60">
                {decree?.description ?? "Selecciona un decreto disponible."}
              </p>
              <button
                type="button"
                onClick={() => onActivate(slot.slotId)}
                disabled={disabled || !slot.decreeId || isCooldown}
                className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  disabled || !slot.decreeId || isCooldown
                    ? "bg-ink/10 text-ink/40"
                    : "bg-ember text-white hover:bg-ember/90"
                }`}
              >
                Activar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
