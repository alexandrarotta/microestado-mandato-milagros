import Modal from "../../../components/Modal";
import type { Level2EventPending } from "../../../types";

interface Level2EventModalProps {
  open: boolean;
  pending: Level2EventPending | null;
  isResolving: boolean;
  error: string | null;
  resultSummary: string | null;
  onSelect: (optionId: string) => void;
  onClose: () => void;
  onCloseResult: () => void;
}

export default function Level2EventModal({
  open,
  pending,
  isResolving,
  error,
  resultSummary,
  onSelect,
  onClose,
  onCloseResult
}: Level2EventModalProps) {
  const title = resultSummary
    ? "Resultado del evento"
    : pending?.title ?? "Evento";

  return (
    <Modal open={open} onClose={onClose} title={title} maxHeightVh={85}>
      {resultSummary ? (
        <div className="space-y-4">
          <h3 className="font-display text-xl">Resultado</h3>
          <p className="text-sm text-ink/70">{resultSummary}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCloseResult}
              className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : pending ? (
        <div>
          <p className="text-sm text-ink/70">{pending.body}</p>
          {error ? (
            <p className="mt-3 text-sm text-ember">{error}</p>
          ) : null}
          {isResolving ? (
            <p className="mt-3 text-xs text-ink/60">Procesando...</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {pending.options.map((option) => (
              <button
                key={option.optionId}
                type="button"
                onClick={() => onSelect(option.optionId)}
                disabled={isResolving}
                className={`w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-white ${
                  isResolving ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
