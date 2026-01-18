import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile, updateProfile } from "../api/profile";
import { ApiError } from "../api/client";
import { useGameStore } from "../store/gameStore";
import type { ProfilePayload } from "../types";

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

export default function Profile() {
  const navigate = useNavigate();
  const token = useGameStore((state) => state.token);
  const config = useGameStore((state) => state.config);
  const save = useGameStore((state) => state.save);
  const logout = useGameStore((state) => state.logout);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [motto, setMotto] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProfile(token);
        if (!active) return;
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        setMotto(data.motto ?? "");
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          await logout();
          navigate("/login", { replace: true });
          return;
        }
        setError("No se pudo cargar el perfil");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [token, navigate, logout]);

  const regimeLabel = useMemo(() => {
    if (!profile?.regime || !config) return profile?.regime ?? "-";
    const role = config.roles.find((item) => item.id === profile.regime);
    return role?.labels?.neutral ?? profile.regime;
  }, [profile?.regime, config]);

  const countryLabel = useMemo(() => {
    if (!profile?.country) return "Sin pais";
    return profile.country.formalName || profile.country.baseName;
  }, [profile?.country]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !profile) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await updateProfile(token, {
        displayName: displayName.trim() || undefined,
        motto: profile.country ? motto.trim() : undefined
      });
      setProfile(updated);
      setDisplayName(updated.displayName ?? "");
      setMotto(updated.motto ?? "");
      setSuccess("Perfil actualizado");
    } catch {
      setError("No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile?.displayName ?? "");
    setMotto(profile?.motto ?? "");
    setError(null);
    setSuccess(null);
  };

  const handleBack = () => {
    if (save?.level === 2) {
      navigate("/level2", { replace: true });
      return;
    }
    if (save?.level1Complete) {
      navigate("/level-complete", { replace: true });
      return;
    }
    navigate("/game", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow">
          <h1 className="font-display text-3xl">Cargando perfil...</h1>
          <p className="mt-2 text-sm text-ink/60">Verificando identidad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl bg-white/80 p-8 shadow-glow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Perfil</h1>
            <p className="mt-2 text-sm text-ink/60">
              Tu identidad institucional y logros acumulados.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-sm"
          >
            Volver
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Email</p>
            <p className="mt-2 text-sm text-ink">{profile?.email ?? "-"}</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Pais</p>
            <p className="mt-2 text-sm text-ink">{countryLabel}</p>
            <p className="mt-1 text-xs text-ink/50">Regimen: {regimeLabel}</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Nombre del lider
            </label>
            <input
              type="text"
              minLength={2}
              maxLength={40}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          {profile?.country ? (
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
                Lema del pais
              </label>
              <input
                type="text"
                maxLength={80}
                value={motto}
                onChange={(event) => setMotto(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          {success ? <p className="text-sm text-sage">{success}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="mt-8">
          <h2 className="font-display text-2xl">Medallas</h2>
          {profile?.medals?.length ? (
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
          ) : (
            <p className="mt-2 text-sm text-ink/60">Sin medallas aun.</p>
          )}
        </div>
      </div>
    </div>
  );
}
