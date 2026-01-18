export type Gender = "MALE" | "FEMALE" | "PREFER_NOT_SAY" | "OTHER";
export type TaxLevel = "LOW" | "MED" | "HIGH";
export type RoleSelectionMode = "MANUAL" | "RANDOM";
export type Geography =
  | "archipelago"
  | "coastal"
  | "mountain"
  | "desert"
  | "forest"
  | "urban";

export interface UserProfile {
  userId?: number;
  id: number;
  email: string;
  displayName: string | null;
  leaderName?: string | null;
  pronouns?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface RoleLabels {
  male: string;
  female: string;
  neutral: string;
}

export interface RoleConfig {
  id: string;
  labels: RoleLabels;
  modifiers: Record<string, number>;
  flavorText: string[];
  checksBalances?: boolean;
  coalitionBlock?: boolean;
  sanctionRiskBase?: number;
  crisisSeverity?: number;
  lowHappinessCrisisBoost?: number;
}

export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  phase: number;
  cost: number;
  valueScore?: number;
  adminCost?: number;
  durationTicks: number;
  requirements: Record<string, number>;
  effects: Record<string, number>;
}

export interface EventOptionConfig {
  id?: string;
  key?: string;
  text: string;
  effects: Record<string, number>;
  news?: string;
  modifiers?: EventEffectModifier | EventEffectModifier[];
  followUpEventId?: string;
}

export interface EventEffectModifier extends EventConditions {
  mult: number;
}

export interface EventConditions {
  geographyIn?: Geography[];
  industryIn?: string[];
  statGte?: Record<string, number>;
  statLte?: Record<string, number>;
  debtToGdpGte?: number;
  resourcesLte?: number;
}

export interface EventConfig {
  id: string;
  title: string;
  description: string;
  phaseMin?: number;
  phaseMax?: number;
  weight?: number;
  conditions?: EventConditions;
  cooldownTicks?: number;
  requiredGeographyId?: string;
  requiredIndustryId?: string;
  minPhase?: number;
  maxPhase?: number;
  requiredRoleId?: string;
  minReputation?: number;
  maxReputation?: number;
  minStability?: number;
  maxStability?: number;
  minHappiness?: number;
  maxHappiness?: number;
  minCorruption?: number;
  maxCorruption?: number;
  minResources?: number;
  maxResources?: number;
  tags: string[];
  options: EventOptionConfig[];
}

export interface DecreeConfig {
  id: string;
  name: string;
  description: string;
  durationTicks: number;
  cooldownTicks: number;
  cost: Record<string, number>;
  modifiers: Record<string, number>;
}

export interface EconomyConfig {
  tickMs: number;
  offlineCapHours: number;
  taxRates: Record<TaxLevel, number>;
  incomeScale: number;
  spendingScale: number;
  gdpGrowthScale: number;
  statDriftScale: number;
  baseDrifts: {
    happiness: number;
    stability: number;
    corruption: number;
    reputation: number;
  };
  collectionEfficiencyBase: number;
  evasionBase: number;
  eventBaseChance: number;
  eventCooldownTicks: number;
  projectCostCurve: number;
  resourceUseBase: number;
  resourceUseIndustryBoost: number;
  resourceGrowthPenalty: number;
  debtInterestRate: number;
  securityReputationPenalty: number;
  minimumRevenue: { phase1Scale: number; floor: number };
  extractionBaseYield: number;
  industryDiversificationWeight: number;
  phaseThresholds: {
    phase2: { gdp: number; stability: number; trust: number; projects: number };
    phase3: { gdp: number; stability: number; trust: number; projects: number };
    phase4: { gdp: number; stability: number; trust: number; projects: number };
  };
  phaseDefinitions: { id: number; name: string; unlocks: string[] }[];
  adminCapacity: {
    unlockPhase: number;
    baseGain: number;
    trustFactor: number;
    max: number;
  };
  agencies: {
    revenue: { incomeMult: number; evasionReduction: number };
    inspection: { corruptionDrift: number; environmentalDrift: number };
    promotion: { reputationDrift: number; growthBonus: number };
  };
  treaties: { incomeMult: number; reputationDrift: number };
  emergencyPlan: { cooldownTicks: number; effects: Record<string, number> };
  decrees: DecreeConfig[];
  startingState: {
    treasury: number;
    gdp: number;
    growthPct: number;
    happiness: number;
    stability: number;
    institutionalTrust: number;
    corruption: number;
    resources: number;
    reputation: number;
    debt: number;
    employment: number;
    energy: number;
    innovation: number;
    inequality: number;
    environmentalImpact: number;
    tourismIndex: number;
    tourismCapacity: number;
    tourismPressure: number;
    taxRatePct?: number;
    taxLevel: TaxLevel;
    budget: {
      industryPct: number;
      welfarePct: number;
      securityDiplomacyPct: number;
    };
  };
}

