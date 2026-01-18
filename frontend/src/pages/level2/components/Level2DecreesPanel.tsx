import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLevel2Decrees, enactLevel2Decree } from "../../../api/level2Decrees";
import { ApiError } from "../../../api/client";
import type { GameSave, Level2DecreeHistoryItem } from "../../../types";

interface Level2DecreesPanelProps {
  save: GameSave;
  token: string;
  onApplySave: (save: GameSave) => void;
  onAuthError: () => Promise<void>;
}

const EMPTY_HISTORY: Level2DecreeHistoryItem[] = [];

export default function Level2DecreesPanel({
  save,
  token,
  onApplySave,
  onAuthError
}: Level2DecreesPanelProps) {
  const [decrees, setDecrees] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      cooldownTicks: number;
      cost: { treasury?: number; admin?: number };
      requires?: { minPhase?: number };
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const cooldowns = save.level2?.decrees?.cooldownUntilById ?? {};
  const history = save.level2?.decrees?.history ?? EMPTY_HISTORY;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetchLevel2Decrees(token);
        if (!active) return;
        setDecrees(response.decrees ?? []);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          await onAuthError();
          return;
        }
        setError("No se pudieron cargar decretos.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [token, onAuthError]);

  const handleEnact = useCallback(
    async (decreeId: string) => {
      if (!token) return;
      setActionId(decreeId);
      setError(null);
      try {
        const response = await enactLevel2Decree(token, decreeId);
        if (response.state) {
          onApplySave(response.state);
        }
        setLastSummary(response.summary);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await onAuthError();
          return;
        }
        setError("No se pudo aplicar el decreto.");
      } finally {
        setActionId(null);
      }
    },
    [token, onApplySave, onAuthError]
  );

  const historyLabel = useMemo(() => {
    if (!history.length) return "Sin historial";
    const latest = history[0] as Level2DecreeHistoryItem | undefined;
    return latest ? latest.summary : "Sin historial";
  }, [history]);

  return (
    <div className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Decretos</h2>
        <span className="text-xs text-ink/50">Nivel 2</span>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        Aplica medidas especiales con costo y cooldown.
      </p>
      {loading ? <p className="mt-3 text-sm text-ink/60">Cargando...</p> : null}
      {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {decrees.map((decree) => {
          const cooldownUntil = cooldowns[decree.id] ?? 0;
          const cooldownRemaining = Math.max(0, cooldownUntil - save.tickCount);
          const hasCooldown = cooldownRemaining > 0;
          const treasuryCost = decree.cost.treasury ?? 0;
          const adminCost = decree.cost.admin ?? 0;
          const canAffordTreasury = save.treasury >= treasuryCost;
          const canAffordAdmin = save.admin >= adminCost;
          const isLockedByPhase =
            decree.requires?.minPhase &&
            save.level2 &&
            save.level2.phase < decree.requires.minPhase;
          const disabled =
            hasCooldown ||
            !canAffordTreasury ||
            !canAffordAdmin ||
            Boolean(isLockedByPhase) ||
            actionId === decree.id;

          return (
            <div key={decree.id} className="rounded-2xl border border-ink/10 bg-white/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{decree.title}</p>
                  <p className="text-xs text-ink/60">{decree.body}</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
                  Cooldown {decree.cooldownTicks}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink/60">
                <span>Tesoro: {treasuryCost}</span>
                <span>Admin: {adminCost}</span>
                {hasCooldown ? <span>Restante: {cooldownRemaining} ticks</span> : null}
                {isLockedByPhase ? (
                  <span>Requiere fase {decree.requires?.minPhase}</span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleEnact(decree.id)}
                className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  disabled ? "bg-ink/10 text-ink/40" : "bg-ember text-white hover:bg-ember/90"
                }`}
              >
                {actionId === decree.id ? "Aplicando..." : "Aplicar decreto"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-ink/10 bg-white/70 p-3">
        <p className="text-xs text-ink/60">Ultimo decreto: {historyLabel}</p>
        {lastSummary ? (
          <p className="mt-1 text-[11px] text-ink/50">{lastSummary}</p>
        ) : null}
      </div>
    </div>
  );
}
