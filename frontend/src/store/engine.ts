import { clamp } from "../utils/clamp";
import { formatTemplate } from "../utils/format";
import {
  getCorruptionAlert,
  getHappinessAlert,
  getStabilityAlert,
  getTourismPressureAlert
} from "../utils/alerts";
import { makeId } from "../utils/random";
import { mergeRemoteConfig } from "../utils/remoteConfig";
import { formatRoleTitle } from "../utils/roleLabels";
import {
  getPlanAnticrisisCooldownUntil,
  getPlanAnticrisisUnlocked,
  PLAN_ANTICRISIS_BASE_EFFECTS,
  PLAN_ANTICRISIS_COOLDOWN_TICKS,
  setPlanAnticrisisCooldownUntil,
  setPlanAnticrisisUnlocked
} from "../utils/planAnticrisis";
import type {
  ConfigPayload,
  EventConfig,
  EventOptionConfig,
  GameSave,
  ProjectConfig,
  RoleConfig
} from "../types";

interface TickOptions {
  suppressEvents?: boolean;
}

interface DecreeModifiers {
  incomeMult: number;
  growthBonus: number;
  happinessDrift: number;
  stabilityDrift: number;
  institutionalTrustDrift: number;
  corruptionDrift: number;
  reputationDrift: number;
}

interface IndustryModifier {
  revenueMult: number;
  growthBase: number;
  happinessDelta?: number;
  resourceDelta?: number;
  reputationDelta?: number;
  stabilityDelta?: number;
  requiresEnergy?: boolean;
  requiresStability?: boolean;
  requiresInnovation?: boolean;
}

export interface TourismMetrics {
  demand: number;
  throughput: number;
  revenue: number;
  gdpBoost: number;
  pressureDelta: number;
  nextPressure: number;
  reputationFactor: number;
  stabilityFactor: number;
  geographyFactor: number;
  industryFactor: number;
}

const industryModifiers: Record<string, IndustryModifier> = {
  agriculture: { revenueMult: 1.05, growthBase: 0.002, happinessDelta: 0.01 },
  extraction: {
    revenueMult: 1.2,
    growthBase: 0.001,
    resourceDelta: -0.05,
    reputationDelta: -0.01
  },
  light_mfg: { revenueMult: 1.1, growthBase: 0.0025, requiresEnergy: true },
  services: { revenueMult: 1.08, growthBase: 0.002, requiresStability: true },
  tech: { revenueMult: 1.03, growthBase: 0.0035, requiresInnovation: true },
  security: {
    revenueMult: 1.02,
    growthBase: 0.001,
    stabilityDelta: 0.02,
    reputationDelta: -0.005
  }
};

const industryModifierKeyById: Record<string, keyof typeof industryModifiers> = {
  AGRICULTURE: "agriculture",
  EXTRACTION: "extraction",
  LIGHT_MANUFACTURING: "light_mfg",
  SERVICES: "services",
  TECHNOLOGY: "tech",
  SECURITY_DEFENSE_ABSTRACT: "security"
};

const SOFT_REQUIREMENT_THRESHOLD = 45;
const SOFT_REQUIREMENT_MULT = 0.85;
const TOURISM_REVENUE_PER_UNIT = 0.4;
const TOURISM_GDP_PER_UNIT = 0.8;
const TOURISM_PRESSURE_FACTOR = 0.05;
const TOURISM_PRESSURE_DECAY = 0.02;
const TOURISM_PRESSURE_THRESHOLD = 60;
const MIN_TAX_RATE = 0.08;
const MAX_TAX_RATE = 0.3;
const TAX_LEVEL_TO_PCT: Record<string, number> = {
  LOW: 20,
  MED: 50,
  HIGH: 85
};
export const ADMIN_UNLOCK_PROJECT_ID = "P2_AUDIT_OFFICE";
const ADMIN_PERK_PROJECTS = {
  audit: ADMIN_UNLOCK_PROJECT_ID,
  procurement: "P2_PROCUREMENT",
  automated: "P3_AUTOMATED_COLLECTION"
};
const PLAN_ANTICRISIS_BONUS_AMOUNT = 10;
const PLAN_ANTICRISIS_CRITICAL_METRICS = [
  {
    key: "stability",
    label: "Estabilidad",
    getAlert: getStabilityAlert,
    getValue: (save: GameSave) => save.stability,
    setValue: (save: GameSave, value: number) => {
      save.stability = clamp(value, 0, 100);
    }
  },
  {
    key: "happiness",
    label: "Felicidad",
    getAlert: getHappinessAlert,
    getValue: (save: GameSave) => save.happiness,
    setValue: (save: GameSave, value: number) => {
      save.happiness = clamp(value, 0, 100);
    }
  },
  {
    key: "corruption",
    label: "Corrupcion",
    getAlert: getCorruptionAlert,
    getValue: (save: GameSave) => save.corruption,
    setValue: (save: GameSave, value: number) => {
      save.corruption = clamp(value, 0, 100);
    }
  },
  {
    key: "tourismPressure",
    label: "Presion turismo",
    getAlert: getTourismPressureAlert,
    getValue: (save: GameSave) => save.tourismPressure ?? 0,
    setValue: (save: GameSave, value: number) => {
      save.tourismPressure = clamp(value, 0, 100);
    }
  }
];

export function getMaxIndustriesByPhase(phase: number) {
  if (phase >= 4) return 4;
  if (phase >= 3) return 3;
  if (phase >= 2) return 2;
  return 1;
}

export function getIndustryModifierById(industryId: string | null) {
  if (!industryId) return null;
  const key = industryModifierKeyById[industryId];
  return key ? industryModifiers[key] : null;
}

export function getIndustrySoftRequirementMultiplier(
  save: GameSave,
  modifier: IndustryModifier | null
) {
  if (!modifier) return 1;
  let mult = 1;
  if (modifier.requiresEnergy && save.energy < SOFT_REQUIREMENT_THRESHOLD) {
    mult *= SOFT_REQUIREMENT_MULT;
  }
  if (modifier.requiresStability && save.stability < SOFT_REQUIREMENT_THRESHOLD) {
    mult *= SOFT_REQUIREMENT_MULT;
  }
  if (modifier.requiresInnovation && save.innovation < SOFT_REQUIREMENT_THRESHOLD) {
    mult *= SOFT_REQUIREMENT_MULT;
  }
  return mult;
}

export function getTaxRatePct(save: GameSave) {
  if (typeof save.taxRatePct === "number") {
    return clamp(save.taxRatePct, 0, 100);
  }
  if (save.taxLevel) {
    return TAX_LEVEL_TO_PCT[save.taxLevel] ?? TAX_LEVEL_TO_PCT.MED;
  }
  return TAX_LEVEL_TO_PCT.MED;
}

export function getTaxRate(save: GameSave) {
  const pct = getTaxRatePct(save) / 100;
  return MIN_TAX_RATE + (MAX_TAX_RATE - MIN_TAX_RATE) * pct;
}

function hasCompletedProject(save: GameSave, projectId: string) {
  return save.projects?.[projectId]?.status === "completed";
}