export interface IndustryConfig {
  id: string;
  label: string;
  description: string;
  incomeMult: number;
  resourceDrain: number;
  environmentalDrift: number;
  reputationDrift: number;
  stabilityDrift: number;
  innovationDrift: number;
  energyDemand: number;
  climateSensitivity: number;
}

export interface IapOfferConfig {
  id: string;
  name: string;
  price: string;
  tokens: number;
  label: string;
}

export interface RewardedAdConfig {
  id: string;
  name: string;
  description: string;
  effect: Record<string, number>;
}

export interface IapConfig {
  currency: { id: string; name: string };
  offers: IapOfferConfig[];
  actions: {
    projectSpeedCost: number;
    eventMitigationCost: number;
    offlineCapBoostCost: number;
    offlineCapBoostHours: number;
    autoBalanceUnlockCost: number;
    reportClarityUnlockCost: number;
    carbonCreditsCost: number;
    carbonCreditsReduction: number;
  };
  rewardedAds: RewardedAdConfig[];
}

export interface RemoteConfigDefaults {
  tax_elasticity: number;
  happiness_tax_penalty: number;
  project_cost_multiplier_by_phase: Record<string, number>;
  offline_cap_hours: number;
  event_frequency: number;
  crisis_thresholds: { happiness: number; stability: number; trust: number };
  iap_offer_rotation: string;
  starter_pack_eligibility: boolean;
  mandate_role_weights: Record<string, number>;
  mandate_traits: string[];
  mandate_taglines: string[];
}

export interface RemoteConfigKey {
  key: string;
  type: string;
  description: string;
}

export interface RemoteConfigPayload {
  defaults: RemoteConfigDefaults;
  keys: RemoteConfigKey[];
}

export interface PolicyPreset {
  id: string;
  name: string;
  description: string;
  budget: {
    industryPct: number;
    welfarePct: number;
    securityDiplomacyPct: number;
  };
  adjustments: Record<string, number>;
}

export interface StateTypeConfig {
  id: string;
  label: string;
  prefix: string;
}

export interface ConfigPayload {
  roles: RoleConfig[];
  projects: ProjectConfig[];
  events: EventConfig[];
  economy: EconomyConfig;
  policyPresets: PolicyPreset[];
  stateTypes: StateTypeConfig[];
  industries: IndustryConfig[];
  iapConfig: IapConfig;
  remoteConfigKeys: RemoteConfigPayload;
  version: string;
}

export interface CountryInfo {
  baseName: string;
  stateTypeId: string;
  stateTypeOtherText?: string;
  formalName: string;
  geography: Geography;
  motto?: string;
  demonym?: string;
}

export interface ProfilePayload {
  email: string;
  displayName: string | null;
  country: CountryInfo | null;
  regime: string | null;
  medals: string[];
  motto?: string | null;
}

export interface LeaderInfo {
  name: string;
  gender: Gender;
  genderOther?: string;
  roleId: string;
  roleSelectionMode: RoleSelectionMode;
  trait?: string;
  tagline?: string;
}

export interface ProjectState {
  status: "locked" | "available" | "in_progress" | "paused" | "completed";
  progress: number;
}

export interface DecreeSlot {
  slotId: number;
  decreeId: string | null;
  activeUntil: number;
  cooldownUntil: number;
}

export interface NewsItem {
  id: string;
  text: string;
  type?: "SYSTEM" | "EVENT" | "PROJECT" | "PROJECT_UNLOCK" | "PROJECT_READY";
  severity?: "OK" | "WARN" | "CRITICAL";
  createdAt: number;
}

export interface ActiveEvent {
  eventId: string;
  optionIds: string[];
}

