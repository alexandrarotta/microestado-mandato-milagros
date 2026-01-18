import { create } from "zustand";
import { fetchConfig } from "../api/config";
import { logoutUser } from "../api/auth";
import { fetchCountry, createCountry } from "../api/country";
import { fetchMe } from "../api/me";
import { ApiError } from "../api/client";
import {
  applyDecreeActivation,
  applyEmergencyPlan,
  applyEventOption,
  applyExternalEffects,
  getMaxIndustriesByPhase,
  applyProjectBoost,
  applyProjectStart,
  applyTick
} from "./engine";
import {
  applyLevel2Tick,
  buildLevel2ProjectsState,
  meetsLevel2ProjectRequirements
} from "./level2Engine";
import type {
  ConfigPayload,
  CountryInfo,
  GameSave,
  LeaderInfo,
  Level2IndustryConfig,
  Level2ProjectConfig,
  ProjectConfig,
  TaxLevel,
  UserProfile
} from "../types";
import { clamp } from "../utils/clamp";
import { makeId } from "../utils/random";
import {
  clearAllSaves,
  clearLegacySave,
  clearToken,
  loadSave,
  loadToken,
  saveLocal,
  saveToken
} from "../utils/storage";
import { formatRoleTitle } from "../utils/roleLabels";
import { formatFormalName } from "../utils/stateTypes";
import industriesLevel2 from "../data/industriesLevel2.json";
import projectsLevel2 from "../data/projectsLevel2.json";

interface GameStore {
  config: ConfigPayload | null;
  configStatus: "idle" | "loading" | "ready" | "error";
  configError: string | null;
  token: string | null;
  user: UserProfile | null;
  authStatus: "anonymous" | "loading" | "authenticated";
  save: GameSave | null;
  countryDraft: CountryInfo;
  leaderDraft: LeaderInfo;
  presetDraft: string;
  settingsOpen: boolean;
  detailsOpen: boolean;
  lastError: string | null;
  setSave: (save: GameSave | null) => void;
  loadConfig: () => Promise<void>;
  hydrateAuth: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
  setCountryDraft: (payload: Partial<CountryInfo>) => void;
  setLeaderDraft: (payload: Partial<LeaderInfo>) => void;
  setPresetDraft: (presetId: string) => void;
  startNewGame: () => void;
  setTaxRatePct: (value: number) => void;
  updateBudget: (key: "industryPct" | "welfarePct" | "securityDiplomacyPct", value: number) => void;
  autoBalanceBudget: () => void;
  setIndustryLeader: (industryId: string) => void;
  addDiversifiedIndustry: (industryId: string) => void;
  startProject: (projectId: string) => void;
  speedProject: (projectId: string) => void;
  resolveEvent: (eventId: string, optionId: string) => void;
  mitigateEvent: () => void;
  dismissEvent: () => void;
  setDecreeSlot: (slotId: number, decreeId: string | null) => void;
  activateDecree: (slotId: number) => void;
  activateEmergencyPlan: () => void;
  purchaseOffer: (offerId: string) => void;
  redeemRewarded: (rewardedId: string) => void;
  unlockAutoBalance: () => void;
  unlockReportClarity: () => void;
  boostOfflineCap: () => void;
  purchaseCarbonCredits: () => void;
  purchaseTokenWithTreasury: () => void;
  setRemoteConfigOverrides: (overrides: Record<string, unknown>) => void;
  rescueTreasury: () => void;
  resetSave: () => GameSave | null;
  tick: (suppressEvents?: boolean) => void;
  applyOfflineTicks: (ticks: number) => void;
  tickLevel2: () => void;
  setLevel2Advisors: (advisorIds: string[]) => void;
  setLevel2BaseIndustry: (industryId: string) => void;
  activateLevel2Industry: (industryId: string) => void;
  startLevel2Project: (projectId: string) => void;
  runCentralBankAction: (action: "RAISE" | "LOWER" | "INTERVENE") => void;
  toggleSettings: (open?: boolean) => void;
  toggleDetails: (open?: boolean) => void;
}

export const TOKEN_TREASURY_COST = 10000;
export const CARBON_CREDITS_COST = 2;
export const CARBON_CREDITS_REDUCTION = 50;
export const CARBON_MARKET_NEWS_TEXT = `Mercado de carbono: compraste creditos (-${CARBON_CREDITS_REDUCTION} huella, -${CARBON_CREDITS_COST} tokens).`;
const LEVEL2_INDUSTRIES = industriesLevel2 as Level2IndustryConfig[];
const LEVEL2_PROJECTS = projectsLevel2 as Level2ProjectConfig[];
const LEVEL2_CAPEX_COST = 15;
const LEVEL2_CENTRAL_BANK_COOLDOWN = 30;
const LEVEL2_CENTRAL_BANK_EFFECT_TICKS = 120;
const LEVEL2_INTERVENTION_COST = 80;

