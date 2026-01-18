import type { GameSave } from "../../../types";

interface Level2EventsTabProps {
  save: GameSave;
}

export default function Level2EventsTab({
  save
}: Level2EventsTabProps) {
  const history = save.level2?.events?.history ?? [];

  return (
    <div className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Historial de eventos</h2>
        <span className="text-xs text-ink/50">{history.length} eventos</span>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        Los eventos activos aparecen como popup en cualquier tab.
      </p>
      <div className="mt-4 space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-ink/60">Aun no hay historial.</p>
        ) : (
          history.slice(0, 10).map((item) => (
            <div
              key={item.instanceId}
              className="rounded-xl border border-ink/10 bg-white/80 p-3"
            >
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-xs text-ink/60">{item.outcomeSummary}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink/40">
                Tick {item.resolvedTick}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
