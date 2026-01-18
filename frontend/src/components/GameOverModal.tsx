import type { GameSave, IndustryConfig } from "../types";
import Modal from "./Modal";

interface GameOverModalProps {
  open: boolean;
  save: GameSave;
  industries: IndustryConfig[];
  tickMs: number;
  onRetry: () => void;
  onReturn: () => void;
}

const noop = () => {};

function formatDuration(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function GameOverModal({
  open,
  save,
  industries,
  tickMs,
  onRetry,
  onReturn
}: GameOverModalProps) {
  if (!open) return null;

  const industryLabel =
    industries.find((industry) => industry.id === save.industryLeaderId)?.label ??
    "Sin definir";
  const survivedTicks = save.gameOverAtTick ?? save.tickCount;
  const survivedMs = survivedTicks * tickMs;
  const causes =
    save.gameOverCauses && save.gameOverCauses.length > 0
      ? save.gameOverCauses.slice(0, 3)
      : ["Colapso institucional", "Tesoro en cero sostenido", "Confianza rota"];
  const advice =
    save.gameOverAdvice ??
    "Sube bienestar y estabilidad para salir del modo crisis.";

  return (
    <Modal
      open={open}
      onClose={noop}
      title="DERROCADO"
      showCloseButton={false}
      closeOnOverlay={false}
      closeOnEsc={false}
    >
      <p className="text-sm text-ink/70">
        El gabinete voto con entusiasmo... por tu salida.
      </p>
      {save.gameOverReason ? (
        <p className="mt-2 text-xs text-ink/50">{save.gameOverReason}</p>
      ) : null}
      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-xl bg-white/80 p-3">
          Tiempo sobrevivido: {formatDuration(survivedMs)}
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          Industria lider: {industryLabel}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Causas principales</h3>
        <ul className="mt-2 space-y-1 text-xs text-ink/70">
          {causes.map((cause) => (
            <li key={cause}>- {cause}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-xl bg-white/80 p-3 text-xs text-ink/70">
        Consejo: {advice}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={onReturn}
          className="w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm font-semibold"
        >
          Volver al gabinete
        </button>
      </div>
    </Modal>
  );
}