export interface GameSave {
  version?: string;
  country: CountryInfo;
  leader: LeaderInfo;
  presetId: string;
  level?: 1 | 2;
  level1Complete?: boolean;
  level2?: Level2State;
  phase: number;
  gameOver: boolean;
  gameOverReason: string | null;
  gameOverAt: string | null;
  gameOverAtTick: number | null;
  gameOverCauses: string[];
  gameOverAdvice: string | null;
  lastRisk: number;
  riskTicks: number;
  zeroTreasuryTicks: number;
  zeroMoraleTicks: number;
  debtOverTicks: number;
  admin: number;
  adminPerTick: number;
  adminUnlocked: boolean;
  agenciesUnlocked: {
    revenue: boolean;
    inspection: boolean;
    promotion: boolean;
  };
  treatiesUnlocked: boolean;
  industryLeaderId: string | null;
  diversifiedIndustries: string[];
  premiumTokens: number;
  iapFlags: {
    autoBalanceUnlocked: boolean;
    reportClarityUnlocked: boolean;
    offlineCapBonusHours: number;
  };
  offlineRewardMultiplier: number;
  emergencyPlanUnlocked: boolean;
  emergencyPlanCooldownUntil: number;
  unlocks?: {
    planAnticrisisUnlocked?: boolean;
  };
  cooldowns?: {
    planAnticrisisUntilTick?: number;
  };
  remoteConfigOverrides?: Record<string, unknown>;
  tickCount: number;
  lastTickAt: number;
  updatedAt: string;
  maxPhaseReached: number;
  treasury: number;
  gdp: number;
  baselineGdp: number;
  growthPct: number;
  happiness: number;
  stability: number;
  institutionalTrust: number;
  corruption: number;
  resources: number;
  reputation: number;
  debt: number;
  employment: number;
  energy: number;
  innovation: number;
  inequality: number;
  environmentalImpact: number;
  tourismIndex: number;
  tourismCapacity: number;
  tourismPressure: number;
  taxLevel?: TaxLevel;
  taxRatePct: number;
  budget: {
    industryPct: number;
    welfarePct: number;
    securityDiplomacyPct: number;
  };
  projects: Record<string, ProjectState>;
  eventCooldown: number;
  eventHistory: Record<string, number>;
  pendingEventId: string | null;
  pendingEventDelay: number;
  activeEventId: string | null;
  decreeSlots: DecreeSlot[];
  news: NewsItem[];
  notifiedStartableProjectIds?: string[];
}

export type InflationRegime = "DEFLATION" | "STABLE" | "HIGH" | "HYPER";

export interface Level2IndustryAttributes {
  capex: number;
  opex: number;
  employment: number;
  fiscalIncome: number;
  exports: number;
  envImpact: number;
  energyDemand: number;
  waterDemand: number;
  humanCapitalReq: number;
  risk: number;
  politicalInfluence: number;
}

export interface Level2IndustryConfig {
  id: string;
  name: string;
  group: string;
  description: string;
  tags: string[];
  attributes: Level2IndustryAttributes;
  modifiers: {
    incomeMult: number;
    baseGrowthAddPct: number;
    inflationPressureAdd: number;
    pollutionAdd: number;
    synergyTags: string[];
  };
  unlock: {
    minPhaseL2: number;
    requiresProjectsL2: string[];
  };
  shortImpactText: string;
}

export interface Level2ProjectConfig {
  id: string;
  name: string;
  description: string;
  phase: number;
  cost: number;
  durationTicks: number;
  impactScore: number;
  requirements?: {
    minPhaseL2?: number;
    requiresBaseIndustryId?: string;
    requiresIndustries?: string[];
    requiresAdvisorIds?: string[];
    requiresProjects?: string[];
    requiresCentralBankAction?: boolean;
  };
  effects: Record<string, number>;
  tags?: string[];
  recommendedBy?: string[];
}

export interface Level2ProjectState {
  status: "locked" | "available" | "in_progress" | "completed";
  progress: number;
}

export interface Level2EventOption {
  optionId: string;
  label: string;
  hint?: string;
}

export interface Level2EventPending {
  instanceId: string;
  eventId: string;
  title: string;
  body: string;
  createdTick: number;
  options: Level2EventOption[];
}

export interface Level2EventHistoryItem {
  instanceId: string;
  eventId: string;
  title: string;
  chosenOptionId: string;
  createdTick: number;
  resolvedTick: number;
  outcomeSummary: string;
}

export interface Level2EventsState {
  pending: Level2EventPending | null;
  nextCheckTick: number;
  history: Level2EventHistoryItem[];
}

export interface Level2DecreeHistoryItem {
  decreeId: string;
  enactedTick: number;
  summary: string;
}

export interface Level2DecreesState {
  cooldownUntilById: Record<string, number>;
  history: Level2DecreeHistoryItem[];
}

export interface Level2State {
  phase: number;
  complete: boolean;
  gameOver: boolean;
  gameOverReason?: string | null;
  elections: { cooldownUntilTick: number };
  industry?: {
    selectedIds: string[];
    maxIndustries: number;
  };
  macro: {
    inflationPct: number;
    regime: InflationRegime;
    centralBank: {
      cooldownUntilTick: number;
      effectUntilTick?: number;
      growthEffectPct?: number;
      lastActionTick?: number;
    };
  };
  advisors: string[];
  industries: {
    chosenBaseIndustryId: string | null;
    activeIndustries: string[];
  };
  projects: Record<string, Level2ProjectState>;
  events?: Level2EventsState;
  decrees?: Level2DecreesState;
}
