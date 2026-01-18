import { useCallback, useMemo, useState } from "react";
import CarbonMarketCard from "../../../components/CarbonMarketCard";
import DetailsPanel from "../../../components/DetailsPanel";
import NewsFeed from "../../../components/NewsFeed";
import MetricsRailL2 from "../components/MetricsRailL2";
import { CARBON_CREDITS_COST, CARBON_CREDITS_REDUCTION, useGameStore } from "../../../store/gameStore";
import {
  getIndustryModifierById,
  getIndustrySoftRequirementMultiplier,
  getTaxRate,
  getTaxRatePct,
  getTourismMetrics
} from "../../../store/engine";
import projectsLevel2 from "../../../data/projectsLevel2.json";
import { clamp } from "../../../utils/clamp";
import { formatIndexPct, formatPct } from "../../../utils/formatPct";
import { getGdpIndex, resolveBaselineGdp } from "../../../utils/metrics";
import { getAdminHint } from "../../../utils/admin";
import {
  ALERT_SCORE,
  getAdminAlert,
  getCorruptionAlert,
  getDebtAlert,
  getGrowthAlert,
  getHappinessAlert,
  getStabilityAlert,
  getTourismPressureAlert
} from "../../../utils/alerts";
import {
  getPlanAnticrisisCooldownUntil,
  getPlanAnticrisisUnlocked
} from "../../../utils/planAnticrisis";
import type { ConfigPayload, GameSave, Level2ProjectConfig } from "../../../types";

type AdvisorInfo = {
  id: string;
  name: string;
  tips: string[];
};

interface Level2CabinetTabProps {
  save: GameSave;
  config: ConfigPayload;
  advisors: AdvisorInfo[];
  isDemocratic: boolean;
  electionCooldown: number;
  electionReady: boolean;
  electionCost: number;
  winChance: number;
  onCallElection: () => void;
  onJumpToProjects?: () => void;
}

const LEVEL2_PROJECTS = projectsLevel2 as Level2ProjectConfig[];

function formatSignedNumber(value: number, decimals = 0) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const absValue = Math.abs(value);
  const formatted =
    decimals > 0 ? absValue.toFixed(decimals) : Math.round(absValue).toString();
  return `${sign}${formatted}`;
}

function getDecreeIncomeMult(save: GameSave, config: ConfigPayload) {
  const activeIds = save.decreeSlots
    .filter((slot) => slot.decreeId && save.tickCount < slot.activeUntil)
    .map((slot) => slot.decreeId as string);

  return activeIds.reduce((mult, decreeId) => {
    const decree = config.economy.decrees.find((item) => item.id === decreeId);
    if (!decree) return mult;
    return mult * (decree.modifiers?.incomeMult ?? 1);
  }, 1);
}

