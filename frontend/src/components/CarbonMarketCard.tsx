import PanelCard from "./PanelCard";

interface CarbonMarketCardProps {
  cost: number;
  reduction: number;
  canPurchase: boolean;
  onPurchase: () => void;
  disabled?: boolean;
}

export default function CarbonMarketCard({
  cost,
  reduction,
  canPurchase,
  onPurchase,
  disabled = false
}: CarbonMarketCardProps) {
  const statusLabel = canPurchase ? "Disponible" : "Bloqueado";
  const statusClass = canPurchase ? "text-ink/60" : "text-ink/40";
  const isDisabled = disabled || !canPurchase;
  const buttonClass = `mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
    canPurchase && !disabled
      ? "bg-ember text-white hover:bg-ember/90"
      : "bg-ink/10 text-ink/40"
  }`;

  return (
    <PanelCard>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Mercado de carbono</h3>
        <span className={`text-xs ${statusClass}`}>{statusLabel}</span>
      </div>
      <p className="mt-2 text-xs text-ink/60">
        Compra creditos de carbono para reducir huella ambiental (-{reduction}{" "}
        huella).
      </p>
      <button
        type="button"
        onClick={onPurchase}
        disabled={isDisabled}
        className={`${buttonClass} disabled:cursor-not-allowed`}
      >
        {cost} Tokens
      </button>
    </PanelCard>
  );
}