export function isAdminUnlockedByProjects(save: GameSave) {
  return hasCompletedProject(save, ADMIN_UNLOCK_PROJECT_ID);
}

export function syncAdminUnlock(save: GameSave) {
  // Admin unlock is sourced from Contraloria completion for retro-compat.
  save.adminUnlocked = isAdminUnlockedByProjects(save);
  return save.adminUnlocked;
}

function getAdminDeltaMultiplier(save: GameSave) {
  let mult = 1;
  if (hasCompletedProject(save, ADMIN_PERK_PROJECTS.audit)) {
    mult *= 1.1;
  }
  if (hasCompletedProject(save, ADMIN_PERK_PROJECTS.procurement)) {
    mult *= 1.1;
  }
  if (hasCompletedProject(save, ADMIN_PERK_PROJECTS.automated)) {
    mult *= 1.25;
  }
  return mult;
}

function getAdminCorruptionDrift(save: GameSave) {
  return hasCompletedProject(save, ADMIN_PERK_PROJECTS.audit) ? -0.02 : 0;
}

function getAdminDelta(save: GameSave) {
  if (!isAdminUnlockedByProjects(save) || save.phase < 2) return 0;
  const baseAdmin = 0.05;
  const budgetFactor = 0.5 + (save.budget.industryPct / 100) * 0.8;
  const trustFactor = 0.7 + (save.institutionalTrust / 100) * 0.9;
  const corruptionFactor = clamp(1 - save.corruption / 120, 0.2, 1);
  return (
    baseAdmin *
    budgetFactor *
    trustFactor *
    corruptionFactor *
    getAdminDeltaMultiplier(save)
  );
}

function refreshAdminPerTick(save: GameSave) {
  const adminDelta = getAdminDelta(save);
  save.adminPerTick = adminDelta;
  return adminDelta;
}

function buildPlanAnticrisisNewsText(
  source: "auto" | "manual",
  bonusLabels: string[]
) {
  const base = PLAN_ANTICRISIS_BASE_EFFECTS;
  const bonusList = bonusLabels.length > 0 ? bonusLabels.join(", ") : "ninguno";
  const prefix =
    source === "auto"
      ? "Plan anticrisis activado (auto)"
      : "Plan anticrisis activado";
  return `${prefix}: +${base.stability} Estabilidad, +${base.happiness} Felicidad, +${base.treasury} Tesoro, ${base.corruption} Corrupcion. Bonus CRITICAL: +${PLAN_ANTICRISIS_BONUS_AMOUNT} a ${bonusList}.`;
}

function getPlanAnticrisisCriticalMetrics(save: GameSave) {
  return PLAN_ANTICRISIS_CRITICAL_METRICS.filter((metric) => {
    const value = metric.getValue(save);
    return metric.getAlert(value) === "CRITICAL";
  });
}

export function maybeUnlockPlanAnticrisis(save: GameSave) {
  if (getPlanAnticrisisUnlocked(save) || save.treasury > 0) return false;
  setPlanAnticrisisUnlocked(save, true);
  addNews(save, "Se desbloquea el plan anticrisis por tesoro en cero.");
  return true;
}

export function activatePlanAnticrisis(save: GameSave, source: "auto" | "manual") {
  if (!getPlanAnticrisisUnlocked(save)) return { ok: false, reason: "Locked" };
  if (save.tickCount < getPlanAnticrisisCooldownUntil(save)) {
    return { ok: false, reason: "Cooldown" };
  }

  const criticalMetrics = getPlanAnticrisisCriticalMetrics(save);
  applyEffects(save, { ...PLAN_ANTICRISIS_BASE_EFFECTS });
  criticalMetrics.forEach((metric) => {
    metric.setValue(save, metric.getValue(save) + PLAN_ANTICRISIS_BONUS_AMOUNT);
  });

  setPlanAnticrisisCooldownUntil(
    save,
    save.tickCount + PLAN_ANTICRISIS_COOLDOWN_TICKS
  );

  addNews(save, buildPlanAnticrisisNewsText(source, criticalMetrics.map((m) => m.label)), {
    type: "SYSTEM",
    severity: "WARN"
  });

  return { ok: true, bonusApplied: criticalMetrics.map((metric) => metric.key) };
}

export function getTourismMetrics(save: GameSave): TourismMetrics {
  const tourismIndex = save.tourismIndex ?? 0;
  const tourismCapacity = save.tourismCapacity ?? 0;
  const tourismPressure = save.tourismPressure ?? 0;
  const reputationFactor = 0.6 + (save.reputation / 100) * 0.8;
  const stabilityFactor = 0.6 + (save.stability / 100) * 0.8;
  const geographyFactor = save.country.geography === "archipelago" ? 1.1 : 1;
  const industryFactor = save.industryLeaderId === "SERVICES" ? 1.1 : 1;
  const demand = clamp(
    tourismIndex * reputationFactor * stabilityFactor * geographyFactor * industryFactor,
    0,
    100
  );
  const throughput = Math.min(demand, tourismCapacity);
  const revenue = throughput * TOURISM_REVENUE_PER_UNIT;
  const gdpBoost = throughput * TOURISM_GDP_PER_UNIT;
  const overDemand = Math.max(0, demand - tourismCapacity);
  let pressureDelta = overDemand * TOURISM_PRESSURE_FACTOR;
  if (demand <= tourismCapacity) {
    pressureDelta -= TOURISM_PRESSURE_DECAY;
  }
  const nextPressure = clamp(tourismPressure + pressureDelta, 0, 100);

  return {
    demand,
    throughput,
    revenue,
    gdpBoost,
    pressureDelta,
    nextPressure,
    reputationFactor,
    stabilityFactor,
    geographyFactor,
    industryFactor
  };
}

function getRole(config: ConfigPayload, roleId: string) {
  return config.roles.find((role) => role.id === roleId);
}

interface IndustryEffects {
  incomeMult: number;
  resourceDrain: number;
  environmentalDrift: number;
  reputationDrift: number;
  stabilityDrift: number;
  innovationDrift: number;
  energyDemand: number;
  climateSensitivity: number;
}

function getRemoteConfig(config: ConfigPayload, save: GameSave) {
  return mergeRemoteConfig(
    config.remoteConfigKeys.defaults,
    save.remoteConfigOverrides ?? {}
  );
}