const TAX_LEVEL_TO_PCT: Record<TaxLevel, number> = {
  LOW: 20,
  MED: 50,
  HIGH: 85
};

function resolveTaxRatePct(level?: TaxLevel, value?: number) {
  if (typeof value === "number") return clamp(value, 0, 100);
  if (!level) return TAX_LEVEL_TO_PCT.MED;
  return TAX_LEVEL_TO_PCT[level] ?? TAX_LEVEL_TO_PCT.MED;
}

function cloneSave(save: GameSave): GameSave {
  return {
    ...save,
    level: save.level ?? 1,
    level1Complete: save.level1Complete ?? false,
    level2: save.level2
      ? {
          ...save.level2,
          elections: { ...save.level2.elections },
          events: save.level2.events
            ? {
                ...save.level2.events,
                pending: save.level2.events.pending
                  ? {
                      ...save.level2.events.pending,
                      options: [...save.level2.events.pending.options]
                    }
                  : null,
                history: (save.level2.events.history ?? []).map((item) => ({ ...item }))
              }
            : undefined,
          decrees: save.level2.decrees
            ? {
                cooldownUntilById: { ...save.level2.decrees.cooldownUntilById },
                history: (save.level2.decrees.history ?? []).map((item) => ({ ...item }))
              }
            : undefined,
          macro: {
            ...save.level2.macro,
            centralBank: { ...save.level2.macro.centralBank }
          },
          advisors: [...save.level2.advisors],
          industries: {
            ...save.level2.industries,
            activeIndustries: [...save.level2.industries.activeIndustries]
          },
          projects: Object.fromEntries(
            Object.entries(save.level2.projects).map(([key, value]) => [
              key,
              { ...value }
            ])
          )
        }
      : undefined,
    country: { ...save.country },
    leader: { ...save.leader },
    budget: { ...save.budget },
    agenciesUnlocked: { ...save.agenciesUnlocked },
    diversifiedIndustries: [...save.diversifiedIndustries],
    iapFlags: { ...save.iapFlags },
    remoteConfigOverrides: save.remoteConfigOverrides
      ? { ...save.remoteConfigOverrides }
      : undefined,
    unlocks: save.unlocks ? { ...save.unlocks } : undefined,
    cooldowns: save.cooldowns ? { ...save.cooldowns } : undefined,
    projects: Object.fromEntries(
      Object.entries(save.projects).map(([key, value]) => [key, { ...value }])
    ),
    eventHistory: { ...(save.eventHistory ?? {}) },
    pendingEventId: save.pendingEventId ?? null,
    pendingEventDelay: save.pendingEventDelay ?? 0,
    decreeSlots: save.decreeSlots.map((slot) => ({ ...slot })),
    news: [...save.news],
    notifiedStartableProjectIds: [...(save.notifiedStartableProjectIds ?? [])]
  };
}

function addLevel2News(save: GameSave, text: string) {
  save.news = save.news ?? [];
  save.news.unshift({
    id: makeId("news"),
    text,
    createdAt: Date.now(),
    type: "SYSTEM",
    severity: "OK"
  });
  if (save.news.length > 50) {
    save.news = save.news.slice(0, 50);
  }
}

function ensureLevel2State(save: GameSave) {
  if (!save.level2) {
    save.level2 = {
      phase: 1,
      complete: false,
      gameOver: false,
      elections: { cooldownUntilTick: 0 },
      events: { pending: null, nextCheckTick: 0, history: [] },
      decrees: { cooldownUntilById: {}, history: [] },
      macro: {
        inflationPct: 0.2,
        regime: "STABLE",
        centralBank: { cooldownUntilTick: 0 }
      },
      advisors: [],
      industries: { chosenBaseIndustryId: null, activeIndustries: [] },
      projects: {}
    };
  }
  if (!save.level2.events) {
    save.level2.events = { pending: null, nextCheckTick: 0, history: [] };
  } else {
    save.level2.events.pending = save.level2.events.pending ?? null;
    save.level2.events.nextCheckTick = save.level2.events.nextCheckTick ?? 0;
    save.level2.events.history = save.level2.events.history ?? [];
  }
  if (!save.level2.decrees) {
    save.level2.decrees = { cooldownUntilById: {}, history: [] };
  } else {
    save.level2.decrees.cooldownUntilById =
      save.level2.decrees.cooldownUntilById ?? {};
    save.level2.decrees.history = save.level2.decrees.history ?? [];
  }
  if (!save.level2.projects || Object.keys(save.level2.projects).length === 0) {
    save.level2.projects = buildLevel2ProjectsState(LEVEL2_PROJECTS, save);
  }
  return save.level2;
}

