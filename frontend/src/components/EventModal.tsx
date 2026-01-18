import type { EventConfig } from "../types";
import Modal from "./Modal";

interface EventModalProps {
  event: EventConfig;
  onSelect: (optionId: string) => void;
  onMitigate?: () => void;
  canMitigate?: boolean;
  mitigationCost?: number;
  onClose: () => void;
}

export default function EventModal({
  event,
  onSelect,
  onMitigate,
  canMitigate,
  mitigationCost,
  onClose
}: EventModalProps) {
  return (
    <Modal open onClose={onClose} title={event.title}>
      <p className="text-sm text-ink/70">{event.description}</p>
      <div className="mt-4 space-y-3">
        {event.options.map((option) => {
          const optionId = option.key ?? option.id ?? option.text;
          return (
          <button
            key={optionId}
            type="button"
            onClick={() => onSelect(optionId)}
            className="w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-white"
          >
            {option.text}
          </button>
        );
        })}
      </div>
      {onMitigate ? (
        <button
          type="button"
          onClick={onMitigate}
          disabled={!canMitigate}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
            canMitigate
              ? "bg-ocean text-white hover:bg-ocean/90"
              : "bg-ink/10 text-ink/40"
          }`}
        >
          Mitigar con decreto especial{mitigationCost ? ` (${mitigationCost})` : ""}
        </button>
      ) : null}
    </Modal>
  );
}