function getIndustryEffects(save: GameSave, config: ConfigPayload): IndustryEffects {
  const effects: IndustryEffects = {
    incomeMult: 1,
    resourceDrain: 0,
    environmentalDrift: 0,
    reputationDrift: 0,
    stabilityDrift: 0,
    innovationDrift: 0,
    energyDemand: 0,
    climateSensitivity: 0
  };

  const applyIndustry = (industryId: string | null, weight: number) => {
    if (!industryId) return;
    const industry = config.industries.find((item) => item.id === industryId);
    if (!industry) return;
    effects.incomeMult *= 1 + (industry.incomeMult - 1) * weight;
    effects.resourceDrain += industry.resourceDrain * weight;
    effects.environmentalDrift += industry.environmentalDrift * weight;
    effects.reputationDrift += industry.reputationDrift * weight;
    effects.stabilityDrift += industry.stabilityDrift * weight;
    effects.innovationDrift += industry.innovationDrift * weight;
    effects.energyDemand += industry.energyDemand * weight;
    effects.climateSensitivity += industry.climateSensitivity * weight;
  };

  applyIndustry(save.industryLeaderId, 1);
  const weight = config.economy.industryDiversificationWeight;
  const maxIndustries = getMaxIndustriesByPhase(
    save.maxPhaseReached ?? save.phase
  );
  const maxDiversified = Math.max(0, maxIndustries - 1);
  const diversified = save.diversifiedIndustries
    .filter((id) => id && id !== save.industryLeaderId)
    .slice(0, maxDiversified);
  diversified.forEach((industryId) => applyIndustry(industryId, weight));

  return effects;
}

function getDecreeModifiers(save: GameSave, config: ConfigPayload): DecreeModifiers {
  const activeIds = save.decreeSlots
    .filter((slot) => slot.decreeId && save.tickCount < slot.activeUntil)
    .map((slot) => slot.decreeId as string);

  return activeIds.reduce<DecreeModifiers>(
    (acc, decreeId) => {
      const decree = config.economy.decrees.find((item) => item.id === decreeId);
      if (!decree) return acc;
      const modifiers = decree.modifiers || {};
      acc.incomeMult *= modifiers.incomeMult ?? 1;
      acc.growthBonus += modifiers.growthBonus ?? 0;
      acc.happinessDrift += modifiers.happinessDrift ?? 0;
      acc.stabilityDrift += modifiers.stabilityDrift ?? 0;
      acc.institutionalTrustDrift += modifiers.institutionalTrustDrift ?? 0;
      acc.corruptionDrift += modifiers.corruptionDrift ?? 0;
      acc.reputationDrift += modifiers.reputationDrift ?? 0;
      return acc;
    },
    {
      incomeMult: 1,
      growthBonus: 0,
      happinessDrift: 0,
      stabilityDrift: 0,
      institutionalTrustDrift: 0,
      corruptionDrift: 0,
      reputationDrift: 0
    }
  );
}

function getDecisionSpeed(role: RoleConfig | undefined, save: GameSave) {
  const base = role?.modifiers.decisionSpeed ?? 1;
  if (role?.coalitionBlock && save.happiness < 45) {
    return base * 0.75;
  }
  return base;
}

function getSanctionRisk(role: RoleConfig | undefined, save: GameSave) {
  let risk = role?.sanctionRiskBase ?? 0;
  if (role?.id === "KING_ABSOLUTE") {
    if (save.budget.securityDiplomacyPct > 40 && save.reputation < 40) {
      risk += 0.15;
    }
  }
  if (
    role?.id === "DICTATOR" ||
    role?.id === "SUPREME_LEADER" ||
    role?.id === "DICTATORSHIP"
  ) {
    risk += 0.1;
    if (save.reputation < 30) {
      risk += 0.2;
    }
  }
  if (save.budget.securityDiplomacyPct > 50) {
    risk += 0.05;
  }
  return risk;
}

function meetsProjectRequirements(project: ProjectConfig, save: GameSave) {
  const req = project.requirements || {};
  const checks: Record<string, boolean> = {
    minPhase: save.phase >= (req.minPhase ?? project.phase),
    minGdp: save.gdp >= (req.minGdp ?? -Infinity),
    minStability: save.stability >= (req.minStability ?? -Infinity),
    minInstitutionalTrust:
      save.institutionalTrust >= (req.minInstitutionalTrust ?? -Infinity),
    minReputation: save.reputation >= (req.minReputation ?? -Infinity),
    minInnovation: save.innovation >= (req.minInnovation ?? -Infinity),
    minResources: save.resources >= (req.minResources ?? -Infinity),
    minHappiness: save.happiness >= (req.minHappiness ?? -Infinity)
  };

  return Object.values(checks).every(Boolean);
}

export function isProjectStartable(
  project: ProjectConfig,
  save: GameSave,
  config: ConfigPayload
) {
  const state = save.projects[project.id];
  if (!state || state.status !== "available" || state.progress !== 0) return false;
  if (!meetsProjectRequirements(project, save)) return false;
  const cost = getEffectiveProjectCost(project, save, config);
  if (save.treasury < cost) return false;
  const adminCost = project.adminCost ?? 0;
  const adminUnlocked = isAdminUnlockedByProjects(save);
  if (adminCost > 0 && !adminUnlocked) return false;
  if (adminCost > 0 && save.admin < adminCost) return false;
  return true;
}

const DEFAULT_EVENT_PHASE_MIN = 1;
const DEFAULT_EVENT_PHASE_MAX = 4;
const FOLLOW_UP_DELAY_TICKS = 3;

function getEventPhaseMin(event: EventConfig) {
  return event.phaseMin ?? event.minPhase ?? DEFAULT_EVENT_PHASE_MIN;
}

function getEventPhaseMax(event: EventConfig) {
  return event.phaseMax ?? event.maxPhase ?? DEFAULT_EVENT_PHASE_MAX;
}

function getEventWeight(event: EventConfig) {
  return event.weight ?? 1;
}

function getEventOptionId(option: EventOptionConfig) {
  return option.key ?? option.id ?? "";
}

function resolveStatValue(save: GameSave, key: string) {
  if (key === "trust") return save.institutionalTrust;
  if (key === "environmental") return save.environmentalImpact;
  if (key === "environmentalImpact") return save.environmentalImpact;
  const value = (save as Record<string, number>)[key];
  return typeof value === "number" ? value : undefined;
}

function meetsStatConstraints(
  constraints: Record<string, number> | undefined,
  save: GameSave,
  comparator: (left: number, right: number) => boolean
) {
  if (!constraints) return true;
  for (const [key, limit] of Object.entries(constraints)) {
    const value = resolveStatValue(save, key);
    if (value === undefined) return false;
    if (!comparator(value, limit)) return false;
  }
  return true;
}

function meetsConditionSet(conditions: EventConfig["conditions"], save: GameSave) {
  if (!conditions) return true;
  if (
    conditions.geographyIn &&
    !conditions.geographyIn.includes(save.country.geography)
  ) {
    return false;
  }
  if (conditions.industryIn) {
    const leaderId = save.industryLeaderId;
    const leaderKey = leaderId ? industryModifierKeyById[leaderId] : null;
    const matches = conditions.industryIn.some(
      (entry) => entry === leaderId || entry === leaderKey
    );
    if (!matches) return false;
  }
  if (!meetsStatConstraints(conditions.statGte, save, (left, right) => left >= right))
    return false;
  if (!meetsStatConstraints(conditions.statLte, save, (left, right) => left <= right))
    return false;
  if (
    conditions.debtToGdpGte !== undefined &&
    save.debt / Math.max(save.gdp, 1) < conditions.debtToGdpGte
  ) {
    return false;
  }
  if (
    conditions.resourcesLte !== undefined &&
    save.resources > conditions.resourcesLte
  ) {
    return false;
  }
  return true;
}