function isLevel2IndustryUnlocked(
  industry: Level2IndustryConfig,
  save: GameSave
) {
  if (!save.level2) return false;
  if (save.level2.phase < industry.unlock.minPhaseL2) return false;
  if (industry.unlock.requiresProjectsL2?.length) {
    const completed = industry.unlock.requiresProjectsL2.every(
      (id) => save.level2?.projects[id]?.status === "completed"
    );
    if (!completed) return false;
  }
  return true;
}

function meetsProjectRequirements(project: ProjectConfig, save: GameSave) {
  const req = project.requirements || {};
  if (save.phase < project.phase) return false;
  if (req.minPhase && save.phase < req.minPhase) return false;
  if (req.minGdp && save.gdp < req.minGdp) return false;
  if (req.minStability && save.stability < req.minStability) return false;
  if (req.minInstitutionalTrust && save.institutionalTrust < req.minInstitutionalTrust)
    return false;
  if (req.minReputation && save.reputation < req.minReputation) return false;
  if (req.minInnovation && save.innovation < req.minInnovation) return false;
  if (req.minResources && save.resources < req.minResources) return false;
  if (req.minHappiness && save.happiness < req.minHappiness) return false;
  return true;
}

function buildProjectState(config: ConfigPayload, save: GameSave) {
  const projects: GameSave["projects"] = {};
  config.projects.forEach((project) => {
    const available = meetsProjectRequirements(project, save);
    projects[project.id] = { status: available ? "available" : "locked", progress: 0 };
  });
  return projects;
}

