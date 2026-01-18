import type { IndustryConfig } from "../types";
import { getIndustryModifierById, getMaxIndustriesByPhase } from "../store/engine";
import { formatPct } from "../utils/formatPct";
import PanelCard from "./PanelCard";

interface IndustryPickerProps {
  industries: IndustryConfig[];
  leaderId: string | null;
  diversifiedIds: string[];
  phase: number;
  unlockedPhase: number;
  onSelectLeader: (industryId: string) => void;
  onAddDiversified: (industryId: string) => void;
  disabled?: boolean;
}

export default function IndustryPicker({
  industries,
  leaderId,
  diversifiedIds,
  phase,
  unlockedPhase,
  onSelectLeader,
  onAddDiversified,
  disabled = false
}: IndustryPickerProps) {
  const maxIndustries = getMaxIndustriesByPhase(unlockedPhase);
  const maxDiversified = Math.max(0, maxIndustries - 1);
  const diversifiedCount = diversifiedIds.filter((id) => id && id !== leaderId)
    .length;
  const remainingDiversified = Math.max(0, maxDiversified - diversifiedCount);
  const diversificationStatus =
    unlockedPhase < 2
      ? "Bloqueado"
      : `Disponibles ${remainingDiversified}/${maxDiversified}`;
  const isMaxed = unlockedPhase >= 2 && diversifiedCount >= maxDiversified;
  const industryWord = maxIndustries === 1 ? "industria" : "industrias";
  const diversifiedWord =
    maxDiversified === 1 ? "diversificada" : "diversificadas";
  const diversificationHint =
    unlockedPhase < 2
      ? "Desbloquea instituciones para diversificar industrias."
      : `Puedes sumar hasta ${maxIndustries} ${industryWord} (1 lider + ${maxDiversified} ${diversifiedWord}).`;

  return (
    <PanelCard>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Industria lider</h3>
        <span className="text-xs text-ink/60">Fase {phase}</span>
      </div>
      <p className="mt-2 text-xs text-ink/60">
        Elige una industria principal para definir el perfil economico.
      </p>
      <div className="mt-4 grid gap-3">
        {industries.map((industry) => {
          const isLeader = leaderId === industry.id;
          const modifier = getIndustryModifierById(industry.id);
          const impactLabel = modifier
            ? `Impacto: ${formatPct(
                (modifier.revenueMult - 1) * 100,
                0,
                true
              )} ingresos, ${formatPct(
                modifier.growthBase * 100,
                2,
                true
              )} crecimiento base`
            : null;
          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => onSelectLeader(industry.id)}
              disabled={disabled}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                disabled
                  ? "border-ink/10 bg-ink/5 text-ink/40"
                  : isLeader
                  ? "border-ocean bg-ocean/10"
                  : "border-ink/10 bg-white/80 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{industry.label}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
                  {isLeader ? "Lider" : "Elegir"}
                </span>
              </div>
              {impactLabel ? (
                <p className="mt-1 text-[11px] text-ink/50">{impactLabel}</p>
              ) : null}
              <p className="mt-1 text-xs text-ink/60">{industry.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Diversificacion</h4>
          <span className="text-xs text-ink/60">
            {diversificationStatus}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink/50">{diversificationHint}</p>
        {unlockedPhase < 2 ? null : (
          <div className="mt-3 grid gap-2">
            {industries.map((industry) => {
              const isLeader = leaderId === industry.id;
              const isAdded = diversifiedIds.includes(industry.id);
              const entryDisabled = disabled || isLeader || isAdded || isMaxed;
              return (
                <button
                  key={`div-${industry.id}`}
                  type="button"
                  onClick={() => onAddDiversified(industry.id)}
                  disabled={entryDisabled}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    entryDisabled
                      ? "border-ink/10 bg-ink/5 text-ink/40"
                      : "border-ink/10 bg-white/80 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{industry.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em]">
                      {isLeader
                        ? "Lider"
                        : isAdded
                        ? "Sumada"
                        : isMaxed
                        ? "Limite"
                        : "Agregar"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PanelCard>
  );
}