function isEventOnCooldown(event: EventConfig, save: GameSave) {
  const cooldownTicks = event.cooldownTicks ?? 0;
  if (cooldownTicks <= 0) return false;
  const history = save.eventHistory ?? {};
  const lastTick = history[event.id];
  if (lastTick === undefined) return false;
  return save.tickCount - lastTick < cooldownTicks;
}

function meetsEventConditions(event: EventConfig, save: GameSave) {
  const minPhase = getEventPhaseMin(event);
  const maxPhase = getEventPhaseMax(event);
  if (save.phase < minPhase || save.phase > maxPhase) return false;
  if (event.requiredGeographyId) {
    const required = event.requiredGeographyId.toLowerCase();
    if (save.country.geography.toLowerCase() !== required) {
      return false;
    }
  }
  if (event.requiredIndustryId) {
    const leaderId = save.industryLeaderId;
    if (!leaderId) return false;
    const leaderKey = industryModifierKeyById[leaderId];
    const required = event.requiredIndustryId;
    const requiredLower = required.toLowerCase();
    const matches =
      required === leaderId ||
      requiredLower === leaderId.toLowerCase() ||
      (leaderKey ? requiredLower === leaderKey : false);
    if (!matches) return false;
  }
  if (event.requiredRoleId && save.leader.roleId !== event.requiredRoleId)
    return false;
  if (event.minReputation !== undefined && save.reputation < event.minReputation)
    return false;
  if (event.maxReputation !== undefined && save.reputation > event.maxReputation)
    return false;
  if (event.minStability !== undefined && save.stability < event.minStability)
    return false;
  if (event.maxStability !== undefined && save.stability > event.maxStability)
    return false;
  if (event.minHappiness !== undefined && save.happiness < event.minHappiness)
    return false;
  if (event.maxHappiness !== undefined && save.happiness > event.maxHappiness)
    return false;
  if (event.minCorruption !== undefined && save.corruption < event.minCorruption)
    return false;
  if (event.maxCorruption !== undefined && save.corruption > event.maxCorruption)
    return false;
  if (event.minResources !== undefined && save.resources < event.minResources)
    return false;
  if (event.maxResources !== undefined && save.resources > event.maxResources)
    return false;
  if (!meetsConditionSet(event.conditions, save)) return false;
  return true;
}

function weightedPick<T>(items: T[], weights: number[]) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

const EVENT_EFFECT_KEY_MAP: Record<string, string> = {
  treasuryDelta: "treasury",
  gdpDelta: "gdp",
  growthDelta: "growthPct",
  happinessDelta: "happiness",
  stabilityDelta: "stability",
  trustDelta: "institutionalTrust",
  corruptionDelta: "corruption",
  reputationDelta: "reputation",
  resourcesDelta: "resources",
  debtDelta: "debt",
  employmentDelta: "employment",
  energyDelta: "energy",
  innovationDelta: "innovation",
  inequalityDelta: "inequality",
  environmentalDelta: "environmentalImpact",
  environmentalImpactDelta: "environmentalImpact",
  tourismIndexDelta: "tourismIndex",
  tourismCapacityDelta: "tourismCapacity",
  tourismPressureDelta: "tourismPressure"
};

function normalizeEventEffects(raw: Record<string, number>) {
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = EVENT_EFFECT_KEY_MAP[key] ?? key;
    normalized[mapped] = (normalized[mapped] ?? 0) + value;
  }
  return normalized;
}

function applyEffectModifiers(
  effects: Record<string, number>,
  modifiers: EventOptionConfig["modifiers"],
  save: GameSave
) {
  if (!modifiers) return effects;
  const list = Array.isArray(modifiers) ? modifiers : [modifiers];
  let mult = 1;
  for (const modifier of list) {
    if (!modifier) continue;
    if (meetsConditionSet(modifier, save)) {
      mult *= modifier.mult;
    }
  }
  if (mult === 1) return effects;
  const scaled: Record<string, number> = {};
  for (const [key, value] of Object.entries(effects)) {
    scaled[key] = value * mult;
  }
  return scaled;
}

function applyEffects(save: GameSave, effects: Record<string, number>) {
  for (const [key, value] of Object.entries(effects)) {
    switch (key) {
      case "treasury":
        save.treasury = Math.max(0, save.treasury + value);
        break;
      case "gdp":
        save.gdp = Math.max(1, save.gdp + value);
        break;
      case "growthPct":
        save.growthPct = clamp(save.growthPct + value, -6, 12);
        break;
      case "happiness":
        save.happiness = clamp(save.happiness + value, 0, 100);
        break;
      case "stability":
        save.stability = clamp(save.stability + value, 0, 100);
        break;
      case "institutionalTrust":
        save.institutionalTrust = clamp(
          save.institutionalTrust + value,
          0,
          100
        );
        break;
      case "corruption":
        save.corruption = clamp(save.corruption + value, 0, 100);
        break;
      case "resources":
        save.resources = Math.max(0, save.resources + value);
        break;
      case "admin":
      case "adminCapacity":
        save.admin = Math.max(0, (save.admin ?? 0) + value);
        break;
      case "adminUnlocked":
        if (value > 0) {
          save.adminUnlocked = true;
        }
        break;
      case "agencyRevenue":
        if (value > 0) {
          save.agenciesUnlocked.revenue = true;
        }
        break;
      case "agencyInspection":
        if (value > 0) {
          save.agenciesUnlocked.inspection = true;
        }
        break;
      case "agencyPromotion":
        if (value > 0) {
          save.agenciesUnlocked.promotion = true;
        }
        break;
      case "emergencyPlanUnlocked":
        if (value > 0) {
          // Legacy effect: keep plan anticrisis unlock in sync.
          setPlanAnticrisisUnlocked(save, true);
        }
        break;
      case "treatiesUnlocked":
        if (value > 0) {
          save.treatiesUnlocked = true;
        }
        break;
      case "offlineIncomeBonus":
        save.offlineRewardMultiplier = Math.max(
          save.offlineRewardMultiplier ?? 0,
          value
        );
        break;
      case "reputation":
        save.reputation = clamp(save.reputation + value, 0, 100);
        break;
      case "debt":
        save.debt = Math.max(0, save.debt + value);
        break;
      case "employment":
        save.employment = clamp(save.employment + value, 0, 100);
        break;
      case "energy":
        save.energy = clamp(save.energy + value, 0, 100);
        break;
      case "innovation":
        save.innovation = clamp(save.innovation + value, 0, 100);
        break;
      case "inequality":
        save.inequality = clamp(save.inequality + value, 0, 100);
        break;
      case "environmentalImpact":
        save.environmentalImpact = clamp(
          save.environmentalImpact + value,
          0,
          100
        );
        break;
      case "tourismIndex":
        save.tourismIndex = clamp(save.tourismIndex + value, 0, 100);
        break;
      case "tourismCapacity":
        save.tourismCapacity = clamp(save.tourismCapacity + value, 0, 100);
        break;
      case "tourismPressure":
        save.tourismPressure = clamp(save.tourismPressure + value, 0, 100);
        break;
      default:
        break;
    }
  }
}

