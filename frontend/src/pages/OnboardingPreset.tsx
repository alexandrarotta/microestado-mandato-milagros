import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";

export default function OnboardingPreset() {
  const navigate = useNavigate();
  const config = useGameStore((state) => state.config);
  const presetDraft = useGameStore((state) => state.presetDraft);
  const setPresetDraft = useGameStore((state) => state.setPresetDraft);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const [error, setError] = useState<string | null>(null);

  const presets = config?.policyPresets ?? [];

  const handleStart = () => {
    if (!presetDraft) {
      setError("Selecciona una prioridad");
      return;
    }

    startNewGame();
    navigate("/game");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-4xl rounded-3xl bg-white/80 p-8 shadow-glow">
        <h1 className="font-display text-3xl">Prioridad de gobierno</h1>
        <p className="mt-2 text-sm text-ink/60">
          Elige el tono inicial. Siempre puedes ajustar luego.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setPresetDraft(preset.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                presetDraft === preset.id
                  ? "border-ocean bg-white shadow-glow"
                  : "border-ink/10 bg-white/70"
              }`}
            >
              <h3 className="font-display text-xl">{preset.name}</h3>
              <p className="mt-2 text-sm text-ink/60">{preset.description}</p>
            </button>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-ember">{error}</p> : null}
        <button
          type="button"
          onClick={handleStart}
          className="mt-6 w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
        >
          Iniciar gobierno
        </button>
      </div>
    </div>
  );
}