function SummaryCard({
  phase,
  industryPct,
  welfarePct,
  securityPct,
  leaderIndustryLabel,
  admin
}: {
  phase: number;
  industryPct: number;
  welfarePct: number;
  securityPct: number;
  leaderIndustryLabel: string;
  admin: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl">Resumen rapido</h3>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-xs uppercase tracking-[0.2em] text-ink/50"
          aria-expanded={!collapsed}
          aria-controls="summary-content"
        >
          {collapsed ? "Ver" : "Ocultar"}
        </button>
      </div>
      {!collapsed ? (
        <div id="summary-content">
          <p className="mt-2 text-sm text-ink/60">
            Fase {phase} - Presupuesto {formatPct(industryPct)} industria,{" "}
            {formatPct(welfarePct)} bienestar, {formatPct(securityPct)} seguridad/diplomacia.
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Industria lider: {leaderIndustryLabel}. Admin disponible:{" "}
            {Math.round(admin)}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function Level2CabinetTab({
  save,
  config,
  advisors,
  isDemocratic,
  electionCooldown,
  electionReady,
  electionCost,
  winChance,
  onCallElection,
  onJumpToProjects
}: Level2CabinetTabProps) {
  const activateEmergencyPlan = useGameStore((state) => state.activateEmergencyPlan);
  const purchaseCarbonCredits = useGameStore((state) => state.purchaseCarbonCredits);
  const [orderByAlert, setOrderByAlert] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleActivatePlan = useCallback(() => {
    activateEmergencyPlan();
  }, [activateEmergencyPlan]);

  const handlePurchaseCarbonCredits = useCallback(() => {
    purchaseCarbonCredits();
  }, [purchaseCarbonCredits]);

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }, []);

  const leaderIndustryLabel =
    config.industries.find((industry) => industry.id === save.industryLeaderId)
      ?.label ?? "Sin definir";
  const growthPrecision = save.iapFlags?.reportClarityUnlocked ? 3 : 2;
  const leaderIndustryModifier = getIndustryModifierById(save.industryLeaderId);
  const industryRequirementMult = getIndustrySoftRequirementMultiplier(
    save,
    leaderIndustryModifier
  );
  const industryRevenueMult =
    (leaderIndustryModifier?.revenueMult ?? 1) * industryRequirementMult;
  const industryGrowthBase =
    (leaderIndustryModifier?.growthBase ?? 0) * industryRequirementMult;
  const tourismMetrics = getTourismMetrics(save);
  const taxRate = getTaxRate(save);
  const taxRatePct = getTaxRatePct(save);
  const collectionEfficiency = clamp(
    config.economy.collectionEfficiencyBase +
      (save.institutionalTrust - 50) * 0.003 -
      save.corruption * 0.004,
    0.2,
    1.2
  );
  const evasionReduction = save.agenciesUnlocked.revenue
    ? config.economy.agencies.revenue.evasionReduction
    : 0;
  const evasion = clamp(
    config.economy.evasionBase +
      save.corruption * 0.002 -
      save.institutionalTrust * 0.0015 -
      evasionReduction +
      (taxRatePct / 100) * 0.08,
    0.05,
    0.85
  );
  const incomeBase =
    save.gdp * taxRate * collectionEfficiency * (1 - evasion) * config.economy.incomeScale;
  const decreeIncomeMult = getDecreeIncomeMult(save, config);
  const agencyIncomeMult = save.agenciesUnlocked.revenue
    ? config.economy.agencies.revenue.incomeMult
    : 1;
  const treatyIncomeMult = save.treatiesUnlocked
    ? config.economy.treaties.incomeMult
    : 1;
  const incomeBaseWithBoosts =
    incomeBase * decreeIncomeMult * agencyIncomeMult * treatyIncomeMult;
  const incomeIndustryBonus =
    incomeBaseWithBoosts * (industryRevenueMult - 1);
  const incomeTourismBonus = tourismMetrics.revenue;
  const incomeTotal =
    incomeBaseWithBoosts + incomeIndustryBonus + incomeTourismBonus;
  const growthBasePct = industryGrowthBase * 100;
  const growthOtherPct = save.growthPct * config.economy.gdpGrowthScale;
  const growthTotalPct = growthBasePct + growthOtherPct;
  const incomeHint = `Base ${Math.round(
    incomeBaseWithBoosts
  )} + Industria ${formatSignedNumber(
    incomeIndustryBonus
  )} + Turismo ${formatSignedNumber(incomeTourismBonus)}`;
  const tourismIncomeHint = `Throughput ${tourismMetrics.throughput.toFixed(
    1
  )} = min(${tourismMetrics.demand.toFixed(1)}, ${Math.round(
    save.tourismCapacity
  )})`;
  const growthHint = `Base ${formatPct(
    growthOtherPct,
    growthPrecision,
    true
  )} + Industria ${formatPct(growthBasePct, growthPrecision, true)}`;
  const adminHint = getAdminHint(save.adminPerTick, save.adminUnlocked);
  const planAnticrisisUnlocked = getPlanAnticrisisUnlocked(save);
  const planAnticrisisCooldownUntil = getPlanAnticrisisCooldownUntil(save);
  const planAnticrisisCooldown = Math.max(
    0,
    planAnticrisisCooldownUntil - save.tickCount
  );
  const planAnticrisisReady = planAnticrisisUnlocked && planAnticrisisCooldown <= 0;
  const planAnticrisisAutoReady =
    planAnticrisisReady && growthTotalPct <= 0;
  const carbonCreditsCost = CARBON_CREDITS_COST;
  const carbonCreditsReduction = CARBON_CREDITS_REDUCTION;
  const canPurchaseCarbonCredits = save.premiumTokens >= carbonCreditsCost;
  const baselineGdp = resolveBaselineGdp(save.gdp, save.baselineGdp);
  const gdpIndex = getGdpIndex(save.gdp, baselineGdp);
  const debtRatio = save.debt / Math.max(save.gdp, 1);
  const hasAdminNeeds = config.projects.some((project) => (project.adminCost ?? 0) > 0);
  const adminAlert = getAdminAlert(save.admin, hasAdminNeeds, save.adminUnlocked);
  const reasonByLevel = (
    level: "OK" | "WARN" | "CRITICAL",
    ok: string,
    warn: string,
    critical: string
  ) => (level === "CRITICAL" ? critical : level === "WARN" ? warn : ok);
  const cardPriority: Record<string, number> = {
    stability: 1,
    happiness: 2,
    debt: 3,
    corruption: 4,
    growth: 5,
    treasury: 6,
    income: 7,
    gdpIndex: 8,
    admin: 9,
    tourismPressure: 10,
    resources: 11,
    trust: 12,
    reputation: 13,
    tourismIndex: 14,
    tourismCapacity: 15,
    tourismIncome: 16
  };
  const cards = [
    {
      id: "treasury",
      label: "Tesoro",
      value: Math.round(save.treasury).toString(),
      hint: "Caja disponible",
      alert: "OK" as const,
      meaning: "Reserva fiscal para gasto inmediato y proyectos.",
      reason: "Dentro del rango habitual.",
      suggestion: "Mantener ingresos por encima del gasto base.",
      priority: cardPriority.treasury
    },
    {
      id: "income",
      label: "Ingresos por tick",
      value: Math.round(incomeTotal).toString(),
      hint: incomeHint,
      alert: "OK" as const,
      meaning: "Recaudacion total antes del gasto base.",
      reason: "Suma base + industria + turismo.",
      suggestion: "Ajusta impuestos o reputacion para mejorar.",
      priority: cardPriority.income
    },
    {
      id: "tourismIncome",
      label: "Ingresos turismo/tick",
      value: Math.round(tourismMetrics.revenue).toString(),
      hint: tourismIncomeHint,
      alert: "OK" as const,
      meaning: "Aporte directo del turismo al tesoro.",
      reason: "Depende de demanda y capacidad.",
      suggestion: "Sube capacidad o reputacion si quieres mas.",
      priority: cardPriority.tourismIncome
    },
    {
      id: "gdpIndex",
      label: "PIB (Indice)",
      value: formatIndexPct(gdpIndex, 1),
      hint: `Base 100 (PIB inicial ${Math.round(baselineGdp)})`,
      alert: "OK" as const,
      meaning: "Nivel de actividad economica vs base inicial.",
      reason: "Indice >100 = economia mas grande.",
      suggestion: "Mantener crecimiento sostenido.",
      priority: cardPriority.gdpIndex
    },
    {
      id: "growth",
      label: "Crecimiento",
      value: formatPct(growthTotalPct, growthPrecision),
      hint: growthHint,
      alert: getGrowthAlert(save.growthPct),
      meaning: "Variacion del PIB por tick.",
      reason: reasonByLevel(
        getGrowthAlert(save.growthPct),
        "Crecimiento positivo.",
        "Crecimiento debil o neutro.",
        "Crecimiento negativo persistente."
      ),
      suggestion:
        getGrowthAlert(save.growthPct) === "OK"
          ? "Mantener estabilidad e innovacion."
          : "Refuerza estabilidad, reduce deuda y corrupcion.",
      priority: cardPriority.growth
    },
    {
      id: "happiness",
      label: "Felicidad",
      value: Math.round(save.happiness).toString(),
      alert: getHappinessAlert(save.happiness),
      meaning: "Satisfaccion ciudadana general.",
      reason: reasonByLevel(
        getHappinessAlert(save.happiness),
        "Felicidad en rango saludable.",
        "Felicidad baja.",
        "Felicidad critica."
      ),
      suggestion:
        getHappinessAlert(save.happiness) === "OK"
          ? "Mantener bienestar y empleo."
          : "Sube bienestar, reduce desigualdad.",
      priority: cardPriority.happiness
    },
    {
      id: "stability",
      label: "Estabilidad",
      value: Math.round(save.stability).toString(),
      alert: getStabilityAlert(save.stability),
      meaning: "Orden institucional y gobernabilidad.",
      reason: reasonByLevel(
        getStabilityAlert(save.stability),
        "Estabilidad suficiente.",
        "Estabilidad fragil.",
        "Estabilidad critica."
      ),
      suggestion:
        getStabilityAlert(save.stability) === "OK"
          ? "Mantener confianza y presupuesto balanceado."
          : "Reduce corrupcion y mejora confianza.",
      priority: cardPriority.stability
    },
    {
      id: "trust",
      label: "Confianza",
      value: Math.round(save.institutionalTrust).toString(),
      alert: "OK" as const,
      meaning: "Legitimidad institucional percibida.",
      reason: "Se mantiene dentro de rango.",
      suggestion: "Completa proyectos y reduce corrupcion.",
      priority: cardPriority.trust
    },
    {
      id: "corruption",
      label: "Corrupcion",
      value: Math.round(save.corruption).toString(),
      alert: getCorruptionAlert(save.corruption),
      meaning: "Nivel de desvio y riesgo institucional.",
      reason: reasonByLevel(
        getCorruptionAlert(save.corruption),
        "Corrupcion controlada.",
        "Corrupcion elevada.",
        "Corrupcion critica."
      ),
      suggestion:
        getCorruptionAlert(save.corruption) === "OK"
          ? "Mantener controles activos."
          : "Invierte en inspeccion y transparencia.",
      priority: cardPriority.corruption
    },
    {
      id: "resources",
      label: "Recursos",
      value: Math.round(save.resources).toString(),
      alert: "OK" as const,
      meaning: "Reservas naturales y capacidad productiva.",
      reason: "Nivel estable.",
      suggestion: "Cuida el uso industrial para evitar agotamiento.",
      priority: cardPriority.resources
    },
    {
      id: "admin",
      label: "Admin",
      value: Math.round(save.admin).toString(),
      hint: adminHint,
      alert: adminAlert,
      meaning: "Capacidad estatal disponible para proyectos.",
      reason: reasonByLevel(
        adminAlert,
        "Admin suficiente para proyectos.",
        save.adminUnlocked
          ? "Admin bajo o en recuperacion."
          : "Admin bloqueado sin instituciones.",
        "Admin en cero con proyectos que lo requieren."
      ),
      suggestion: save.adminUnlocked
        ? "Sube presupuesto industria y baja corrupcion."
        : "Completa Contraloria (fase 2) para desbloquear.",
      priority: cardPriority.admin
    },
    {
      id: "tourismIndex",
      label: "Turismo (indice)",
      value: Math.round(save.tourismIndex).toString(),
      alert: "OK" as const,
      meaning: "Atractivo turistico del pais.",
      reason: "Indice base.",
      suggestion: "Invierte en marca pais y reputacion.",
      priority: cardPriority.tourismIndex
    },
    {
      id: "tourismCapacity",
      label: "Capacidad turismo",
      value: Math.round(save.tourismCapacity).toString(),
      alert: "OK" as const,
      meaning: "Infraestructura para recibir visitantes.",
      reason: "Capacidad actual disponible.",
      suggestion: "Mejora conectividad si hay alta demanda.",
      priority: cardPriority.tourismCapacity
    },
    {
      id: "tourismPressure",
      label: "Presion turismo",
      value: Math.round(save.tourismPressure).toString(),
      alert: getTourismPressureAlert(save.tourismPressure),
      meaning: "Presion por exceso de visitantes.",
      reason: reasonByLevel(
        getTourismPressureAlert(save.tourismPressure),
        "Presion controlada.",
        "Presion alta.",
        "Overtourism critico."
      ),
      suggestion:
        getTourismPressureAlert(save.tourismPressure) === "OK"
          ? "Mantener regulacion ligera."
          : "Aumenta capacidad o fija cupos.",
      priority: cardPriority.tourismPressure
    },
    {
      id: "reputation",
      label: "Reputacion",
      value: Math.round(save.reputation).toString(),
      alert: "OK" as const,
      meaning: "Imagen internacional del pais.",
      reason: "Reputacion estable.",
      suggestion: "Mejora diplomacia y ambiente.",
      priority: cardPriority.reputation
    },
    {
      id: "debt",
      label: "Deuda",
      value: Math.round(save.debt).toString(),
      hint: `Deuda/PIB ${debtRatio.toFixed(2)}`,
      alert: getDebtAlert(debtRatio),
      meaning: "Compromisos financieros acumulados.",
      reason: reasonByLevel(
        getDebtAlert(debtRatio),
        "Deuda razonable.",
        "Deuda alta vs PIB.",
        "Deuda critica vs PIB."
      ),
      suggestion:
        getDebtAlert(debtRatio) === "OK"
          ? "Mantener equilibrio fiscal."
          : "Reduce gasto o sube ingresos.",
      priority: cardPriority.debt
    }
  ];
  const sortedCards = orderByAlert
    ? [...cards].sort((a, b) => {
        if (ALERT_SCORE[b.alert] !== ALERT_SCORE[a.alert]) {
          return ALERT_SCORE[b.alert] - ALERT_SCORE[a.alert];
        }
        return a.priority - b.priority;
      })
    : cards;

  const startableProjects = useMemo(() => {
    const level2ProjectsState = save.level2?.projects ?? {};
    return LEVEL2_PROJECTS.filter(
      (project) => level2ProjectsState[project.id]?.status === "available"
    ).map((project) => ({ id: project.id, name: project.name }));
  }, [save.level2?.projects]);

  const tipLine = useMemo(() => {
    if (advisors.length === 0) return "Sin consejo disponible.";
    const advisorIndex = save.tickCount % advisors.length;
    const advisor = advisors[advisorIndex];
    const tipIndex = save.tickCount % advisor.tips.length;
    return `${advisor.name}: ${advisor.tips[tipIndex]}`;
  }, [advisors, save.tickCount]);

  const cabinetPhase = save.level2?.phase ?? save.phase;

  return (
    <div className="grid gap-6 items-start lg:grid-cols-[minmax(280px,360px)_1fr]">
      <MetricsRailL2
        cards={sortedCards}
        orderByAlert={orderByAlert}
        onToggleOrder={() => setOrderByAlert((prev) => !prev)}
        expandedCards={expandedCards}
        onToggleCard={toggleCard}
      />

      <div className="space-y-6 min-w-0">
        <NewsFeed
          items={save.news}
          startableProjects={startableProjects}
          onJumpToProjects={onJumpToProjects}
        />

        <SummaryCard
          phase={cabinetPhase}
          industryPct={save.budget.industryPct}
          welfarePct={save.budget.welfarePct}
          securityPct={save.budget.securityDiplomacyPct}
          leaderIndustryLabel={leaderIndustryLabel}
          admin={save.admin}
        />

        <DetailsPanel
          open={detailsOpen}
          onToggle={() => setDetailsOpen((prev) => !prev)}
          state={save}
        />

        <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Plan anticrisis</h3>
            <span className="text-xs text-ink/60">
              {planAnticrisisUnlocked ? "Disponible" : "Bloqueado"}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Boton de emergencia con cooldown politico.
          </p>
          {planAnticrisisUnlocked && planAnticrisisCooldown > 0 ? (
            <p className="mt-2 text-[11px] text-ink/50">
              Cooldown: {planAnticrisisCooldown} ticks
            </p>
          ) : null}
          {planAnticrisisAutoReady ? (
            <p className="mt-1 text-[11px] text-ink/50">Auto listo</p>
          ) : null}
          <button
            type="button"
            onClick={handleActivatePlan}
            disabled={!planAnticrisisReady}
            className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
              planAnticrisisReady
                ? "bg-ember text-white hover:bg-ember/90"
                : "bg-ink/10 text-ink/40"
            }`}
          >
            {planAnticrisisUnlocked ? "Activar plan" : "Bloqueado"}
          </button>
        </div>

        <CarbonMarketCard
          cost={carbonCreditsCost}
          reduction={carbonCreditsReduction}
          canPurchase={canPurchaseCarbonCredits}
          onPurchase={handlePurchaseCarbonCredits}
        />

        <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
          <h3 className="font-display text-xl">Consejo del dia</h3>
          <p className="mt-2 text-sm text-ink/70">{tipLine}</p>
        </div>

        {isDemocratic ? (
          <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
            <h3 className="font-display text-xl">Elecciones</h3>
            <p className="mt-2 text-xs text-ink/60">
              Cooldown: {electionReady ? "Listo" : `${electionCooldown} ticks`}
            </p>
            <p className="mt-2 text-xs text-ink/60">
              Costo: {electionCost} Tesoro. Probabilidad estimada:{" "}
              {formatPct(winChance * 100, 1)}.
            </p>
            <button
              type="button"
              disabled={!electionReady || save.treasury < electionCost}
              onClick={onCallElection}
              className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
                electionReady && save.treasury >= electionCost
                  ? "bg-ember text-white hover:bg-ember/90"
                  : "bg-ink/10 text-ink/40"
              }`}
            >
              Llamar a elecciones
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