function recalcPhase(save: GameSave, config: ConfigPayload) {
  const completed = Object.values(save.projects).filter(
    (project) => project.status === "completed"
  ).length;
  const { phase2, phase3, phase4 } = config.economy.phaseThresholds;

  if (
    save.gdp >= phase4.gdp &&
    save.stability >= phase4.stability &&
    save.institutionalTrust >= phase4.trust &&
    completed >= phase4.projects
  ) {
    return 4;
  }
  if (
    save.gdp >= phase3.gdp &&
    save.stability >= phase3.stability &&
    save.institutionalTrust >= phase3.trust &&
    completed >= phase3.projects
  ) {
    return 3;
  }
  if (
    save.gdp >= phase2.gdp &&
    save.stability >= phase2.stability &&
    save.institutionalTrust >= phase2.trust &&
    completed >= phase2.projects
  ) {
    return 2;
  }
  return 1;
}

function syncLevel1Completion(save: GameSave) {
  const level = save.level ?? 1;
  if (level === 1 && save.phase >= 4) {
    save.level1Complete = true;
  }
}

function addNews(
  save: GameSave,
  text: string,
  meta: Partial<Pick<GameSave["news"][number], "type" | "severity" | "id">> = {}
) {
  save.news.unshift({
    id: meta.id ?? makeId("news"),
    text,
    createdAt: Date.now(),
    type: meta.type ?? "SYSTEM",
    severity: meta.severity ?? "OK"
  });
  if (save.news.length > 50) {
    save.news = save.news.slice(0, 50);
  }
}

const RISK_THRESHOLD = 85;
const RISK_TICKS = 60;
const ZERO_MORALE_TICKS = 20;
const DEBT_OVER_TICKS = 30;
const TREASURY_RISK_TICKS = 10;

function getAdvice(save: GameSave) {
  const debtRatio = save.gdp > 0 ? save.debt / save.gdp : 0;
  if (debtRatio >= 3) {
    return "Reduce gasto y ajusta impuestos para frenar la deuda.";
  }
  if (save.corruption >= 85) {
    return "Baja corrupcion con contraloria y controles.";
  }
  if (save.happiness <= 15) {
    return "Sube bienestar y empleo para recuperar felicidad.";
  }
  if (save.stability <= 15) {
    return "Equilibra presupuesto y sube confianza institucional.";
  }
  return "Sube bienestar 10-15% y reduce desigualdad.";
}

function applyCoupRisk(save: GameSave) {
  const debtRatio = save.gdp > 0 ? save.debt / save.gdp : 0;

  save.zeroTreasuryTicks = save.zeroTreasuryTicks ?? 0;
  save.zeroMoraleTicks = save.zeroMoraleTicks ?? 0;
  save.debtOverTicks = save.debtOverTicks ?? 0;
  save.riskTicks = save.riskTicks ?? 0;
  save.lastRisk = save.lastRisk ?? 0;

  save.zeroTreasuryTicks =
    save.treasury <= 0 ? save.zeroTreasuryTicks + 1 : 0;
  save.zeroMoraleTicks =
    save.happiness <= 0 && save.stability <= 0
      ? save.zeroMoraleTicks + 1
      : 0;
  save.debtOverTicks = debtRatio >= 4 ? save.debtOverTicks + 1 : 0;

  let risk = 0;
  const causes: { label: string; score: number }[] = [];

  if (save.happiness <= 10) {
    risk += 25;
    causes.push({ label: "Felicidad <= 10", score: 25 });
  }
  if (save.stability <= 10) {
    risk += 25;
    causes.push({ label: "Estabilidad <= 10", score: 25 });
  }
  if (save.institutionalTrust <= 10) {
    risk += 20;
    causes.push({ label: "Confianza <= 10", score: 20 });
  }
  if (save.zeroTreasuryTicks >= TREASURY_RISK_TICKS) {
    risk += 20;
    causes.push({ label: "Tesoro en cero sostenido", score: 20 });
  }
  if (debtRatio > 2.5) {
    risk += 20;
    causes.push({
      label: `Deuda/PIB ${debtRatio.toFixed(1)}`,
      score: 20
    });
  }
  if (save.growthPct <= -5) {
    risk += 10;
    causes.push({ label: "Crecimiento <= -5%", score: 10 });
  }
  if (save.corruption >= 90) {
    risk += 20;
    causes.push({ label: "Corrupcion >= 90", score: 20 });
  }

  if (save.treasury > 200) risk -= 10;
  if (save.happiness > 50) risk -= 10;
  if (save.stability > 50) risk -= 10;

  risk = clamp(risk, 0, 100);
  save.lastRisk = risk;
  save.riskTicks = risk >= RISK_THRESHOLD ? save.riskTicks + 1 : 0;

  const overByRisk = save.riskTicks >= RISK_TICKS;
  const overByMorale = save.zeroMoraleTicks >= ZERO_MORALE_TICKS;
  const overByDebt = save.debtOverTicks >= DEBT_OVER_TICKS;
  if (!save.gameOver && (overByRisk || overByMorale || overByDebt)) {
    const sorted = causes.sort((a, b) => b.score - a.score);
    const topCauses = sorted.slice(0, 3).map((cause) => cause.label);
    const reason = overByMorale
      ? "Colapso social sostenido"
      : overByDebt
      ? "Crisis fiscal estructural"
      : "Riesgo de derrocamiento sostenido";

    save.gameOver = true;
    save.gameOverReason = reason;
    save.gameOverAt = new Date().toISOString();
    save.gameOverAtTick = save.tickCount;
    save.gameOverCauses = topCauses;
    save.gameOverAdvice = getAdvice(save);
    save.activeEventId = null;
    addNews(save, "El gabinete declara el fin del mandato.");
  }
}

