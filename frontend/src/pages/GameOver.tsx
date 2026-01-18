import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetGame } from "../api/game";
import { ApiError } from "../api/client";
import { useGameStore } from "../store/gameStore";
import { formatIndexPct } from "../utils/formatPct";
import { getGdpIndex, resolveBaselineGdp } from "../utils/metrics";

export default function GameOver() {
  const navigate = useNavigate();
  const save = useGameStore((state) => state.save);
  const token = useGameStore((state) => state.token);
  const config = useGameStore((state) => state.config);
  const setSave = useGameStore((state) => state.setSave);
  const logout = useGameStore((state) => state.logout);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  if (!save || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow text-center">
          <h1 className="font-display text-3xl">Cargando resumen...</h1>
        </div>
      </div>
    );
  }

  const reason = save.level2?.gameOverReason ?? "Mandato finalizado";
  const baseline = resolveBaselineGdp(save.gdp, save.baselineGdp);
  const gdpIndex = getGdpIndex(save.gdp, baseline);

  const handleReset = async () => {
    if (!token || resetting) return;
    setResetting(true);
    try {
      await resetGame(token);
      setSave(null);
      navigate("/onboarding/country", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate("/login", { replace: true });
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl bg-white/80 p-8 shadow-glow border border-white/60">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/60">Game Over</p>
          <h1 className="mt-2 font-display text-4xl">{reason}</h1>
          <p className="mt-3 text-sm text-ink/60">
            {save.country.formalName || save.country.baseName} - {save.leader.name}
          </p>
        </header>

        <section className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
          <h2 className="font-display text-2xl">Resumen final</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">PIB</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatIndexPct(gdpIndex)}
              </p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Estabilidad</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {Math.round(save.stability)}
              </p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Confianza</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {Math.round(save.institutionalTrust)}
              </p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Reputacion</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {Math.round(save.reputation)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
          <h2 className="font-display text-2xl">Opciones</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/level-complete")}
              className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {resetting ? "Reseteando..." : "Reset partida"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