function buildNewSave(
  config: ConfigPayload,
  countryDraft: CountryInfo,
  leaderDraft: LeaderInfo,
  presetDraft: string,
  resolvedRoleId: string
) {
  const preset = config.policyPresets.find((item) => item.id === presetDraft);
  const base = config.economy.startingState;
  const now = Date.now();
  const trimmedCountry = countryDraft.baseName.trim();
  const trimmedLeader = leaderDraft.name.trim();
  const formalName = formatFormalName(
    trimmedCountry,
    countryDraft.stateTypeId,
    config.stateTypes,
    countryDraft.stateTypeOtherText
  );

  const save: GameSave = {
    country: {
      ...countryDraft,
      baseName: trimmedCountry,
      formalName: formalName || trimmedCountry
    },
    leader: {
      ...leaderDraft,
      name: trimmedLeader,
      roleId: resolvedRoleId,
      roleSelectionMode: leaderDraft.roleSelectionMode ?? "MANUAL"
    },
    presetId: presetDraft,
    level: 1,
    level1Complete: false,
    version: config.version,
    phase: 1,
    gameOver: false,
    gameOverReason: null,
    gameOverAt: null,
    gameOverAtTick: null,
    gameOverCauses: [],
    gameOverAdvice: null,
    lastRisk: 0,
    riskTicks: 0,
    zeroTreasuryTicks: 0,
    zeroMoraleTicks: 0,
    debtOverTicks: 0,
    admin: 0,
    adminPerTick: 0,
    adminUnlocked: false,
    agenciesUnlocked: { revenue: false, inspection: false, promotion: false },
    treatiesUnlocked: false,
    industryLeaderId: null,
    diversifiedIndustries: [],
    premiumTokens: 0,
    iapFlags: {
      autoBalanceUnlocked: false,
      reportClarityUnlocked: false,
      offlineCapBonusHours: 0
    },
    offlineRewardMultiplier: 0,
    emergencyPlanUnlocked: false,
    emergencyPlanCooldownUntil: 0,
    unlocks: {
      planAnticrisisUnlocked: false
    },
    cooldowns: {
      planAnticrisisUntilTick: 0
    },
    remoteConfigOverrides: {},
    tickCount: 0,
    lastTickAt: now,
    updatedAt: new Date(now).toISOString(),
    maxPhaseReached: 1,
    treasury: base.treasury,
    gdp: base.gdp,
    baselineGdp: base.gdp,
    growthPct: base.growthPct,
    happiness: base.happiness,
    stability: base.stability,
    institutionalTrust: base.institutionalTrust,
    corruption: base.corruption,
    resources: base.resources,
    reputation: base.reputation,
    debt: base.debt,
    employment: base.employment,
    energy: base.energy,
    innovation: base.innovation,
    inequality: base.inequality,
    environmentalImpact: base.environmentalImpact,
    tourismIndex: base.tourismIndex,
    tourismCapacity: base.tourismCapacity,
    tourismPressure: base.tourismPressure,
    taxLevel: base.taxLevel,
    taxRatePct: resolveTaxRatePct(base.taxLevel, base.taxRatePct),
    budget: { ...base.budget },
    projects: {},
    eventCooldown: Math.floor(config.economy.eventCooldownTicks / 2),
    eventHistory: {},
    pendingEventId: null,
    pendingEventDelay: 0,
    activeEventId: null,
    decreeSlots: [
      { slotId: 1, decreeId: null, activeUntil: 0, cooldownUntil: 0 },
      { slotId: 2, decreeId: null, activeUntil: 0, cooldownUntil: 0 }
    ],
    news: []
  };

  if (preset) {
    save.budget = { ...preset.budget };
    Object.entries(preset.adjustments).forEach(([key, value]) => {
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
    });
  }

  save.treasury = Math.max(save.treasury, 80);
  save.gdp = Math.max(save.gdp, 300);
  save.happiness = clamp(save.happiness, 30, 80);
  save.stability = clamp(save.stability, 30, 80);
  save.institutionalTrust = clamp(save.institutionalTrust, 30, 80);
  save.corruption = clamp(save.corruption, 10, 70);
  save.resources = clamp(save.resources, 20, 200);
  save.reputation = clamp(save.reputation, 20, 80);
  save.debt = Math.max(0, save.debt);
  save.employment = clamp(save.employment, 30, 80);
  save.energy = clamp(save.energy, 30, 80);
  save.innovation = clamp(save.innovation, 30, 80);
  save.inequality = clamp(save.inequality, 30, 80);
  save.environmentalImpact = clamp(save.environmentalImpact, 20, 80);
  save.admin = Math.max(0, save.admin);
  save.adminPerTick = Math.max(0, save.adminPerTick);
  save.tourismIndex = clamp(save.tourismIndex, 0, 100);
  save.tourismCapacity = clamp(save.tourismCapacity, 0, 100);
  save.tourismPressure = clamp(save.tourismPressure, 0, 100);
  save.baselineGdp = Math.max(1, save.gdp);

  save.projects = buildProjectState(config, save);
  save.news = [
    {
      id: makeId("news"),
      text: `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
        save.leader.name
      } inaugura ${save.country.formalName} con un discurso breve.`,
      createdAt: now,
      type: "SYSTEM",
      severity: "OK"
    }
  ];
  save.notifiedStartableProjectIds = [];

  return save;
}

function adjustBudget(
  budget: GameSave["budget"],
  key: "industryPct" | "welfarePct" | "securityDiplomacyPct",
  value: number
) {
  const next = { ...budget, [key]: clamp(value, 0, 100) };
  const keys = ["industryPct", "welfarePct", "securityDiplomacyPct"] as const;
  const others = keys.filter((item) => item !== key);
  const remainder = clamp(100 - next[key], 0, 100);
  const currentOthersTotal = others.reduce((sum, item) => sum + budget[item], 0);

  if (currentOthersTotal <= 0) {
    next[others[0]] = remainder;
    next[others[1]] = 0;
  } else {
    const ratio = remainder / currentOthersTotal;
    const rawFirst = budget[others[0]] * ratio;
    const first = clamp(Math.round(rawFirst), 0, remainder);
    next[others[0]] = first;
    next[others[1]] = clamp(remainder - first, 0, 100);
  }

  return next;
}