export function applyTick(
  save: GameSave,
  config: ConfigPayload,
  options: TickOptions = {}
) {
  if (save.gameOver) {
    return;
  }

  let planActivatedThisTick = false;
  const role = getRole(config, save.leader.roleId);
  const roleModifiers = role?.modifiers ?? {};
  const remote = getRemoteConfig(config, save);
  const industryEffects = getIndustryEffects(save, config);
  const decreeModifiers = getDecreeModifiers(save, config);
  const industryModifier = getIndustryModifierById(save.industryLeaderId);
  const industryRequirementMult = getIndustrySoftRequirementMultiplier(
    save,
    industryModifier
  );
  const industryRevenueMult =
    (industryModifier?.revenueMult ?? 1) * industryRequirementMult;
  const industryGrowthBase =
    (industryModifier?.growthBase ?? 0) * industryRequirementMult;
  const industryHappinessDelta = industryModifier?.happinessDelta ?? 0;
  const industryStabilityDelta = industryModifier?.stabilityDelta ?? 0;
  const industryReputationDelta = industryModifier?.reputationDelta ?? 0;
  const industryResourceDelta = industryModifier?.resourceDelta ?? 0;
  const decisionSpeed = getDecisionSpeed(role, save);
  const driftScale =
    config.economy.statDriftScale * (roleModifiers.statDriftMultiplier ?? 1);
  const tourismMetrics = getTourismMetrics(save);
  const tourismPressureNext = tourismMetrics.nextPressure;
  const tourismHappinessDelta =
    tourismPressureNext > TOURISM_PRESSURE_THRESHOLD
      ? -1
      : tourismPressureNext < 30 && tourismMetrics.throughput > 40
      ? 0.2
      : 0;
  const tourismStabilityDelta =
    tourismPressureNext > TOURISM_PRESSURE_THRESHOLD ? -0.8 : 0;
  const tourismEnvironmentalDelta =
    tourismPressureNext > TOURISM_PRESSURE_THRESHOLD ? 1 : 0;
  const tourismReputationDelta =
    tourismPressureNext > TOURISM_PRESSURE_THRESHOLD + 10
      ? -0.3
      : tourismMetrics.throughput > 50 && tourismPressureNext < 30
      ? 0.2
      : 0;
  const adminCorruptionDrift = getAdminCorruptionDrift(save);

  const { industryPct, welfarePct, securityDiplomacyPct } = save.budget;
  const spendingBase = save.gdp * config.economy.spendingScale;
  const industrySpend = spendingBase * (industryPct / 100);
  const welfareSpend = spendingBase * (welfarePct / 100);

  const taxRate = getTaxRate(save);
  const taxRatePct = getTaxRatePct(save) / 100;
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
      taxRatePct * 0.08,
    0.05,
    0.85
  );

  const incomeBase =
    save.gdp * taxRate * collectionEfficiency * (1 - evasion) * config.economy.incomeScale;
  const agencyIncomeMult = save.agenciesUnlocked.revenue
    ? config.economy.agencies.revenue.incomeMult
    : 1;
  const treatyIncomeMult = save.treatiesUnlocked
    ? config.economy.treaties.incomeMult
    : 1;
  const nonIndustryIncomeMult =
    decreeModifiers.incomeMult * agencyIncomeMult * treatyIncomeMult;
  let adjustedIncome =
    incomeBase * nonIndustryIncomeMult * industryRevenueMult;

  if (save.phase === 1) {
    const completedCount = Object.values(save.projects).filter(
      (project) => project.status === "completed"
    ).length;
    if (completedCount < 1) {
      const minimumRevenue = Math.max(
        config.economy.minimumRevenue.floor,
        save.gdp * config.economy.minimumRevenue.phase1Scale
      );
      if (adjustedIncome < minimumRevenue) {
        if (import.meta.env.DEV) {
          console.warn("Minimum revenue applied", {
            adjustedIncome,
            minimumRevenue,
            phase: save.phase
          });
        }
        adjustedIncome = minimumRevenue;
      }
    }
  }

  const tourismIncome = tourismMetrics.revenue;
  save.treasury += adjustedIncome + tourismIncome - spendingBase;
  if (save.treasury < 0) {
    save.debt += Math.abs(save.treasury);
    save.treasury = 0;
  }
  save.debt += save.debt * config.economy.debtInterestRate;
  maybeUnlockPlanAnticrisis(save);

  const resourceUse =
    config.economy.resourceUseBase +
    industryEffects.resourceDrain +
    (industryPct / 100) * config.economy.resourceUseIndustryBoost;
  save.resources = clamp(
    save.resources - resourceUse + industryResourceDelta,
    0,
    200
  );
  if (save.industryLeaderId === "EXTRACTION") {
    save.resources = clamp(
      save.resources + config.economy.extractionBaseYield,
      0,
      200
    );
  }

  const industryFactor = industrySpend / Math.max(save.gdp, 1);
  const innovationFactor = (save.innovation - 50) / 100;
  const stabilityFactor = (save.stability - 50) / 100;
  const debtPenalty = (save.debt / Math.max(save.gdp, 1)) * 0.2;
  const envPenalty = Math.max(0, save.environmentalImpact - 50) / 100 * 0.2;
  const corruptionPenalty = (save.corruption / 100) * 0.3;
  const resourcePenalty = save.resources <= 0 ? config.economy.resourceGrowthPenalty : 0;
  const taxElasticity = remote.tax_elasticity ?? 0;
  const taxGrowthPenalty =
    taxElasticity * (taxRatePct * 1.5 - 0.5);
  const promotionGrowthBonus = save.agenciesUnlocked.promotion
    ? config.economy.agencies.promotion.growthBonus
    : 0;

  let growthDelta =
    industryFactor * 0.6 + innovationFactor * 0.25 + stabilityFactor * 0.25;
  growthDelta += roleModifiers.gdpGrowthBonus ?? 0;
  growthDelta += promotionGrowthBonus;
  if (roleModifiers.reputationGrowthPenalty && save.reputation > 65) {
    growthDelta -= roleModifiers.reputationGrowthPenalty;
  }
  growthDelta -=
    corruptionPenalty + debtPenalty + envPenalty + resourcePenalty + taxGrowthPenalty;

  save.growthPct = clamp(
    save.growthPct +
      (growthDelta + decreeModifiers.growthBonus) * driftScale,
    -6,
    12
  );

  const effectiveGrowthPct =
    industryGrowthBase * 100 + save.growthPct * config.economy.gdpGrowthScale;
  const growthFactor = effectiveGrowthPct / 100;
  const growthIsNegative = effectiveGrowthPct <= 0;
  save.gdp = Math.max(1, save.gdp * (1 + growthFactor));
  save.gdp = Math.max(1, save.gdp + tourismMetrics.gdpBoost);

  const happinessTaxPenalty = remote.happiness_tax_penalty ?? 0.5;
  const taxPenalty = -(happinessTaxPenalty * (taxRate / MAX_TAX_RATE));
  const happinessDelta =
    (welfareSpend / Math.max(save.gdp, 1)) * 3 +
    (save.employment - 50) * 0.01 -
    (save.inequality - 50) * 0.01 -
    taxPenalty +
    decreeModifiers.happinessDrift +
    industryHappinessDelta +
    tourismHappinessDelta +
    config.economy.baseDrifts.happiness;
  save.happiness = clamp(
    save.happiness + happinessDelta * driftScale,
    0,
    100
  );

  const protestModifier = -(roleModifiers.protestRisk ?? 0);
  const stabilityDelta =
    (save.institutionalTrust - 50) * 0.012 -
    (save.corruption - 30) * 0.01 +
    (roleModifiers.stabilityDrift ?? 0) +
    decreeModifiers.stabilityDrift -
    protestModifier * 0.5 +
    industryEffects.stabilityDrift +
    industryStabilityDelta +
    tourismStabilityDelta +
    config.economy.baseDrifts.stability;
  save.stability = clamp(
    save.stability + stabilityDelta * driftScale,
    0,
    100
  );

  const trustDelta =
    (save.stability - 50) * 0.01 -
    (save.corruption - 30) * 0.01 +
    decreeModifiers.institutionalTrustDrift +
    (roleModifiers.institutionalTrustDrift ?? 0);
  save.institutionalTrust = clamp(
    save.institutionalTrust + trustDelta * driftScale,
    0,
    100
  );

  const inspectionCorruptionDrift = save.agenciesUnlocked.inspection
    ? config.economy.agencies.inspection.corruptionDrift
    : 0;
  const corruptionDelta =
    (-0.1 + taxRatePct * 0.3) +
    (roleModifiers.corruptionDrift ?? 0) +
    decreeModifiers.corruptionDrift +
    inspectionCorruptionDrift -
    (save.institutionalTrust - 50) * 0.01 +
    adminCorruptionDrift +
    config.economy.baseDrifts.corruption;
  save.corruption = clamp(
    save.corruption + corruptionDelta * driftScale,
    0,
    100
  );

  const securityPenalty =
    (securityDiplomacyPct / 100) * config.economy.securityReputationPenalty;
  const promotionReputationDrift = save.agenciesUnlocked.promotion
    ? config.economy.agencies.promotion.reputationDrift
    : 0;
  const treatyReputationDrift = save.treatiesUnlocked
    ? config.economy.treaties.reputationDrift
    : 0;
  const reputationDelta =
    (roleModifiers.reputationDrift ?? 0) +
    decreeModifiers.reputationDrift +
    (save.stability - 50) * 0.01 -
    securityPenalty -
    Math.max(0, save.environmentalImpact - 50) * 0.008 +
    industryEffects.reputationDrift +
    industryReputationDelta +
    tourismReputationDelta +
    promotionReputationDrift +
    treatyReputationDrift +
    config.economy.baseDrifts.reputation;
  save.reputation = clamp(
    save.reputation + reputationDelta * driftScale,
    0,
    100
  );

  const employmentDelta =
    (save.growthPct / 100) * 1.5 +
    industryFactor * 0.8 -
    (save.inequality - 50) * 0.01;
  save.employment = clamp(
    save.employment + employmentDelta * driftScale,
    0,
    100
  );

  const energyDelta =
    industryFactor * 1.2 -
    Math.max(0, save.environmentalImpact - 50) * 0.01 -
    industryEffects.energyDemand;
  save.energy = clamp(
    save.energy + energyDelta * driftScale,
    0,
    100
  );

  const innovationDelta =
    industryFactor * 0.9 +
    (save.institutionalTrust - 50) * 0.005 -
    (save.corruption - 30) * 0.01 +
    industryEffects.innovationDrift;
  save.innovation = clamp(
    save.innovation + innovationDelta * driftScale,
    0,
    100
  );

  const inequalityDelta =
    (0.4 - taxRatePct * 0.9) +
    (save.corruption - 30) * 0.01 -
    (welfareSpend / Math.max(save.gdp, 1)) * 1.2;
  save.inequality = clamp(
    save.inequality + inequalityDelta * driftScale,
    0,
    100
  );

  const inspectionEnvironmentalDrift = save.agenciesUnlocked.inspection
    ? config.economy.agencies.inspection.environmentalDrift
    : 0;
  const environmentalDelta =
    industryFactor * 1.4 -
    (welfareSpend / Math.max(save.gdp, 1)) * 0.4 +
    industryEffects.environmentalDrift +
    inspectionEnvironmentalDrift +
    tourismEnvironmentalDelta;
  save.environmentalImpact = clamp(
    save.environmentalImpact + environmentalDelta * driftScale,
    0,
    100
  );
  save.tourismPressure = tourismPressureNext;

  const coalitionBlocked = role?.coalitionBlock && save.happiness < 45;

  for (const project of config.projects) {
    const state = save.projects[project.id];
    if (!state) continue;

    if (state.status === "completed") continue;

    if (state.status === "in_progress" || state.status === "paused") {
      if (coalitionBlocked) {
        state.status = "paused";
        continue;
      }

      state.status = "in_progress";
      state.progress += decisionSpeed;
      if (state.progress >= project.durationTicks) {
        state.status = "completed";
        applyEffects(save, project.effects);
        addNews(
          save,
          `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
            save.leader.name
          } completa el proyecto ${project.name}.`,
          { type: "PROJECT" }
        );
      }
      continue;
    }

    const wasLocked = state.status === "locked";
    state.status = meetsProjectRequirements(project, save) ? "available" : "locked";
    if (wasLocked && state.status === "available") {
      addNews(save, `Proyecto desbloqueado: ${project.name}.`, {
        type: "PROJECT_UNLOCK",
        severity: "CRITICAL"
      });
    }
  }

  // Admin unlock follows Contraloria completion; refresh after project updates.
  syncAdminUnlock(save);
  const adminDelta = refreshAdminPerTick(save);
  save.admin = Math.max(0, (save.admin ?? 0) + adminDelta);

  const notifiedStartables = new Set(save.notifiedStartableProjectIds ?? []);
  for (const project of config.projects) {
    if (isProjectStartable(project, save, config) && !notifiedStartables.has(project.id)) {
      addNews(save, `Proyecto listo para iniciar: ${project.name}`, {
        id: `NEWS_PROJ_READY_${project.id}`,
        type: "PROJECT_READY",
        severity: "CRITICAL"
      });
      notifiedStartables.add(project.id);
    }
  }
  save.notifiedStartableProjectIds = Array.from(notifiedStartables);

  save.phase = recalcPhase(save, config);
  syncLevel1Completion(save);
  save.maxPhaseReached = Math.max(
    save.maxPhaseReached ?? save.phase,
    save.phase
  );
  if (save.phase >= 4) {
    save.treatiesUnlocked = true;
  }

  if (!options.suppressEvents) {
    save.eventCooldown = Math.max(0, save.eventCooldown - 1);

    save.eventHistory = save.eventHistory ?? {};

    if (!save.activeEventId) {
      if (save.pendingEventId) {
        save.pendingEventDelay = Math.max(0, (save.pendingEventDelay ?? 0) - 1);
        if (save.pendingEventDelay === 0) {
          const pending = config.events.find(
            (event) => event.id === save.pendingEventId
          );
          if (pending && meetsEventConditions(pending, save)) {
            save.activeEventId = pending.id;
            save.eventHistory[pending.id] = save.tickCount;
            save.eventCooldown = config.economy.eventCooldownTicks;
          }
          save.pendingEventId = null;
          save.pendingEventDelay = 0;
        }
      }

      if (!save.activeEventId && save.eventCooldown === 0) {
        const baseChance = remote.event_frequency ?? config.economy.eventBaseChance;
        const thresholds = remote.crisis_thresholds ?? {
          happiness: 40,
          stability: 40,
          trust: 40
        };
        const crisisFactor =
          save.happiness < thresholds.happiness ||
          save.stability < thresholds.stability ||
          save.institutionalTrust < thresholds.trust
            ? 1.2
            : 1;
        const chance = baseChance * crisisFactor;
        if (Math.random() < chance) {
          const candidates = config.events.filter(
            (event) =>
              meetsEventConditions(event, save) &&
              !isEventOnCooldown(event, save) &&
              getEventWeight(event) > 0
          );
          if (candidates.length > 0) {
            const sanctionRisk = getSanctionRisk(role, save);
            const weights = candidates.map((event) => {
              let weight = getEventWeight(event);
              if (event.tags.includes("sanction")) {
                weight *= 1 + sanctionRisk;
              }
              if (event.tags.includes("negotiation")) {
                weight *= 1 + (roleModifiers.negotiationEventFreq ?? 0);
              }
              if (event.tags.includes("diplomacy")) {
                weight *= 1 + (roleModifiers.diplomacyEventFreq ?? 0);
              }
              if (event.tags.includes("crisis")) {
                weight *= 1 + (roleModifiers.protestRisk ?? 0);
                if (role?.lowHappinessCrisisBoost && save.happiness < 45) {
                  weight *= 1 + role.lowHappinessCrisisBoost;
                }
              }
              if (event.tags.includes("climate")) {
                weight *= 1 + industryEffects.climateSensitivity;
              }
              return weight;
            });
            const picked = weightedPick(candidates, weights);
            save.activeEventId = picked.id;
            save.eventHistory[picked.id] = save.tickCount;
            save.eventCooldown = config.economy.eventCooldownTicks;
          }
        }
      }
    }
  }

  const planCooldownUntil = getPlanAnticrisisCooldownUntil(save);
  if (
    growthIsNegative &&
    getPlanAnticrisisUnlocked(save) &&
    save.tickCount >= planCooldownUntil &&
    !planActivatedThisTick
  ) {
    const result = activatePlanAnticrisis(save, "auto");
    planActivatedThisTick = result.ok;
  }

  applyCoupRisk(save);
  save.tickCount += 1;
  save.lastTickAt = Date.now();
}

