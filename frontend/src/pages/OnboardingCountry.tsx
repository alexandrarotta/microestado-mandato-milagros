import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { formatFormalName } from "../utils/stateTypes";
import type { Geography } from "../types";

const geographyOptions = [
  { id: "archipelago", label: "Archipielago" },
  { id: "coastal", label: "Costero" },
  { id: "mountain", label: "Montanoso/Andino" },
  { id: "desert", label: "Desertico" },
  { id: "forest", label: "Boscoso" },
  { id: "urban", label: "Urbano denso" }
] as const;

export default function OnboardingCountry() {
  const navigate = useNavigate();
  const config = useGameStore((state) => state.config);
  const countryDraft = useGameStore((state) => state.countryDraft);
  const setCountryDraft = useGameStore((state) => state.setCountryDraft);
  const [error, setError] = useState<string | null>(null);

  const stateTypes = useMemo(() => config?.stateTypes ?? [], [config]);

  const formalNamePreview = useMemo(() => {
    return formatFormalName(
      countryDraft.baseName,
      countryDraft.stateTypeId,
      stateTypes,
      countryDraft.stateTypeOtherText
    );
  }, [countryDraft.baseName, countryDraft.stateTypeId, countryDraft.stateTypeOtherText, stateTypes]);

  const handleNext = (event: FormEvent) => {
    event.preventDefault();
    if (!countryDraft.baseName || countryDraft.baseName.trim().length === 0) {
      setError("El nombre del pais es obligatorio");
      return;
    }
    if (countryDraft.stateTypeId === "OTHER") {
      if (!countryDraft.stateTypeOtherText || countryDraft.stateTypeOtherText.trim().length === 0) {
        setError("Especifica el tipo de Estado");
        return;
      }
    }
    if (!countryDraft.geography) {
      setError("Selecciona la geografia");
      return;
    }
    setCountryDraft({
      formalName: formalNamePreview || countryDraft.baseName.trim()
    });
    setError(null);
    navigate("/onboarding/leader");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white/80 p-8 shadow-glow">
        <h1 className="font-display text-3xl">Crear pais</h1>
        <p className="mt-2 text-sm text-ink/60">
          Un nombre, una forma de Estado y un archivo nuevo.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleNext}>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Nombre (obligatorio)
            </label>
            <input
              type="text"
              required
              value={countryDraft.baseName}
              onChange={(event) => setCountryDraft({ baseName: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Tipo de Estado (opcional)
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
              value={countryDraft.stateTypeId}
              onChange={(event) => setCountryDraft({ stateTypeId: event.target.value })}
            >
              {stateTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            {countryDraft.stateTypeId === "OTHER" ? (
              <input
                type="text"
                required
                placeholder="Especifica tipo de Estado"
                value={countryDraft.stateTypeOtherText ?? ""}
                onChange={(event) =>
                  setCountryDraft({ stateTypeOtherText: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
              />
            ) : null}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Geografia (obligatorio)
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
              value={countryDraft.geography}
              onChange={(event) =>
                setCountryDraft({ geography: event.target.value as Geography })
              }
            >
              {geographyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Lema (opcional)
            </label>
            <input
              type="text"
              value={countryDraft.motto ?? ""}
              onChange={(event) => setCountryDraft({ motto: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Gentilicio (opcional)
            </label>
            <input
              type="text"
              value={countryDraft.demonym ?? ""}
              onChange={(event) => setCountryDraft({ demonym: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          <div className="rounded-xl bg-white/70 p-3 text-sm text-ink/70">
            Nombre formal: {formalNamePreview || "(Completa el nombre)"}
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