export const useGameStore = create<GameStore>((set, get) => ({
  config: null,
  configStatus: "idle",
  configError: null,
  token: loadToken(),
  user: null,
  authStatus: loadToken() ? "loading" : "anonymous",
  save: null,
  countryDraft: {
    baseName: "",
    stateTypeId: "NONE",
    stateTypeOtherText: "",
    formalName: "",
    geography: "urban",
    motto: "",
    demonym: ""
  },
  leaderDraft: {
    name: "",
    gender: "PREFER_NOT_SAY",
    roleId: "PRESIDENT",
    roleSelectionMode: "MANUAL",
    trait: "",
    tagline: ""
  },
  presetDraft: "GROWTH",
  settingsOpen: false,
  detailsOpen: false,
  lastError: null,
  loadConfig: async () => {
    set({ configStatus: "loading", configError: null });
    try {
      const config = await fetchConfig();
      set({ config, configStatus: "ready" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar la config";
      set({ configStatus: "error", configError: message });
    }
  },
  hydrateAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ user: null, authStatus: "anonymous", save: null });
      return;
    }
    set({ authStatus: "loading", user: null, save: null });
    try {
      const me = await fetchMe(token);
      clearLegacySave();
      const localSave = loadSave(me.id);
      let countryDraft = get().countryDraft;
      try {
        const response = await fetchCountry(token);
        countryDraft = { ...countryDraft, ...response.country };
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error;
        }
      }
      set({
        user: me,
        authStatus: "authenticated",
        save: localSave ?? null,
        countryDraft
      });
    } catch {
      clearToken();
      clearAllSaves();
      set({ token: null, user: null, authStatus: "anonymous", save: null });
    }
  },
  setSave: (save) => set({ save }),
  setUser: (user) => set({ user, authStatus: user ? "authenticated" : "anonymous" }),
  setToken: (token) => {
    saveToken(token);
    set({ token, authStatus: "loading", user: null, save: null });
  },
  logout: async () => {
    try {
      await logoutUser();
    } catch {
      // Best-effort logout.
    }
    clearToken();
    clearAllSaves();
    clearLegacySave();
    sessionStorage.clear();
    set({
      token: null,
      user: null,
      authStatus: "anonymous",
      save: null,
      countryDraft: {
        baseName: "",
        stateTypeId: "NONE",
        stateTypeOtherText: "",
        formalName: "",
        geography: "urban",
        motto: "",
        demonym: ""
      },
      leaderDraft: {
        name: "",
        gender: "PREFER_NOT_SAY",
        roleId: "PRESIDENT",
        roleSelectionMode: "MANUAL",
        trait: "",
        tagline: ""
      },
      presetDraft: "GROWTH"
    });
  },
  setCountryDraft: (payload) => {
    set((state) => ({ countryDraft: { ...state.countryDraft, ...payload } }));
  },
  setLeaderDraft: (payload) => {
    set((state) => ({ leaderDraft: { ...state.leaderDraft, ...payload } }));
  },
  setPresetDraft: (presetId) => set({ presetDraft: presetId }),
  startNewGame: () => {
    const { config, countryDraft, leaderDraft, presetDraft, token } = get();
    if (!config) {
      set({ lastError: "Config no disponible" });
      return;
    }

    let resolvedRoleId = leaderDraft.roleId;
    if (leaderDraft.roleSelectionMode === "RANDOM") {
      if (!resolvedRoleId || resolvedRoleId === "RANDOM") {
        const weights = config.remoteConfigKeys.defaults.mandate_role_weights;
        const entries = config.roles.map((role) => ({
          id: role.id,
          weight: weights[role.id] ?? 1
        }));
        const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * (total || entries.length);
        const picked =
          entries.find((entry) => {
            roll -= total ? entry.weight : 1;
            return roll <= 0;
          }) ?? entries[0];
        resolvedRoleId = picked?.id ?? "PRESIDENT";
      }
    }
    const save = buildNewSave(
      config,
      countryDraft,
      leaderDraft,
      presetDraft,
      resolvedRoleId
    );

    set({ save, lastError: null });
    const userId = get().user?.id;
    if (userId) {
      saveLocal(save, userId);
    }
    if (token) {
      void createCountry(token, save.country).catch(() => {
        // Best-effort; country will be stored on next successful save.
      });
    }
  },
  setTaxRatePct: (value) => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.taxRatePct = clamp(value, 0, 100);
      return { save };
    });
  },
  updateBudget: (key, value) => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.budget = adjustBudget(save.budget, key, value);
      return { save };
    });
  },
  autoBalanceBudget: () => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.budget = {
        industryPct: 34,
        welfarePct: 33,
        securityDiplomacyPct: 33
      };
      return { save };
    });
  },
  setIndustryLeader: (industryId) => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.industryLeaderId = industryId;
      save.diversifiedIndustries = save.diversifiedIndustries.filter(
        (id) => id !== industryId
      );
      return { save };
    });
  },
  addDiversifiedIndustry: (industryId) => {
    set((state) => {
      if (!state.save) return state;
      const unlockedPhase = state.save.maxPhaseReached ?? state.save.phase;
      const maxIndustries = getMaxIndustriesByPhase(unlockedPhase);
      const maxDiversified = Math.max(0, maxIndustries - 1);
      if (unlockedPhase < 2 || maxDiversified <= 0) return state;
      const save = cloneSave(state.save);
      if (!save.industryLeaderId) {
        save.industryLeaderId = industryId;
        return { save };
      }
      if (
        save.industryLeaderId === industryId ||
        save.diversifiedIndustries.includes(industryId)
      ) {
        return { save };
      }
      if (save.diversifiedIndustries.length >= maxDiversified) {
        return { save };
      }
      save.diversifiedIndustries = [...save.diversifiedIndustries, industryId];
      return { save };
    });
  },
  startProject: (projectId) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      const project = state.config.projects.find((item) => item.id === projectId);
      if (!project) return state;
      applyProjectStart(save, project, state.config);
      return { save };
    });
  },
  speedProject: (projectId) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      const cost = state.config.iapConfig.actions.projectSpeedCost;
      if (save.premiumTokens < cost) return state;
      const project = state.config.projects.find((item) => item.id === projectId);
      if (!project) return state;
      const ok = applyProjectBoost(save, project, state.config);
      if (!ok) return state;
      save.premiumTokens -= cost;
      return { save };
    });
  },
  resolveEvent: (eventId, optionId) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      applyEventOption(save, state.config, eventId, optionId);
      return { save };
    });
  },
  mitigateEvent: () => {
    set((state) => {
      if (!state.save || !state.config) return state;
      if (!state.save.activeEventId) return state;
      const save = cloneSave(state.save);
      const cost = state.config.iapConfig.actions.eventMitigationCost;
      if (save.premiumTokens < cost) return state;
      save.premiumTokens -= cost;
      applyExternalEffects(save, { stability: 1, institutionalTrust: 1 });
      save.activeEventId = null;
      save.news.unshift({
        id: makeId("news"),
        text: `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
          save.leader.name
        } mitiga el evento con un decreto especial.`,
        createdAt: Date.now()
      });
      return { save };
    });
  },
  dismissEvent: () => {
    set((state) => {
      if (!state.save) return state;
      if (!state.save.activeEventId) return state;
      const save = cloneSave(state.save);
      save.activeEventId = null;
      save.news.unshift({
        id: makeId("news"),
        text: `El gabinete de ${save.leader.name} posterga la decision del evento.`,
        createdAt: Date.now()
      });
      return { save };
    });
  },
  setDecreeSlot: (slotId, decreeId) => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.decreeSlots = save.decreeSlots.map((slot) => {
        if (slot.slotId === slotId) {
          return { ...slot, decreeId };
        }
        if (decreeId && slot.decreeId === decreeId) {
          return { ...slot, decreeId: null };
        }
        return slot;
      });
      return { save };
    });
  },
  activateDecree: (slotId) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      applyDecreeActivation(save, state.config, slotId);
      return { save };
    });
  },
  activateEmergencyPlan: () => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      applyEmergencyPlan(save, state.config);
      return { save };
    });
  },
  purchaseOffer: (offerId) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const offer = state.config.iapConfig.offers.find((item) => item.id === offerId);
      if (!offer) return state;
      const save = cloneSave(state.save);
      save.premiumTokens += offer.tokens;
      return { save };
    });
  },
  redeemRewarded: (rewardedId) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const rewarded = state.config.iapConfig.rewardedAds.find(
        (item) => item.id === rewardedId
      );
      if (!rewarded) return state;
      const save = cloneSave(state.save);
      applyExternalEffects(save, rewarded.effect);
      save.news.unshift({
        id: makeId("news"),
        text: `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
          save.leader.name
        } activa un incentivo rapido.`,
        createdAt: Date.now()
      });
      return { save };
    });
  },
  unlockAutoBalance: () => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      if (save.iapFlags.autoBalanceUnlocked) return state;
      const cost = state.config.iapConfig.actions.autoBalanceUnlockCost;
      if (save.premiumTokens < cost) return state;
      save.premiumTokens -= cost;
      save.iapFlags.autoBalanceUnlocked = true;
      return { save };
    });
  },
  unlockReportClarity: () => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      if (save.iapFlags.reportClarityUnlocked) return state;
      const cost = state.config.iapConfig.actions.reportClarityUnlockCost;
      if (save.premiumTokens < cost) return state;
      save.premiumTokens -= cost;
      save.iapFlags.reportClarityUnlocked = true;
      return { save };
    });
  },
  boostOfflineCap: () => {
    set((state) => {
      if (!state.save || !state.config) return state;
      const save = cloneSave(state.save);
      const cost = state.config.iapConfig.actions.offlineCapBoostCost;
      if (save.premiumTokens < cost) return state;
      save.premiumTokens -= cost;
      save.iapFlags.offlineCapBonusHours +=
        state.config.iapConfig.actions.offlineCapBoostHours;
      return { save };
    });
  },
  purchaseCarbonCredits: () => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      if (save.premiumTokens < CARBON_CREDITS_COST) return state;
      save.premiumTokens = Math.max(
        0,
        save.premiumTokens - CARBON_CREDITS_COST
      );
      applyExternalEffects(save, {
        environmentalImpact: -CARBON_CREDITS_REDUCTION
      });
      save.news.unshift({
        id: makeId("news"),
        text: CARBON_MARKET_NEWS_TEXT,
        createdAt: Date.now(),
        type: "SYSTEM"
      });
      return { save };
    });
  },
  purchaseTokenWithTreasury: () => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      if (save.treasury < TOKEN_TREASURY_COST) return state;
      save.treasury = clamp(
        save.treasury - TOKEN_TREASURY_COST,
        0,
        Number.POSITIVE_INFINITY
      );
      save.premiumTokens = clamp(
        save.premiumTokens + 1,
        0,
        Number.POSITIVE_INFINITY
      );
      save.news.unshift({
        id: makeId("news"),
        text: `${formatRoleTitle(save.leader.roleId, save.leader.gender)} ${
          save.leader.name
        } canjea tesoro por 1 token.`,
        createdAt: Date.now(),
        type: "SYSTEM"
      });
      return { save };
    });
  },
  setRemoteConfigOverrides: (overrides) => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.remoteConfigOverrides = { ...overrides };
      return { save };
    });
  },
  rescueTreasury: () => {
    set((state) => {
      if (!state.save) return state;
      const save = cloneSave(state.save);
      save.treasury += 200;
      save.news.unshift({
        id: makeId("news"),
        text: "Rescate rapido: se inyecta tesoro de emergencia.",
        createdAt: Date.now(),
        type: "SYSTEM",
        severity: "WARN"
      });
      return { save };
    });
  },
  resetSave: () => {
    const { config, save, countryDraft, leaderDraft, presetDraft } = get();
    if (!config) {
      set({ lastError: "Config no disponible" });
      return null;
    }
    const baseCountry = save?.country ?? countryDraft;
    const baseLeader = save?.leader ?? leaderDraft;
    const basePreset = save?.presetId ?? presetDraft;
    const resolvedRoleId = baseLeader.roleId || "PRESIDENT";
    const nextSave = buildNewSave(
      config,
      baseCountry,
      baseLeader,
      basePreset,
      resolvedRoleId
    );
    set({ save: nextSave, lastError: null });
    const userId = get().user?.id;
    if (userId) {
      saveLocal(nextSave, userId);
    }
    return nextSave;
  },
  tick: (suppressEvents = false) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      if (state.save.level === 2) return state;
      if (state.save.gameOver) return state;
      const save = cloneSave(state.save);
      applyTick(save, state.config, { suppressEvents });
      return { save };
    });
  },
  applyOfflineTicks: (ticks) => {
    set((state) => {
      if (!state.save || !state.config) return state;
      if (state.save.level === 2) return state;
      if (state.save.gameOver) return state;
      const save = cloneSave(state.save);
      for (let i = 0; i < ticks; i += 1) {
        applyTick(save, state.config, { suppressEvents: true });
        if (save.gameOver) break;
      }
      return { save };
    });
  },
  tickLevel2: () => {
    set((state) => {
      if (!state.save || !state.config) return state;
      if (state.save.level !== 2) return state;
      if (state.save.level2?.gameOver) return state;
      const save = cloneSave(state.save);
      ensureLevel2State(save);
      applyLevel2Tick(save, state.config, LEVEL2_INDUSTRIES, LEVEL2_PROJECTS);
      return { save };
    });
  },
  setLevel2Advisors: (advisorIds) => {
    set((state) => {
      if (!state.save) return state;
      if (state.save.level !== 2) return state;
      const save = cloneSave(state.save);
      const level2 = ensureLevel2State(save);
      level2.advisors = Array.from(new Set(advisorIds));
      return { save };
    });
  },
  setLevel2BaseIndustry: (industryId) => {
    set((state) => {
      if (!state.save) return state;
      if (state.save.level !== 2) return state;
      const save = cloneSave(state.save);
      const level2 = ensureLevel2State(save);
      if (level2.industries.chosenBaseIndustryId) return state;
      const industry = LEVEL2_INDUSTRIES.find((item) => item.id === industryId);
      if (!industry) return state;
      if (!isLevel2IndustryUnlocked(industry, save)) return state;
      const capexCost = industry.attributes.capex * LEVEL2_CAPEX_COST;
      if (save.treasury < capexCost) return state;
      save.treasury -= capexCost;
      level2.industries.chosenBaseIndustryId = industry.id;
      if (!level2.industries.activeIndustries.includes(industry.id)) {
        level2.industries.activeIndustries.push(industry.id);
      }
      addLevel2News(save, `Base industrial L2: ${industry.name}.`);
      return { save };
    });
  },
  activateLevel2Industry: (industryId) => {
    set((state) => {
      if (!state.save) return state;
      if (state.save.level !== 2) return state;
      const save = cloneSave(state.save);
      const level2 = ensureLevel2State(save);
      if (level2.industries.activeIndustries.includes(industryId)) {
        return state;
      }
      const industry = LEVEL2_INDUSTRIES.find((item) => item.id === industryId);
      if (!industry) return state;
      if (!isLevel2IndustryUnlocked(industry, save)) return state;
      const capexCost = industry.attributes.capex * LEVEL2_CAPEX_COST;
      if (save.treasury < capexCost) return state;
      save.treasury -= capexCost;
      level2.industries.activeIndustries.push(industry.id);
      addLevel2News(save, `Industria activada: ${industry.name}.`);
      return { save };
    });
  },
  startLevel2Project: (projectId) => {
    set((state) => {
      if (!state.save) return state;
      if (state.save.level !== 2) return state;
      const save = cloneSave(state.save);
      const level2 = ensureLevel2State(save);
      const project = LEVEL2_PROJECTS.find((item) => item.id === projectId);
      if (!project) return state;
      const stateProject = level2.projects[projectId];
      if (!stateProject || stateProject.status !== "available") return state;
      if (!meetsLevel2ProjectRequirements(project, save)) return state;
      if (save.treasury < project.cost) return state;
      save.treasury -= project.cost;
      stateProject.status = "in_progress";
      stateProject.progress = 0;
      addLevel2News(save, `Nivel 2 inicia: ${project.name}.`);
      return { save };
    });
  },
  runCentralBankAction: (action) => {
    set((state) => {
      if (!state.save) return state;
      if (state.save.level !== 2) return state;
      const save = cloneSave(state.save);
      const level2 = ensureLevel2State(save);
      const tickCount = save.tickCount ?? 0;
      if (tickCount < level2.macro.centralBank.cooldownUntilTick) {
        return state;
      }
      const macro = level2.macro;
      if (action === "RAISE") {
        macro.inflationPct = clamp(macro.inflationPct - 0.4, -1, 5);
        macro.centralBank.growthEffectPct = -0.4;
        macro.centralBank.effectUntilTick = tickCount + LEVEL2_CENTRAL_BANK_EFFECT_TICKS;
        addLevel2News(save, "Banco Central: sube tasa de referencia.");
      }
      if (action === "LOWER") {
        macro.inflationPct = clamp(macro.inflationPct + 0.3, -1, 5);
        macro.centralBank.growthEffectPct = 0.3;
        macro.centralBank.effectUntilTick = tickCount + LEVEL2_CENTRAL_BANK_EFFECT_TICKS;
        addLevel2News(save, "Banco Central: baja tasa de referencia.");
      }
      if (action === "INTERVENE") {
        save.treasury = Math.max(0, save.treasury - LEVEL2_INTERVENTION_COST);
        macro.inflationPct = clamp(macro.inflationPct - 0.6, -1, 5);
        macro.centralBank.growthEffectPct = 0;
        macro.centralBank.effectUntilTick = undefined;
        addLevel2News(save, "Banco Central: intervencion directa en mercado.");
      }
      macro.centralBank.cooldownUntilTick = tickCount + LEVEL2_CENTRAL_BANK_COOLDOWN;
      macro.centralBank.lastActionTick = tickCount;
      return { save };
    });
  },
  toggleSettings: (open) =>
    set((state) => ({ settingsOpen: open ?? !state.settingsOpen })),
  toggleDetails: (open) =>
    set((state) => ({ detailsOpen: open ?? !state.detailsOpen }))
}));
