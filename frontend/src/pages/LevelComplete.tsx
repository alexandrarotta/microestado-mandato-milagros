import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSave } from "../api/save";
import { continueToLevel2, resetGame } from "../api/game";
import { fetchProfile, updateProfile } from "../api/profile";
import { ApiError } from "../api/client";
import { useGameStore } from "../store/gameStore";
import {
  getIndustryModifierById,
  getIndustrySoftRequirementMultiplier
} from "../store/engine";
import type { GameSave, ProfilePayload } from "../types";
import { formatPct, formatIndexPct } from "../utils/formatPct";
import { getGdpIndex, resolveBaselineGdp } from "../utils/metrics";
import { formatRoleTitle } from "../utils/roleLabels";

const DEMOCRATIC_ROLE_IDS = new Set([
  "PRESIDENT",
  "PRIME_MINISTER",
  "KING_PARLIAMENT",
  "CHANCELLOR"
]);

const MEDAL_LABELS: Record<string, { title: string; note: string }> = {
  DEMOCRATIC_MEDAL_L1: {
    title: "Medalla Democratica",
    note: "Mandato validado por instituciones"
  },
  REELECTION_L2: {
    title: "Reeleccion L2",
    note: "Victoria electoral en Nivel 2"
  }
};

function ensureLevelFields(save: GameSave) {
  const resolvedPhase = save.phase ?? 1;
  return {
    ...save,
    level: save.level ?? 1,
    level1Complete: save.level1Complete ?? resolvedPhase >= 4
  };
}

export default function LevelComplete() {
  const navigate = useNavigate();
  const token = useGameStore((state) => state.token);
  const save = useGameStore((state) => state.save);
  const setSave = useGameStore((state) => state.setSave);
  const config = useGameStore((state) => state.config);
  const logout = useGameStore((state) => state.logout);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const medalAwardedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        let nextSave = save;
        if (!nextSave) {
          const response = await fetchSave(token);
          if (response.state) {
            nextSave = ensureLevelFields(response.state);
            setSave(nextSave);
          }
        }
        const profileResponse = await fetchProfile(token);
        if (!active) return;
        setProfile(profileResponse);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          navigate("/login", { replace: true });
          return;
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [token, save, setSave, navigate, logout]);

  useEffect(() => {
    if (!token || !save || !profile) return;
    if (medalAwardedRef.current) return;
    const isDemocratic = DEMOCRATIC_ROLE_IDS.has(save.leader.roleId);
    if (!isDemocratic) return;
    if (profile.medals.includes("DEMOCRATIC_MEDAL_L1")) return;
    medalAwardedRef.current = true;
    updateProfile(token, { addMedal: "DEMOCRATIC_MEDAL_L1" })
      .then((updated) => {
        setProfile(updated);
      })
      .catch(() => {
        medalAwardedRef.current = false;
      });
  }, [token, save, profile]);

  const enrichedSave = useMemo(() => {
    if (!save) return null;
    return ensureLevelFields(save);
  }, [save]);

  const roleTitle = enrichedSave
    ? formatRoleTitle(enrichedSave.leader.roleId, enrichedSave.leader.gender)
    : "-";

  const gdpIndex = useMemo(() => {
    if (!config || !enrichedSave) return 0;
    const baseline = resolveBaselineGdp(enrichedSave.gdp, enrichedSave.baselineGdp);
    return getGdpIndex(enrichedSave.gdp, baseline);
  }, [config, enrichedSave]);

  const growthEffective = useMemo(() => {
    if (!config || !enrichedSave) return 0;
    const modifier = getIndustryModifierById(enrichedSave.industryLeaderId);
    const requirementMult = getIndustrySoftRequirementMultiplier(enrichedSave, modifier);
    const baseGrowth = (modifier?.growthBase ?? 0) * requirementMult * 100;
    return baseGrowth + enrichedSave.growthPct * config.economy.gdpGrowthScale;
  }, [config, enrichedSave]);

  const metrics = useMemo(() => {
    if (!enrichedSave) return [];
    return [
      { label: "PIB (indice)", value: formatIndexPct(gdpIndex) },
      { label: "Crecimiento efectivo", value: formatPct(growthEffective, 2, true) },
      { label: "Felicidad", value: Math.round(enrichedSave.happiness).toString() },
      { label: "Estabilidad", value: Math.round(enrichedSave.stability).toString() },
      {
        label: "Confianza",
        value: Math.round(enrichedSave.institutionalTrust).toString()
      },
      { label: "Corrupcion", value: Math.round(enrichedSave.corruption).toString() },
      { label: "Reputacion", value: Math.round(enrichedSave.reputation).toString() },
      { label: "Deuda", value: Math.round(enrichedSave.debt).toString() }
    ];
  }, [enrichedSave, gdpIndex, growthEffective]);

  const handleContinue = async () => {
    if (!token || continuing) return;
    setContinuing(true);
    try {
      const response = await continueToLevel2(token);
      if (response.state) {
        setSave(ensureLevelFields(response.state));
      }
      navigate("/level2", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate("/login", { replace: true });
      }
    } finally {
      setContinuing(false);
    }
  };

  const handleReset = async () => {
    if (!token) return;
    try {
      await resetGame(token);
    } catch {
      // Best-effort reset.
    }
    setSave(null);
    navigate("/onboarding/country", { replace: true });
  };

  if (loading || !enrichedSave || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow">
          <h1 className="font-display text-3xl">Cargando resumen...</h1>
          <p className="mt-2 text-sm text-ink/60">
            Preparando datos del mandato.
          </p>
        </div>
      </div>
    );
  }

  if (!enrichedSave.level1Complete) {
    navigate("/game", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white/80 p-8 shadow-glow border border-white/60">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/60">
            Fin de Nivel
          </p>
          <h1 className="mt-2 font-display text-4xl">Mandato cumplido</h1>
          <p className="mt-2 text-sm text-ink/60">
            Resumen final del mandato y proyeccion hacia el Nivel 2.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm text-ink/70">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Pais</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {enrichedSave.country.formalName || enrichedSave.country.baseName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Lider</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {enrichedSave.leader.name}
              </p>
              <p className="text-xs text-ink/50">Regimen: {roleTitle}</p>
            </div>
          </div>
        </header>

        {profile?.medals?.length ? (
          <section className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
            <h2 className="font-display text-2xl">Logros</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {profile.medals.map((medal) => {
                const meta = MEDAL_LABELS[medal];
                return (
                  <div
                    key={medal}
                    className="rounded-2xl border border-ink/10 bg-white/80 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                      {meta?.title ?? medal}
                    </p>
                    <p className="mt-2 text-sm text-ink/70">
                      {meta?.note ?? "Logro desbloqueado."}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
          <h2 className="font-display text-2xl">Indicadores finales</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-ink/10 bg-white/80 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
          <h2 className="font-display text-2xl">Siguientes pasos</h2>
          <p className="mt-2 text-sm text-ink/60">
            Puedes explorar el Nivel 1 en modo lectura o avanzar al nuevo mandato.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/game?readonly=1")}
              className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
            >
              Ver Nivel 1
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={continuing}
              className="rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {continuing ? "Preparando Nivel 2..." : "Continuar a Nivel 2"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-ember/40 bg-white/80 px-4 py-3 text-sm text-ember"
            >
              Reset partida
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
            >
              Perfil
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
