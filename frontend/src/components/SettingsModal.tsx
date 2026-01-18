import { useEffect, useState } from "react";
import type { GameSave, IapConfig } from "../types";
import { TOKEN_TREASURY_COST } from "../store/gameStore";
import Modal from "./Modal";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaveNow: () => void;
  onPurchaseOffer: (offerId: string) => void;
  onRedeemRewarded: (rewardedId: string) => void;
  onUnlockAutoBalance: () => void;
  onUnlockReportClarity: () => void;
  onBoostOfflineCap: () => void;
  onPurchaseTokenWithTreasury: () => void;
  onRescueTreasury: () => void;
  onRequestReset: () => void;
  save: GameSave | null;
  isAuthed: boolean;
  iapConfig: IapConfig | null;
  readOnly?: boolean;
}

export default function SettingsModal({
  open,
  onClose,
  onSaveNow,
  onPurchaseOffer,
  onRedeemRewarded,
  onUnlockAutoBalance,
  onUnlockReportClarity,
  onBoostOfflineCap,
  onPurchaseTokenWithTreasury,
  onRescueTreasury,
  onRequestReset,
  save,
  isAuthed,
  iapConfig,
  readOnly = false
}: SettingsModalProps) {
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedActionId(null);
    }
  }, [open]);

  const devToolsEnabled = import.meta.env.VITE_DEV_TOOLS === "true";
  const canPurchaseTokenWithTreasury = Boolean(
    save && save.treasury >= TOKEN_TREASURY_COST
  );
  const tapFeedbackClass =
    "transition active:scale-[0.99] active:bg-white";
  const selectedClass = "border-ocean/50 bg-ocean/10";
  const getSelectableClass = (id: string, disabled = false) =>
    `rounded-lg border border-ink/10 bg-white/80 px-3 py-2 text-left ${
      disabled || readOnly ? "opacity-60 cursor-not-allowed" : tapFeedbackClass
    } ${selectedActionId === id ? selectedClass : ""}`;

  return (
    <Modal open={open} onClose={onClose} title="Ajustes rapidos">
      <div className="space-y-3 text-sm text-ink/70">
        <p>Ultimo guardado local: {save?.updatedAt ?? "-"}</p>
        <p>Sync backend: {isAuthed ? "Disponible" : "No disponible"}</p>
        <p>Decretos especiales: {save?.premiumTokens ?? 0}</p>
      </div>
      <button
        type="button"
        onClick={onSaveNow}
        disabled={readOnly}
        className="mt-5 w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Guardar ahora
      </button>

      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Monetizacion simulada</h3>
          <div className="mt-2 grid gap-2 text-xs">
            {iapConfig?.offers.map((offer) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => {
                  if (readOnly) return;
                  setSelectedActionId(`offer:${offer.id}`);
                  onPurchaseOffer(offer.id);
                }}
                disabled={readOnly}
                className={getSelectableClass(`offer:${offer.id}`, readOnly)}
              >
                {offer.name} ({offer.price}) +{offer.tokens} tokens
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Rewarded (simulado)</h3>
          <div className="mt-2 grid gap-2 text-xs">
            {iapConfig?.rewardedAds.map((rewarded) => (
              <button
                key={rewarded.id}
                type="button"
                onClick={() => {
                  if (readOnly) return;
                  setSelectedActionId(`rewarded:${rewarded.id}`);
                  onRedeemRewarded(rewarded.id);
                }}
                disabled={readOnly}
                className={getSelectableClass(`rewarded:${rewarded.id}`, readOnly)}
              >
                Ver anuncio: {rewarded.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Mejoras QoL</h3>
          <div className="mt-2 grid gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                setSelectedActionId("action:offlineCap");
                onBoostOfflineCap();
              }}
              disabled={readOnly}
              className={getSelectableClass("action:offlineCap", readOnly)}
            >
              Offline +{iapConfig?.actions.offlineCapBoostHours ?? 0}h (costo{" "}
              {iapConfig?.actions.offlineCapBoostCost ?? 0})
            </button>
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                setSelectedActionId("action:autoBalance");
                onUnlockAutoBalance();
              }}
              disabled={readOnly || save?.iapFlags.autoBalanceUnlocked}
              className={getSelectableClass(
                "action:autoBalance",
                Boolean(save?.iapFlags.autoBalanceUnlocked) || readOnly
              )}
            >
              Auto balance sliders{" "}
              {save?.iapFlags.autoBalanceUnlocked
                ? "(listo)"
                : `(costo ${iapConfig?.actions.autoBalanceUnlockCost ?? 0})`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                setSelectedActionId("action:reportClarity");
                onUnlockReportClarity();
              }}
              disabled={readOnly || save?.iapFlags.reportClarityUnlocked}
              className={getSelectableClass(
                "action:reportClarity",
                Boolean(save?.iapFlags.reportClarityUnlocked) || readOnly
              )}
            >
              Reportes mas claros{" "}
              {save?.iapFlags.reportClarityUnlocked
                ? "(listo)"
                : `(costo ${iapConfig?.actions.reportClarityUnlockCost ?? 0})`}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Economia</h3>
          <div className="mt-2 grid gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                setSelectedActionId("action:buyTokenTreasury");
                onPurchaseTokenWithTreasury();
              }}
              disabled={readOnly || !canPurchaseTokenWithTreasury}
              className={getSelectableClass(
                "action:buyTokenTreasury",
                !canPurchaseTokenWithTreasury || readOnly
              )}
            >
              Comprar 1 Token (costo {TOKEN_TREASURY_COST} Tesoro)
            </button>
            {!canPurchaseTokenWithTreasury ? (
              <span className="text-[11px] text-ink/60">Tesoro insuficiente.</span>
            ) : null}
          </div>
        </div>

        {devToolsEnabled ? (
          <div>
            <h3 className="text-sm font-semibold">Debug / Rescue</h3>
            <div className="mt-2 grid gap-2 text-xs">
              <button
                type="button"
                onClick={onRescueTreasury}
                disabled={readOnly}
                className="rounded-lg border border-ink/10 bg-white/80 px-3 py-2 text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Rescue: +200 Tesoro
              </button>
              <button
                type="button"
                onClick={onRequestReset}
                disabled={readOnly}
                className="rounded-lg border border-ink/10 bg-white/80 px-3 py-2 text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reset partida
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
