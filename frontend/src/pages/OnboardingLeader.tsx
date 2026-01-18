import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import type { Gender } from "../types";

const genderOptions: { label: string; value: Gender }[] = [
  { label: "Masculino", value: "MALE" },
  { label: "Femenino", value: "FEMALE" },
  { label: "Prefiero no decir", value: "PREFER_NOT_SAY" },
  { label: "Otro (especificar)", value: "OTHER" }
];

export default function OnboardingLeader() {
  const navigate = useNavigate();
  const config = useGameStore((state) => state.config);
  const leaderDraft = useGameStore((state) => state.leaderDraft);
  const setLeaderDraft = useGameStore((state) => state.setLeaderDraft);
  const [error, setError] = useState<string | null>(null);

  const roles = config?.roles ?? [];
  const remoteDefaults = config?.remoteConfigKeys.defaults;

  const handleGenerateMandate = () => {
    if (!roles.length) return;
    const weights = remoteDefaults?.mandate_role_weights ?? {};
    const total = roles.reduce((sum, role) => sum + (weights[role.id] ?? 1), 0);
    let roll = Math.random() * (total || roles.length);
    const picked =
      roles.find((role) => {
        roll -= total ? weights[role.id] ?? 1 : 1;
        return roll <= 0;
      }) ?? roles[0];
    const traits = remoteDefaults?.mandate_traits ?? [];
    const taglines = remoteDefaults?.mandate_taglines ?? [];
    const trait =
      traits[Math.floor(Math.random() * Math.max(traits.length, 1))] ?? "";
    const tagline =
      taglines[Math.floor(Math.random() * Math.max(taglines.length, 1))] ?? "";
    setLeaderDraft({
      roleId: picked.id,
      roleSelectionMode: "RANDOM",
      trait,
      tagline
    });
  };

  const handleNext = (event: FormEvent) => {
    event.preventDefault();
    if (!leaderDraft.name || leaderDraft.name.trim().length === 0) {
      setError("El nombre del lider es obligatorio");
      return;
    }
    if (!leaderDraft.gender) {
      setError("El genero es obligatorio");
      return;
    }
    if (leaderDraft.gender === "OTHER" && !leaderDraft.genderOther) {
      setError("Especifica el genero");
      return;
    }
    if (!leaderDraft.roleId) {
      setError("Selecciona un rol o usa el aleatorio");
      return;
    }
    setError(null);
    navigate("/onboarding/preset");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white/80 p-8 shadow-glow">
        <h1 className="font-display text-3xl">Crear lider</h1>
        <p className="mt-2 text-sm text-ink/60">
          Define el rostro del microestado y el tono del decreto.
        </p>
        <form className="mt-6 space-y-5" onSubmit={handleNext}>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Nombre (obligatorio)
            </label>
            <input
              type="text"
              required
              value={leaderDraft.name}
              onChange={(event) => setLeaderDraft({ name: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Genero (obligatorio)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {genderOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={leaderDraft.gender === option.value}
                    onChange={() => setLeaderDraft({ gender: option.value })}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {leaderDraft.gender === "OTHER" ? (
              <input
                type="text"
                placeholder="Especifica"
                required
                value={leaderDraft.genderOther ?? ""}
                onChange={(event) =>
                  setLeaderDraft({ genderOther: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
              />
            ) : null}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Rol
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
              value={leaderDraft.roleId}
              onChange={(event) =>
                setLeaderDraft({
                  roleId: event.target.value,
                  roleSelectionMode:
                    event.target.value === "RANDOM" ? "RANDOM" : "MANUAL",
                  trait: event.target.value === "RANDOM" ? "" : leaderDraft.trait,
                  tagline:
                    event.target.value === "RANDOM" ? "" : leaderDraft.tagline
                })
              }
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.labels.neutral}
                </option>
              ))}
              <option value="RANDOM">Aleatorio</option>
            </select>
            <button
              type="button"
              onClick={handleGenerateMandate}
              className="mt-3 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-sm"
            >
              Generar mi Mandato (azar)
            </button>
            {leaderDraft.trait || leaderDraft.tagline ? (
              <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-ink/70">
                <p>
                  Rol:{" "}
                  {roles.find((role) => role.id === leaderDraft.roleId)?.labels
                    .neutral ?? "Sin definir"}
                </p>
                <p>Rasgo: {leaderDraft.trait || "Sin rasgo"}</p>
                <p>Tagline: "{leaderDraft.tagline || "Sin tagline"}"</p>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}