export function applyEventOption(
  save: GameSave,
  config: ConfigPayload,
  eventId: string,
  optionId: string
) {
  const event = config.events.find((item) => item.id === eventId);
  if (!event) return;
  const option = event.options.find(
    (item) => getEventOptionId(item) === optionId
  );
  if (!option) return;

  const role = getRole(config, save.leader.roleId);
  const crisisSeverity = role?.crisisSeverity ?? 0;

  const normalized = normalizeEventEffects(option.effects ?? {});
  const effects = applyEffectModifiers(normalized, option.modifiers, save);
  if (event.tags.includes("crisis") && crisisSeverity > 0) {
    for (const [key, value] of Object.entries(effects)) {
      if (value < 0) {
        effects[key] = value * (1 + crisisSeverity);
      }
    }
  }

  applyEffects(save, effects);

  if (option.followUpEventId) {
    save.pendingEventId = option.followUpEventId;
    save.pendingEventDelay = FOLLOW_UP_DELAY_TICKS;
  }

  const newsTemplate =
    option.news ??
    "{{leaderName}} decide: {{optionText}}.";
  addNews(
    save,
    formatTemplate(newsTemplate, {
      leaderName: save.leader.name,
      countryName: save.country.formalName,
      roleTitle: formatRoleTitle(save.leader.roleId, save.leader.gender),
      optionText: option.text
    }),
    { type: "EVENT" }
  );

  save.activeEventId = null;
}

