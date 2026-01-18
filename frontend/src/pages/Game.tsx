import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { rescueGame, resetGame } from "../api/game";
import { fetchSave, putSave } from "../api/save";
import BudgetSliders from "../components/BudgetSliders";
import CarbonMarketCard from "../components/CarbonMarketCard";
import DecreePanel from "../components/DecreePanel";
import DetailsPanel from "../components/DetailsPanel";
import EventModal from "../components/EventModal";
import GameOverModal from "../components/GameOverModal";
import IndustryPicker from "../components/IndustryPicker";
import Modal from "../components/Modal";
import MetricsRail from "../components/MetricsRail";
import NewsFeed from "../components/NewsFeed";
import ProjectsPanel from "../components/ProjectsPanel";
import SettingsModal from "../components/SettingsModal";
import TaxSelector from "../components/TaxSelector";
import {
  CARBON_CREDITS_COST,
  CARBON_CREDITS_REDUCTION,
  CARBON_MARKET_NEWS_TEXT,
  useGameStore
} from "../store/gameStore";
import {
  ADMIN_UNLOCK_PROJECT_ID,
  getEffectiveProjectCost,
  getIndustryModifierById,
  getIndustrySoftRequirementMultiplier,
  isAdminUnlockedByProjects,
  isProjectStartable,
  getTaxRate,
  getTaxRatePct,
  getTourismMetrics
} from "../store/engine";
import { mergeSaves } from "../utils/merge";
import { mergeRemoteConfig } from "../utils/remoteConfig";
import { saveLocal } from "../utils/storage";
import { clamp } from "../utils/clamp";
import { getAdminHint } from "../utils/admin";
import { formatIndexPct, formatPct } from "../utils/formatPct";
import { getGdpIndex, resolveBaselineGdp } from "../utils/metrics";
import {
  getPlanAnticrisisCooldownUntil,
  getPlanAnticrisisUnlocked
} from "../utils/planAnticrisis";
import {
  ALERT_SCORE,
  getAdminAlert,
  getCorruptionAlert,
  getDebtAlert,
  getGrowthAlert,
  getHappinessAlert,
  getStabilityAlert,
  getTourismPressureAlert
} from "../utils/alerts";
import { formatRoleTitle } from "../utils/roleLabels";
import { formatFormalName } from "../utils/stateTypes";
import type { ConfigPayload, GameSave } from "../types";

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

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remaining
    .toString()
    .padStart(2, "0")}`;
}

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

function ensureSaveIntegrity(
  save: GameSave,
  configVersion: string,
  projectIds: string[],
  eventIds: string[],
  stateTypes: ConfigPayload["stateTypes"]
) {
  const resolvedPhase = save.phase ?? 1;
  const next = {
    ...save,
    phase: resolvedPhase,
    level: save.level ?? 1,
    level1Complete: save.level1Complete ?? resolvedPhase >= 4,
    projects: { ...save.projects },
    decreeSlots: save.decreeSlots?.length ? save.decreeSlots : [],
    updatedAt: save.updatedAt || new Date().toISOString(),
    admin: save.admin ?? 0,
    adminPerTick: save.adminPerTick ?? 0,
    adminUnlocked: save.adminUnlocked ?? false,
    agenciesUnlocked: save.agenciesUnlocked ?? {
      revenue: false,
      inspection: false,
      promotion: false
    },
    treatiesUnlocked: save.treatiesUnlocked ?? false,
    industryLeaderId: save.industryLeaderId ?? null,
    diversifiedIndustries: save.diversifiedIndustries ?? [],
    premiumTokens: save.premiumTokens ?? 0,
    iapFlags: save.iapFlags ?? {
      autoBalanceUnlocked: false,
      reportClarityUnlocked: false,
      offlineCapBonusHours: 0
    },
    gameOver: save.gameOver ?? false,
    gameOverReason: save.gameOverReason ?? null,
    gameOverAt: save.gameOverAt ?? null,
    gameOverAtTick: save.gameOverAtTick ?? null,
    gameOverCauses: save.gameOverCauses ?? [],
    gameOverAdvice: save.gameOverAdvice ?? null,
    lastRisk: save.lastRisk ?? 0,
    riskTicks: save.riskTicks ?? 0,
    zeroTreasuryTicks: save.zeroTreasuryTicks ?? 0,
    zeroMoraleTicks: save.zeroMoraleTicks ?? 0,
    debtOverTicks: save.debtOverTicks ?? 0,
    offlineRewardMultiplier: save.offlineRewardMultiplier ?? 0,
    emergencyPlanUnlocked: save.emergencyPlanUnlocked ?? false,
    emergencyPlanCooldownUntil: save.emergencyPlanCooldownUntil ?? 0,
    unlocks: save.unlocks ?? {},
    cooldowns: save.cooldowns ?? {},
    baselineGdp: resolveBaselineGdp(save.gdp, save.baselineGdp),
    taxRatePct: typeof save.taxRatePct === "number" ? save.taxRatePct : getTaxRatePct(save),
    tourismIndex: save.tourismIndex ?? 20,
    tourismCapacity: save.tourismCapacity ?? 20,
    tourismPressure: save.tourismPressure ?? 5,
    news: save.news ?? [],
    notifiedStartableProjectIds: save.notifiedStartableProjectIds ?? [],
    remoteConfigOverrides: save.remoteConfigOverrides ?? {},
    eventHistory: save.eventHistory ?? {},
    pendingEventId: save.pendingEventId ?? null,
    pendingEventDelay: save.pendingEventDelay ?? 0,
    maxPhaseReached: Math.max(save.maxPhaseReached ?? 0, save.phase ?? 1)
  };

  const legacyCountry = save.country as unknown as {
    name?: string;
    type?: string;
  };
  const legacyAdmin = (save as { adminCapacity?: number }).adminCapacity;

  const baseName = save.country.baseName ?? legacyCountry.name ?? "";
  const legacyType = legacyCountry.type;
  const stateTypeId =
    save.country.stateTypeId ??
    (legacyType ? "OTHER" : "NONE");
  const stateTypeOtherText =
    save.country.stateTypeOtherText ?? legacyType ?? "";
  const geography = save.country.geography ?? "urban";
  const formalName =
    save.country.formalName ||
    formatFormalName(baseName, stateTypeId, stateTypes, stateTypeOtherText) ||
    baseName;

  next.country = {
    baseName,
    stateTypeId,
    stateTypeOtherText,
    formalName,
    geography,
    motto: save.country.motto,
    demonym: save.country.demonym
  };

  if (save.admin === undefined && legacyAdmin !== undefined) {
    next.admin = legacyAdmin;
  }

  next.leader = {
    ...save.leader,
    roleSelectionMode: save.leader.roleSelectionMode ?? "MANUAL",
    trait: save.leader.trait ?? "",
    tagline: save.leader.tagline ?? ""
  };

  const planUnlockedFromTreasury = next.treasury <= 0;
  const planAnticrisisUnlocked =
    save.unlocks?.planAnticrisisUnlocked ?? planUnlockedFromTreasury;
  const planAnticrisisUntilTick =
    save.cooldowns?.planAnticrisisUntilTick ??
    save.emergencyPlanCooldownUntil ??
    0;
  next.unlocks = {
    ...(next.unlocks ?? {}),
    planAnticrisisUnlocked
  };
  next.cooldowns = {
    ...(next.cooldowns ?? {}),
    planAnticrisisUntilTick
  };
  next.emergencyPlanUnlocked = planAnticrisisUnlocked;
  next.emergencyPlanCooldownUntil = planAnticrisisUntilTick;

  projectIds.forEach((id) => {
    if (!next.projects[id]) {
      next.projects[id] = { status: "locked", progress: 0 };
    }
  });

  // Migration: Admin unlock is derived from Contraloria completion.
  next.adminUnlocked = isAdminUnlockedByProjects(next);

  if (next.activeEventId && !eventIds.includes(next.activeEventId)) {
    next.activeEventId = null;
  }
  if (next.pendingEventId && !eventIds.includes(next.pendingEventId)) {
    next.pendingEventId = null;
    next.pendingEventDelay = 0;
  }

  if (next.decreeSlots.length < 2) {
    next.decreeSlots = [
      { slotId: 1, decreeId: null, activeUntil: 0, cooldownUntil: 0 },
      { slotId: 2, decreeId: null, activeUntil: 0, cooldownUntil: 0 }
    ];
  }

  next.updatedAt = next.updatedAt || new Date().toISOString();
  next.version = configVersion;
  next.admin = Math.max(0, next.admin);
  next.adminPerTick = Math.max(0, next.adminPerTick);
  next.baselineGdp = resolveBaselineGdp(next.gdp, next.baselineGdp);
  next.taxRatePct = clamp(next.taxRatePct, 0, 100);
  next.tourismIndex = clamp(next.tourismIndex, 0, 100);
  next.tourismCapacity = clamp(next.tourismCapacity, 0, 100);
  next.tourismPressure = clamp(next.tourismPressure, 0, 100);
  return next;
}

export default function Game() {
  const navigate = useNavigate();
  const config = useGameStore((state) => state.config);
  const save = useGameStore((state) => state.save);
  const token = useGameStore((state) => state.token);
  const setSave = useGameStore((state) => state.setSave);
  const logout = useGameStore((state) => state.logout);
  const location = useLocation();
  const tick = useGameStore((state) => state.tick);
  const applyOfflineTicks = useGameStore((state) => state.applyOfflineTicks);
  const setTaxRatePct = useGameStore((state) => state.setTaxRatePct);
  const updateBudget = useGameStore((state) => state.updateBudget);
  const autoBalanceBudget = useGameStore((state) => state.autoBalanceBudget);
  const setIndustryLeader = useGameStore((state) => state.setIndustryLeader);
  const addDiversifiedIndustry = useGameStore((state) => state.addDiversifiedIndustry);
  const startProject = useGameStore((state) => state.startProject);
  const speedProject = useGameStore((state) => state.speedProject);
  const resolveEvent = useGameStore((state) => state.resolveEvent);
  const mitigateEvent = useGameStore((state) => state.mitigateEvent);
  const dismissEvent = useGameStore((state) => state.dismissEvent);
  const setDecreeSlot = useGameStore((state) => state.setDecreeSlot);
  const activateDecree = useGameStore((state) => state.activateDecree);
  const activateEmergencyPlan = useGameStore((state) => state.activateEmergencyPlan);
  const purchaseOffer = useGameStore((state) => state.purchaseOffer);
  const redeemRewarded = useGameStore((state) => state.redeemRewarded);
  const unlockAutoBalance = useGameStore((state) => state.unlockAutoBalance);
  const unlockReportClarity = useGameStore((state) => state.unlockReportClarity);
  const boostOfflineCap = useGameStore((state) => state.boostOfflineCap);
  const purchaseCarbonCredits = useGameStore(
    (state) => state.purchaseCarbonCredits
  );
  const purchaseTokenWithTreasury = useGameStore(
    (state) => state.purchaseTokenWithTreasury
  );
  const rescueTreasury = useGameStore((state) => state.rescueTreasury);
  const resetSave = useGameStore((state) => state.resetSave);
  const user = useGameStore((state) => state.user);
  const settingsOpen = useGameStore((state) => state.settingsOpen);
  const toggleSettings = useGameStore((state) => state.toggleSettings);
  const detailsOpen = useGameStore((state) => state.detailsOpen);
  const toggleDetails = useGameStore((state) => state.toggleDetails);
  const offlineApplied = useRef(false);
  const syncApplied = useRef(false);
  const lastGameOverRef = useRef(false);
  const projectsRef = useRef<HTMLDivElement | null>(null);
  const hasSave = Boolean(save);
  const userId = user?.id ?? null;
  const configVersion = config?.version ?? null;
  const tickMs = config?.economy.tickMs ?? null;
  const [remoteStatus, setRemoteStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(() => (token ? "loading" : "ready"));
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const lastPlanUnlockRef = useRef<boolean | null>(null);
  const lastPlanActivationNewsId = useRef<string | null>(null);
  const lastLevelCompleteRef = useRef<boolean | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [orderByAlert, setOrderByAlert] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const levelCompleteRedirected = useRef(false);
  const isReadOnly = useMemo(
    () => new URLSearchParams(location.search).get("readonly") === "1",
    [location.search]
  );
  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }, []);
  const scrollToProjects = useCallback(() => {
    projectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleUpdateBudget = useCallback(
    (key: "industryPct" | "welfarePct" | "securityDiplomacyPct", value: number) => {
      if (isReadOnly) return;
      updateBudget(key, value);
    },
    [isReadOnly, updateBudget]
  );

  const handleAutoBalance = useCallback(() => {
    if (isReadOnly) return;
    autoBalanceBudget();
  }, [isReadOnly, autoBalanceBudget]);

  const handleSetTaxRatePct = useCallback(
    (value: number) => {
      if (isReadOnly) return;
      setTaxRatePct(value);
    },
    [isReadOnly, setTaxRatePct]
  );

  const handleSelectIndustryLeader = useCallback(
    (industryId: string) => {
      if (isReadOnly) return;
      setIndustryLeader(industryId);
    },
    [isReadOnly, setIndustryLeader]
  );

  const handleAddDiversifiedIndustry = useCallback(
    (industryId: string) => {
      if (isReadOnly) return;
      addDiversifiedIndustry(industryId);
    },
    [isReadOnly, addDiversifiedIndustry]
  );

  const handleStartProject = useCallback(
    (projectId: string) => {
      if (isReadOnly) return;
      startProject(projectId);
    },
    [isReadOnly, startProject]
  );

  const handleSpeedProject = useCallback(
    (projectId: string) => {
      if (isReadOnly) return;
      speedProject(projectId);
    },
    [isReadOnly, speedProject]
  );

  const handleResolveEvent = useCallback(
    (eventId: string, optionId: string) => {
      if (isReadOnly) return;
      resolveEvent(eventId, optionId);
    },
    [isReadOnly, resolveEvent]
  );

  const handleMitigateEvent = useCallback(() => {
    if (isReadOnly) return;
    mitigateEvent();
  }, [isReadOnly, mitigateEvent]);

  const handleDismissEvent = useCallback(() => {
    if (isReadOnly) return;
    dismissEvent();
  }, [isReadOnly, dismissEvent]);

  const handleSetDecreeSlot = useCallback(
    (slotId: number, decreeId: string | null) => {
      if (isReadOnly) return;
      setDecreeSlot(slotId, decreeId);
    },
    [isReadOnly, setDecreeSlot]
  );

  const handleActivateDecree = useCallback(
    (slotId: number) => {
      if (isReadOnly) return;
      activateDecree(slotId);
    },
    [isReadOnly, activateDecree]
  );

  const handleActivateEmergencyPlan = useCallback(() => {
    if (isReadOnly) return;
    activateEmergencyPlan();
  }, [isReadOnly, activateEmergencyPlan]);

  const handlePurchaseOffer = useCallback(
    (offerId: string) => {
      if (isReadOnly) return;
      purchaseOffer(offerId);
    },
    [isReadOnly, purchaseOffer]
  );

  const handleRedeemRewarded = useCallback(
    (rewardedId: string) => {
      if (isReadOnly) return;
      redeemRewarded(rewardedId);
    },
    [isReadOnly, redeemRewarded]
  );

  const handleUnlockAutoBalance = useCallback(() => {
    if (isReadOnly) return;
    unlockAutoBalance();
  }, [isReadOnly, unlockAutoBalance]);

  const handleUnlockReportClarity = useCallback(() => {
    if (isReadOnly) return;
    unlockReportClarity();
  }, [isReadOnly, unlockReportClarity]);

  const handleBoostOfflineCap = useCallback(() => {
    if (isReadOnly) return;
    boostOfflineCap();
  }, [isReadOnly, boostOfflineCap]);

  const handlePurchaseTokenWithTreasury = useCallback(() => {
    if (isReadOnly) return;
    purchaseTokenWithTreasury();
  }, [isReadOnly, purchaseTokenWithTreasury]);

  useEffect(() => {
    syncApplied.current = false;
    offlineApplied.current = false;
    lastGameOverRef.current = false;
    levelCompleteRedirected.current = false;
    setRemoteStatus(token ? "loading" : "ready");
    setRemoteError(null);
  }, [token, userId]);

  useEffect(() => {
    if (!save || isReadOnly) return;
    const level = save.level ?? 1;
    if (level === 2) {
      navigate("/level2", { replace: true });
      return;
    }
    if (level === 1 && save.level1Complete && !levelCompleteRedirected.current) {
      levelCompleteRedirected.current = true;
      navigate("/level-complete", { replace: true });
    }
  }, [save, isReadOnly, navigate]);

  useEffect(() => {
    if (!config || !token || !userId || syncApplied.current) return;
    let active = true;
    setRemoteStatus("loading");
    setRemoteError(null);

    const loadRemote = async () => {
      try {
        const response = await fetchSave(token);
        const merged = mergeSaves(save ?? null, response.state ?? null);
        if (!active) return;
        if (merged) {
          const hydrated = ensureSaveIntegrity(
            merged,
            config.version,
            config.projects.map((project) => project.id),
            config.events.map((event) => event.id),
            config.stateTypes
          );
          setSave(hydrated);
          if (userId) {
            saveLocal(hydrated, userId);
          }
          if (!response.state) {
            await putSave(token, hydrated, config.version);
          }
          syncApplied.current = true;
          setRemoteStatus("ready");
          return;
        }
        if (response.state) {
          syncApplied.current = true;
          setRemoteStatus("ready");
          return;
        }
        syncApplied.current = true;
        setRemoteStatus("ready");
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError) {
          if (error.status === 401) {
            logout();
            navigate("/login", { replace: true });
            return;
          }
          if (error.status === 404) {
            syncApplied.current = true;
            setRemoteStatus("ready");
            return;
          }
          setRemoteError(error.message);
        } else if (error instanceof Error) {
          setRemoteError(error.message);
        } else {
          setRemoteError("Fallo la carga remota");
        }
        syncApplied.current = true;
        setRemoteStatus("error");
      }
    };

    loadRemote();

    return () => {
      active = false;
    };
  }, [config, token, save, logout, navigate, setSave, userId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!config || !save) return;
    const adminUnlockByProject =
      save.projects?.[ADMIN_UNLOCK_PROJECT_ID]?.status === "completed";
    const shouldSyncAdmin = adminUnlockByProject !== (save.adminUnlocked ?? false);
    const planUnlocked = getPlanAnticrisisUnlocked(save);
    const planCooldownUntil = getPlanAnticrisisCooldownUntil(save);
    const shouldSyncPlanUnlock =
      save.unlocks?.planAnticrisisUnlocked === undefined ||
      save.emergencyPlanUnlocked !== planUnlocked;
    const shouldSyncPlanCooldown =
      save.cooldowns?.planAnticrisisUntilTick === undefined ||
      save.emergencyPlanCooldownUntil !== planCooldownUntil;
    const baselineGdpInvalid =
      typeof save.baselineGdp !== "number" || save.baselineGdp <= 0;
    const needsHydration =
      !save.country.formalName ||
      !save.country.stateTypeId ||
      !save.leader.roleSelectionMode ||
      save.admin === undefined ||
      save.adminPerTick === undefined ||
      save.adminUnlocked === undefined ||
      baselineGdpInvalid ||
      save.taxRatePct === undefined ||
      !save.agenciesUnlocked ||
      save.treatiesUnlocked === undefined ||
      save.industryLeaderId === undefined ||
      !Array.isArray(save.diversifiedIndustries) ||
      save.premiumTokens === undefined ||
      !save.iapFlags ||
      save.gameOver === undefined ||
      save.gameOverReason === undefined ||
      save.gameOverAt === undefined ||
      save.gameOverAtTick === undefined ||
      !Array.isArray(save.gameOverCauses) ||
      save.gameOverAdvice === undefined ||
      save.lastRisk === undefined ||
      save.riskTicks === undefined ||
      save.zeroTreasuryTicks === undefined ||
      save.zeroMoraleTicks === undefined ||
      save.debtOverTicks === undefined ||
      save.offlineRewardMultiplier === undefined ||
      save.emergencyPlanUnlocked === undefined ||
      save.emergencyPlanCooldownUntil === undefined ||
      save.remoteConfigOverrides === undefined ||
      save.eventHistory === undefined ||
      save.pendingEventId === undefined ||
      save.pendingEventDelay === undefined ||
      save.notifiedStartableProjectIds === undefined ||
      shouldSyncAdmin ||
      shouldSyncPlanUnlock ||
      shouldSyncPlanCooldown;
    if (!needsHydration) return;
    const hydrated = ensureSaveIntegrity(
      save,
      config.version,
      config.projects.map((project) => project.id),
      config.events.map((event) => event.id),
      config.stateTypes
    );
    setSave(hydrated);
    if (userId) {
      saveLocal(hydrated, userId);
    }
  }, [config, save, setSave, userId]);

  const remoteConfig = useMemo(() => {
    if (!config || !save) return null;
    return mergeRemoteConfig(
      config.remoteConfigKeys.defaults,
      save.remoteConfigOverrides ?? {}
    );
  }, [config, save]);

  useEffect(() => {
    if (!config || !save || save.gameOver || offlineApplied.current || isReadOnly) return;
    const offlineHours =
      remoteConfig?.offline_cap_hours ?? config.economy.offlineCapHours;
    const bonusHours = save.iapFlags?.offlineCapBonusHours ?? 0;
    const maxMs = (offlineHours + bonusHours) * 60 * 60 * 1000;
    const delta = Math.min(Date.now() - save.lastTickAt, maxMs);
    const ticks = Math.floor(delta / config.economy.tickMs);
    if (ticks > 0) {
      const rewardMultiplier = save.offlineRewardMultiplier ?? 0;
      const treasuryBefore = save.treasury;
      applyOfflineTicks(ticks);
      if (rewardMultiplier > 0) {
        const updated = useGameStore.getState().save;
        if (updated) {
          const gain = updated.treasury - treasuryBefore;
          const bonus = Math.max(0, gain) * rewardMultiplier;
          const boosted = {
            ...updated,
            treasury: updated.treasury + bonus,
            offlineRewardMultiplier: 0,
            updatedAt: new Date().toISOString()
          };
          setSave(boosted);
          if (userId) {
            saveLocal(boosted, userId);
          }
        }
      }
    }
    offlineApplied.current = true;
  }, [config, save, applyOfflineTicks, remoteConfig, setSave, userId, isReadOnly]);

  useEffect(() => {
    if (!tickMs || !hasSave || save?.gameOver || isReadOnly) return;
    const interval = window.setInterval(() => {
      tick();
    }, tickMs);
    return () => window.clearInterval(interval);
  }, [tickMs, hasSave, tick, save?.gameOver, isReadOnly]);

  useEffect(() => {
    if (!hasSave || isReadOnly) return;
    const interval = window.setInterval(() => {
      const current = useGameStore.getState().save;
      if (!current) return;
      const updated = { ...current, updatedAt: new Date().toISOString() };
      setSave(updated);
      if (userId) {
        saveLocal(updated, userId);
      }
    }, 10000);
    return () => window.clearInterval(interval);
  }, [hasSave, setSave, userId, isReadOnly]);

  useEffect(() => {
    if (!hasSave || !token || !configVersion || !userId || isReadOnly) return;
    const interval = window.setInterval(async () => {
      const current = useGameStore.getState().save;
      if (!current) return;
      const updated = { ...current, updatedAt: new Date().toISOString() };
      setSave(updated);
      if (userId) {
        saveLocal(updated, userId);
      }
      try {
        await putSave(token, updated, configVersion);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          navigate("/login", { replace: true });
        }
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [hasSave, token, configVersion, setSave, logout, navigate, userId, isReadOnly]);

  const handleSaveNow = useCallback(async () => {
    if (isReadOnly) return;
    if (!save) return;
    const updated = { ...save, updatedAt: new Date().toISOString() };
    setSave(updated);
    if (userId) {
      saveLocal(updated, userId);
    }
    if (token && configVersion) {
      try {
        await putSave(token, updated, configVersion);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          navigate("/login", { replace: true });
        }
      }
    }
  }, [save, setSave, userId, token, configVersion, logout, navigate, isReadOnly]);

  const handleRescue = async () => {
    if (isReadOnly) return;
    if (token && config && save) {
      try {
        const response = await rescueGame(token);
        if (response.state) {
          const hydrated = ensureSaveIntegrity(
            response.state,
            config.version,
            config.projects.map((project) => project.id),
            config.events.map((event) => event.id),
            config.stateTypes
          );
          setSave(hydrated);
          if (userId) {
            saveLocal(hydrated, userId);
          }
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        rescueTreasury();
      }
    } else {
      rescueTreasury();
    }
    const updated = useGameStore.getState().save;
    if (updated) {
      const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
      setSave(withTimestamp);
      if (userId) {
        saveLocal(withTimestamp, userId);
      }
      if (token && configVersion) {
        putSave(token, withTimestamp, configVersion).catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            logout();
            navigate("/login", { replace: true });
          }
        });
      }
    }
    setToastMessage("Rescate aplicado: +200 Tesoro");
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCarbonMarketPurchase = () => {
    if (isReadOnly) return;
    if (!save) return;
    if (save.premiumTokens < CARBON_CREDITS_COST) return;
    purchaseCarbonCredits();
    const updated = useGameStore.getState().save;
    if (!updated) return;
    const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
    setSave(withTimestamp);
    if (userId) {
      saveLocal(withTimestamp, userId);
    }
    if (token && configVersion) {
      putSave(token, withTimestamp, configVersion).catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          navigate("/login", { replace: true });
        }
      });
    }
    setToastMessage(CARBON_MARKET_NEWS_TEXT);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!save) return;
    const planUnlocked = getPlanAnticrisisUnlocked(save);
    if (lastPlanUnlockRef.current === null) {
      lastPlanUnlockRef.current = planUnlocked;
    } else if (!lastPlanUnlockRef.current && planUnlocked) {
      setToastMessage("Plan anticrisis desbloqueado");
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      lastPlanUnlockRef.current = planUnlocked;
      handleSaveNow();
    } else {
      lastPlanUnlockRef.current = planUnlocked;
    }

    const latestNews = save.news?.[0];
    if (!latestNews) return;
    if (latestNews.id === lastPlanActivationNewsId.current) return;
    if (!latestNews.text.startsWith("Plan anticrisis activado")) return;
    lastPlanActivationNewsId.current = latestNews.id;
    handleSaveNow();
  }, [save, handleSaveNow]);

  useEffect(() => {
    if (!save) return;
    const isComplete = Boolean(save.level1Complete);
    if (lastLevelCompleteRef.current === null) {
      lastLevelCompleteRef.current = isComplete;
      return;
    }
    if (!lastLevelCompleteRef.current && isComplete) {
      handleSaveNow();
    }
    lastLevelCompleteRef.current = isComplete;
  }, [save, handleSaveNow]);

  const handleRequestReset = () => {
    if (isReadOnly) return;
    toggleSettings(false);
    setResetConfirmOpen(true);
  };

  const handleResetGame = async () => {
    if (isReadOnly) return;
    if (token) {
      try {
        await resetGame(token);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
      }
    }
    const nextSave = resetSave();
    setResetConfirmOpen(false);
    if (!nextSave) return;
    const updated = { ...nextSave, updatedAt: new Date().toISOString() };
    setSave(updated);
    if (userId) {
      saveLocal(updated, userId);
    }
    if (token && configVersion) {
      try {
        await putSave(token, updated, configVersion);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          navigate("/login", { replace: true });
        }
      }
    }
  };

  useEffect(() => {
    if (!save) return;
    if (save.gameOver && !lastGameOverRef.current) {
      handleSaveNow();
    }
    lastGameOverRef.current = save.gameOver;
  }, [save, handleSaveNow]);

  const activeEvent = useMemo(() => {
    if (!config || !save?.activeEventId) return null;
    return config.events.find((event) => event.id === save.activeEventId) ?? null;
  }, [config, save?.activeEventId]);
  const sortedProjects = useMemo(() => {
    if (!config || !save) return [];
    return [...config.projects].sort((a, b) => {
      const aStartable = isProjectStartable(a, save, config);
      const bStartable = isProjectStartable(b, save, config);
      if (aStartable !== bStartable) return aStartable ? -1 : 1;
      const aValue = a.valueScore ?? 0;
      const bValue = b.valueScore ?? 0;
      if (aValue !== bValue) return bValue - aValue;
      if (a.phase !== b.phase) return a.phase - b.phase;
      const aCost = getEffectiveProjectCost(a, save, config);
      const bCost = getEffectiveProjectCost(b, save, config);
      if (aCost !== bCost) return aCost - bCost;
      return a.name.localeCompare(b.name);
    });
  }, [config, save]);
  const startableProjects = useMemo(() => {
    if (!config || !save) return [];
    return sortedProjects
      .filter((project) => isProjectStartable(project, save, config))
      .map((project) => ({ id: project.id, name: project.name }));
  }, [config, save, sortedProjects]);

  if (!config || remoteStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow">
          <h1 className="font-display text-3xl">Cargando juego...</h1>
          <p className="mt-2 text-sm text-ink/60">
            Preparando el tablero y sincronizando datos.
          </p>
        </div>
      </div>
    );
  }

  if (remoteStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow">
          <h1 className="font-display text-3xl">Error de carga</h1>
          <p className="mt-2 text-sm text-ink/60">
            {remoteError ?? "No se pudo cargar la partida."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!save) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-3xl bg-white/80 p-8 shadow-glow">
          <h1 className="font-display text-3xl">Juego listo</h1>
          <p className="mt-2 text-sm text-ink/60">
            Aun no hay una partida activa. Crea tu pais para comenzar.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/70 p-3">Tesoro: --</div>
            <div className="rounded-xl bg-white/70 p-3">PIB: --</div>
            <div className="rounded-xl bg-white/70 p-3">Crecimiento: --</div>
            <div className="rounded-xl bg-white/70 p-3">Felicidad: --</div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/onboarding/country")}
            className="mt-5 w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
          >
            Ir al onboarding
          </button>
        </div>
      </div>
    );
  }

  const roleTitle = formatRoleTitle(save.leader.roleId, save.leader.gender);
  const stateTypeLabel =
    config.stateTypes.find((type) => type.id === save.country.stateTypeId)?.label ??
    "Microestado";
  const headerKicker =
    save.country.stateTypeId === "NONE"
      ? "Microestado"
      : save.country.stateTypeId === "OTHER"
      ? save.country.stateTypeOtherText || "Microestado"
      : stateTypeLabel;
  const geographyLabel =
    {
      archipelago: "Archipielago",
      coastal: "Costero",
      mountain: "Montanoso/Andino",
      desert: "Desertico",
      forest: "Boscoso",
      urban: "Urbano denso"
    }[save.country.geography] ?? "Urbano denso";
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
  const economy = config.economy;
  const phase2 = economy.phaseThresholds.phase2;
  const phase3 = economy.phaseThresholds.phase3;
  const phase4 = economy.phaseThresholds.phase4;
  const industryManualLines = config.industries
    .map((industry) => {
      const modifier = getIndustryModifierById(industry.id);
      if (!modifier) return null;
      const extras: string[] = [];
      if (modifier.happinessDelta) {
        extras.push(`felicidad ${formatSignedNumber(modifier.happinessDelta, 2)}`);
      }
      if (modifier.stabilityDelta) {
        extras.push(`estabilidad ${formatSignedNumber(modifier.stabilityDelta, 2)}`);
      }
      if (modifier.reputationDelta) {
        extras.push(
          `reputacion ${formatSignedNumber(modifier.reputationDelta, 3)}`
        );
      }
      if (modifier.resourceDelta) {
        extras.push(`recursos ${formatSignedNumber(modifier.resourceDelta, 2)}`);
      }
      if (modifier.requiresEnergy) extras.push("requiere energia");
      if (modifier.requiresStability) extras.push("requiere estabilidad");
      if (modifier.requiresInnovation) extras.push("requiere innovacion");
      const extraText = extras.length > 0 ? ` (${extras.join(", ")})` : "";
      return `${industry.label}: ingresos ${formatPct(
        (modifier.revenueMult - 1) * 100,
        0,
        true
      )}, crecimiento base ${formatPct(modifier.growthBase * 100, 2, true)}${extraText}.`;
    })
    .filter(Boolean) as string[];
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
  const riskLevel = save.lastRisk ?? 0;
  const showRiskBanner = !save.gameOver && riskLevel >= 60;
  const riskTone =
    riskLevel >= 75
      ? "bg-ember/15 border-ember/40 text-ember"
      : "bg-sage/15 border-sage/40 text-ink";
  const riskLabel =
    riskLevel >= 75
      ? "Crisis politica inminente"
      : "Riesgo de derrocamiento: Alto";
  const riskCountdownTicks = Math.max(0, 60 - (save.riskTicks ?? 0));
  const moraleCountdownTicks = Math.max(0, 20 - (save.zeroMoraleTicks ?? 0));
  const debtCountdownTicks = Math.max(0, 30 - (save.debtOverTicks ?? 0));
  let countdownText: string | null = null;
  if (riskLevel >= 75) {
    countdownText = `Si no estabilizas en ${formatCountdown(
      (riskCountdownTicks * config.economy.tickMs) / 1000
    )}, te derrocan.`;
  } else if ((save.zeroMoraleTicks ?? 0) > 0) {
    countdownText = `Si no levantas felicidad y estabilidad en ${formatCountdown(
      (moraleCountdownTicks * config.economy.tickMs) / 1000
    )}, te derrocan.`;
  } else if ((save.debtOverTicks ?? 0) > 0) {
    countdownText = `Si no reduces deuda en ${formatCountdown(
      (debtCountdownTicks * config.economy.tickMs) / 1000
    )}, te derrocan.`;
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6 stagger">
        <header className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/60">
                {headerKicker}
                {isReadOnly ? (
                  <span className="ml-2 rounded-full border border-ink/20 bg-white/70 px-2 py-0.5 text-[9px] tracking-[0.2em] text-ink/60">
                    Sandbox Nivel 1
                  </span>
                ) : null}
              </p>
              <h1 className="font-display text-3xl">
                {save.country.formalName || save.country.baseName}
              </h1>
              <p className="mt-1 text-sm text-ink/70">
                {roleTitle} - {save.leader.name}
              </p>
              <p className="mt-1 text-xs text-ink/60">
                Geografia: {geographyLabel}
              </p>
              {save.leader.tagline ? (
                <p className="mt-2 text-xs text-ink/60">
                  Mandato: {save.leader.trait ? `${save.leader.trait} - ` : ""}
                  "{save.leader.tagline}"
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-ink/60">
                Tokens: {save.premiumTokens}
              </span>
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-sm"
              >
                Manual rapido
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-sm"
              >
                Mi perfil
              </button>
              <button
                type="button"
                onClick={() => toggleSettings(true)}
                className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-sm"
              >
                Ajustes
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-ember/40 bg-white/80 px-4 py-2 text-sm text-ember"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </header>

        {showRiskBanner ? (
          <div className={`rounded-2xl border p-4 text-sm ${riskTone}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{riskLabel}</span>
              <span className="text-xs text-ink/60">
                Riesgo {Math.round(riskLevel)}/100
              </span>
            </div>
            {countdownText ? (
              <p className="mt-2 text-xs text-ink/70">{countdownText}</p>
            ) : null}
          </div>
        ) : null}

        {/* items-start prevents the indicators column from stretching to the right panel height */}
        <div className="grid gap-6 items-start lg:grid-cols-[minmax(320px,420px)_1fr]">
          <MetricsRail
            cards={sortedCards}
            orderByAlert={orderByAlert}
            onToggleOrder={() => setOrderByAlert((prev) => !prev)}
            expandedCards={expandedCards}
            onToggleCard={toggleCard}
          />
          <div className="space-y-6 min-w-0">
            <aside className="flex flex-col gap-6 min-w-0">
              <NewsFeed
                items={save.news}
                startableProjects={startableProjects}
                onJumpToProjects={scrollToProjects}
              />
              <SummaryCard
                phase={save.phase}
                industryPct={save.budget.industryPct}
                welfarePct={save.budget.welfarePct}
                securityPct={save.budget.securityDiplomacyPct}
                leaderIndustryLabel={leaderIndustryLabel}
                admin={save.admin}
              />
            </aside>

            <section className="grid gap-4 lg:grid-cols-3 min-w-0">
              <div className="space-y-4">
                <BudgetSliders
                  budget={save.budget}
                  onChange={handleUpdateBudget}
                  autoBalanceUnlocked={save.iapFlags?.autoBalanceUnlocked ?? false}
                  onAutoBalance={handleAutoBalance}
                  disabled={isReadOnly}
                />
                <TaxSelector
                  value={save.taxRatePct}
                  onChange={handleSetTaxRatePct}
                  disabled={isReadOnly}
                />
                <DecreePanel
                  decrees={config.economy.decrees}
                  save={save}
                  onAssign={handleSetDecreeSlot}
                  onActivate={handleActivateDecree}
                  disabled={isReadOnly}
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
                    onClick={handleActivateEmergencyPlan}
                    disabled={!planAnticrisisReady || isReadOnly}
                    className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      planAnticrisisReady && !isReadOnly
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
                  onPurchase={handleCarbonMarketPurchase}
                  disabled={isReadOnly}
                />
              </div>
              <div className="lg:col-span-2 space-y-4">
                <IndustryPicker
                  industries={config.industries}
                  leaderId={save.industryLeaderId}
                  diversifiedIds={save.diversifiedIndustries}
                  phase={save.phase}
                  unlockedPhase={save.maxPhaseReached ?? save.phase}
                  onSelectLeader={handleSelectIndustryLeader}
                  onAddDiversified={handleAddDiversifiedIndustry}
                  disabled={isReadOnly}
                />
                <div ref={projectsRef}>
                  <ProjectsPanel
                    projects={sortedProjects}
                    state={save}
                    getCost={(project) =>
                      getEffectiveProjectCost(project, save, config)
                    }
                    speedCost={config.iapConfig.actions.projectSpeedCost}
                    onStart={handleStartProject}
                    onSpeed={handleSpeedProject}
                    disabled={isReadOnly}
                  />
                </div>
                <DetailsPanel
                  open={detailsOpen}
                  onToggle={() => toggleDetails()}
                  state={save}
                />
              </div>
            </section>
          </div>
        </div>

      </div>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-40 rounded-2xl bg-ink px-4 py-3 text-xs text-white shadow-soft">
          {toastMessage}
        </div>
      ) : null}

      {activeEvent && !save.gameOver && !isReadOnly ? (
        <EventModal
          event={activeEvent}
          onSelect={(optionId) => handleResolveEvent(activeEvent.id, optionId)}
          onMitigate={handleMitigateEvent}
          canMitigate={
            save.premiumTokens >= config.iapConfig.actions.eventMitigationCost
          }
          mitigationCost={config.iapConfig.actions.eventMitigationCost}
          onClose={handleDismissEvent}
        />
      ) : null}

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Manual rapido"
      >
        <div className="space-y-5 text-sm text-ink/70">
          <div>
            <h4 className="text-sm font-semibold text-ink">Nivel 1: objetivo</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Objetivo: consolidar el mandato y completar la Fase 4.</li>
              <li>Protege el tesoro con impuestos, presupuesto e industria lider.</li>
              <li>Los proyectos empujan el crecimiento y desbloquean fases.</li>
              <li>Ganas cuando la Fase 4 queda completa.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">Nivel 1: fases y proyectos</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Cada fase exige PIB, estabilidad, confianza y proyectos completos.</li>
              <li>Prioriza proyectos disponibles y revisa requisitos si faltan.</li>
              <li>Acelerar proyectos consume tokens; usalo con criterio.</li>
              <li>La fase maxima alcanzada mantiene el limite de industrias.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">
              Nivel 1: evitar derrocamiento
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Riesgo sube con felicidad, estabilidad o confianza muy bajas.</li>
              <li>Tesoro en 0 y deuda/PIB alta disparan alertas.</li>
              <li>Corrupcion alta y crecimiento negativo sostienen la crisis.</li>
              <li>El plan anticrisis es el boton de emergencia con cooldown.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">
              Nivel 1: indicadores clave
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>PIB y crecimiento efectivo muestran traccion economica.</li>
              <li>Felicidad, estabilidad y confianza reflejan legitimidad.</li>
              <li>Corrupcion y deuda son senales tempranas de crisis.</li>
              <li>Reputacion influye en turismo y eventos.</li>
              <li>Industria lider define ingresos base.</li>
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-ink/60">
              {industryManualLines.map((line) => (
                <div key={line} className="rounded-xl bg-white/70 p-3">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">
              Nivel 1: umbrales de fase
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>
                Fase 2: PIB &gt;= {phase2.gdp}, Estabilidad &gt;= {phase2.stability},
                Confianza &gt;= {phase2.trust}, Proyectos &gt;= {phase2.projects} {"->"}
                2 industrias.
              </li>
              <li>
                Fase 3: PIB &gt;= {phase3.gdp}, Estabilidad &gt;= {phase3.stability},
                Confianza &gt;= {phase3.trust}, Proyectos &gt;= {phase3.projects} {"->"}
                3 industrias.
              </li>
              <li>
                Fase 4: PIB &gt;= {phase4.gdp}, Estabilidad &gt;= {phase4.stability},
                Confianza &gt;= {phase4.trust}, Proyectos &gt;= {phase4.projects} {"->"}
                4 industrias.
              </li>
              <li>La fase maxima alcanzada mantiene el limite aunque bajes.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">Fin de nivel</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Mandato cumplido = Fase 4 completada.</li>
              <li>
                Se conserva PIB, tesoro, felicidad, estabilidad, confianza,
                corrupcion, reputacion y deuda.
              </li>
              <li>Desde aqui puedes revisar Nivel 1 en modo solo lectura.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">
              Nivel 2: elecciones (democratico)
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Solo regimenes democraticos pueden convocarlas.</li>
              <li>Cuestan tesoro y tienen cooldown.</li>
              <li>Ganar mejora reputacion y confianza; perder termina la partida.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">
              Nivel 2: inflacion y Banco Central
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Nueva macro con regimenes: deflacion, estable, alta, hiper.</li>
              <li>Banco Central puede subir/bajar tasa o intervenir (cooldown).</li>
              <li>Inflacion alta frena crecimiento y baja felicidad.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">Nivel 2: colaboradores</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>El gabinete agrega consejeros segun tu regimen.</li>
              <li>Cada uno trae consejo del dia.</li>
              <li>Algunos proyectos llegan recomendados.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">
              Nivel 2: industrias y proyectos
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>La base industrial L2 define ingresos y presion inflacionaria.</li>
              <li>Nuevas industrias y proyectos existen solo en Nivel 2.</li>
              <li>Completar Fase 4 del Nivel 2 marca la victoria.</li>
            </ul>
          </div>
        </div>
      </Modal>

      <SettingsModal
        open={settingsOpen}
        onClose={() => toggleSettings(false)}
        onSaveNow={handleSaveNow}
        onPurchaseOffer={handlePurchaseOffer}
        onRedeemRewarded={handleRedeemRewarded}
        onUnlockAutoBalance={handleUnlockAutoBalance}
        onUnlockReportClarity={handleUnlockReportClarity}
        onBoostOfflineCap={handleBoostOfflineCap}
        onPurchaseTokenWithTreasury={handlePurchaseTokenWithTreasury}
        onRescueTreasury={handleRescue}
        onRequestReset={handleRequestReset}
        save={save}
        isAuthed={Boolean(token)}
        iapConfig={config.iapConfig}
        readOnly={isReadOnly}
      />

      <Modal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Confirmar reset"
      >
        <p className="text-sm text-ink/70">
          Estas seguro? Se perdera el progreso actual.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleResetGame}
            className="w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white"
          >
            Si, resetear
          </button>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(false)}
            className="w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <GameOverModal
        open={save.gameOver}
        save={save}
        industries={config.industries}
        tickMs={config.economy.tickMs}
        onRetry={handleResetGame}
        onReturn={handleResetGame}
      />
    </div>
  );
}
