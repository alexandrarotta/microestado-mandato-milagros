import AlertCard from "./AlertCard";
import PanelCard from "./PanelCard";
import type { AlertLevel } from "../utils/alerts";

interface MetricsCard {
  id: string;
  label: string;
  value: string;
  hint?: string;
  alert: AlertLevel;
  meaning: string;
  reason: string;
  suggestion: string;
}

interface MetricsRailProps {
  cards: MetricsCard[];
  orderByAlert: boolean;
  onToggleOrder: () => void;
  expandedCards: Record<string, boolean>;
  onToggleCard: (cardId: string) => void;
}

export default function MetricsRail({
  cards,
  orderByAlert,
  onToggleOrder,
  expandedCards,
  onToggleCard
}: MetricsRailProps) {
  // No internal scrolling; let the page handle overflow.
  return (
    <PanelCard className="w-full min-w-0 self-start">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Indicadores</h2>
          <p className="text-xs text-ink/60">
            Alertas y contexto rapido de las metricas clave.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleOrder}
          className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition ${
            orderByAlert
              ? "border-ink bg-ink text-white"
              : "border-ink/10 bg-white/70 text-ink/60"
          }`}
          aria-pressed={orderByAlert}
        >
          Ordenar por alerta: {orderByAlert ? "ON" : "OFF"}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 min-w-0">
        {cards.map((card) => (
          <AlertCard
            key={card.id}
            label={card.label}
            value={card.value}
            hint={card.hint}
            alert={card.alert}
            meaning={card.meaning}
            reason={card.reason}
            suggestion={card.suggestion}
            expanded={expandedCards[card.id] ?? false}
            onToggle={() => onToggleCard(card.id)}
          />
        ))}
      </div>
    </PanelCard>
  );
}