export function applyProjectStart(
  save: GameSave,
  project: ProjectConfig,
  config: ConfigPayload
) {
  const remote = getRemoteConfig(config, save);
  const phaseMultiplier =
    remote.project_cost_multiplier_by_phase?.[String(project.phase)] ?? 1;
  const totalCost = Math.round(
    project.cost * phaseMultiplier * config.economy.projectCostCurve
  );
  const adminCost = project.adminCost ?? 0;
  if (save.treasury < totalCost) return false;
  const adminUnlocked = isAdminUnlockedByProjects(save);
  if (adminCost > 0 && !adminUnlocked) return false;
  if (adminCost > 0 && save.admin < adminCost) return false;
  const state = save.projects[project.id];
  if (!state || state.status !== "available") return false;

  save.treasury -= totalCost;
  if (adminCost > 0) {
    save.admin = Math.max(0, save.admin - adminCost);
  }
  state.status = "in_progress";
  state.progress = 0;
  addNews(
    save,
    `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
      save.leader.name
    } inicia ${project.name}.`,
    { type: "PROJECT" }
  );
  save.phase = recalcPhase(save, config);
  syncLevel1Completion(save);
  return true;
}

export function getEffectiveProjectCost(
  project: ProjectConfig,
  save: GameSave,
  config: ConfigPayload
) {
  const remote = getRemoteConfig(config, save);
  const phaseMultiplier =
    remote.project_cost_multiplier_by_phase?.[String(project.phase)] ?? 1;
  return Math.round(project.cost * phaseMultiplier * config.economy.projectCostCurve);
}

export function applyProjectBoost(
  save: GameSave,
  project: ProjectConfig,
  config: ConfigPayload
) {
  const state = save.projects[project.id];
  if (!state || state.status !== "in_progress") return false;
  state.progress = project.durationTicks;
  state.status = "completed";
  applyEffects(save, project.effects);
  syncAdminUnlock(save);
  refreshAdminPerTick(save);
  addNews(
    save,
    `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
      save.leader.name
    } acelera y completa ${project.name}.`,
    { type: "PROJECT" }
  );
  save.phase = recalcPhase(save, config);
  syncLevel1Completion(save);
  return true;
}

export function applyEmergencyPlan(save: GameSave, _config: ConfigPayload) {
  return activatePlanAnticrisis(save, "manual");
}

export function applyExternalEffects(
  save: GameSave,
  effects: Record<string, number>
) {
  applyEffects(save, effects);
}

export function applyDecreeActivation(
  save: GameSave,
  config: ConfigPayload,
  slotId: number
) {
  const slot = save.decreeSlots.find((item) => item.slotId === slotId);
  if (!slot || !slot.decreeId) return { ok: false, reason: "No decree" };

  const decree = config.economy.decrees.find((item) => item.id === slot.decreeId);
  if (!decree) return { ok: false, reason: "Missing decree" };

  if (save.tickCount < slot.cooldownUntil) {
    return { ok: false, reason: "Cooldown" };
  }

  const role = getRole(config, save.leader.roleId);
  const extraCosts: Record<string, number> = {};
  if (role?.checksBalances && (save.stability < 45 || save.institutionalTrust < 45)) {
    extraCosts.stability = -2;
    extraCosts.institutionalTrust = -2;
  }

  applyEffects(save, decree.cost);
  applyEffects(save, extraCosts);

  slot.activeUntil = save.tickCount + decree.durationTicks;
  slot.cooldownUntil = slot.activeUntil + decree.cooldownTicks;

  addNews(
    save,
    `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
      save.leader.name
    } activa el decreto ${decree.name}.`,
    { type: "SYSTEM" }
  );

  return { ok: true };
}

export function rebuildProjects(
  save: GameSave,
  config: ConfigPayload
): GameSave {
  const next: GameSave = { ...save, projects: { ...save.projects } };
  for (const project of config.projects) {
    if (!next.projects[project.id]) {
      next.projects[project.id] = { status: "locked", progress: 0 };
    }
  }
  return next;
}
