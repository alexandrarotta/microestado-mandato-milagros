import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSave, putSave } from "../api/save";
import { resetGame } from "../api/game";
import { runElection } from "../api/elections";
import { ApiError } from "../api/client";
import {
  buyTokensWithTreasury,
  type BuyTokensResponse,
  type TokenPackId
} from "../api/tokens";
import BudgetSliders from "../components/BudgetSliders";
import Modal from "../components/Modal";
import TaxSelector from "../components/TaxSelector";
import industriesLevel2 from "../data/industriesLevel2.json";
import projectsLevel2 from "../data/projectsLevel2.json";
import Level2CabinetTab from "./level2/tabs/Level2CabinetTab";
import Level2EventsTab from "./level2/tabs/Level2EventsTab";
import Level2DecreesPanel from "./level2/components/Level2DecreesPanel";
import Level2EventPopup from "./level2/components/Level2EventPopup";
import { useGameStore } from "../store/gameStore";
import { clamp } from "../utils/clamp";
import { formatPct } from "../utils/formatPct";
import { mergeSaves } from "../utils/merge";
import { saveLocal } from "../utils/storage";
import type { Level2IndustryConfig, Level2ProjectConfig } from "../types";

const LEVEL2_INDUSTRIES = industriesLevel2 as Level2IndustryConfig[];
const LEVEL2_PROJECTS = projectsLevel2 as Level2ProjectConfig[];
const ELECTION_COST = 100;
const TOKEN_PACKS: Array<{
  id: TokenPackId;
  tokens: number;
  cost: number;
  label: string;
}> = [
  {
    id: "PACK_100",
    tokens: 100,
    cost: 1_000_000,
    label: "Comprar 100 tokens (1.000.000 tesoro)"
  },
  {
    id: "PACK_200",
    tokens: 200,
    cost: 1_800_000,
    label: "Comprar 200 tokens (1.800.000 tesoro)"
  },
  {
    id: "PACK_300",
    tokens: 300,
    cost: 2_400_000,
    label: "Comprar 300 tokens (2.400.000 tesoro)"
  }
];

const DEMOCRATIC_ROLES = new Set([
  "PRESIDENT",
  "PRIME_MINISTER",
  "KING_PARLIAMENT",
  "CHANCELLOR"
]);
const MONARCHY_ROLES = new Set(["KING_ABSOLUTE", "KING_PARLIAMENT"]);

const ADVISORS_BY_REGIME = {
  DEMOCRACY: [
    {
      id: "FINANCE",
      name: "Hacienda",
      tips: [
        "Prioriza proyectos con retorno fiscal rapido.",
        "Cuida la inflacion para no perder traccion.",
        "Evita endeudarte en fase temprana."
      ],
      recommends: ["L2_DIGITAL_GOV", "L2_FINTECH_SANDBOX", "L2_RESEARCH_CLUSTER"]
    },
    {
      id: "OPPOSITION",
      name: "Oposicion",
      tips: [
        "Sostener felicidad es clave para elecciones.",
        "Transparencia primero, acuerdos despues.",
        "Evita saltos bruscos en impuestos."
      ],
      recommends: ["L2_CIVIC_DATA", "L2_REGIONAL_UNION", "L2_GREEN_BONDS"]
    },
    {
      id: "CENTRAL_BANK",
      name: "Banco Central",
      tips: [
        "Define metas de inflacion antes de actuar.",
        "Usa la tasa con paciencia: no todos los ticks.",
        "Intervencion solo en crisis."
      ],
      recommends: ["L2_CENTRAL_BANK_REFORM", "L2_GRID_UPGRADE"]
    }
  ],
  MONARCHY: [
    {
      id: "ROYAL_COUNCIL",
      name: "Consejero Real",
      tips: [
        "Estabilidad primero, expansion despues.",
        "Asegura alianzas antes de grandes reformas.",
        "El prestigio internacional protege el mandato."
      ],
      recommends: ["L2_SECURITY_OVERHAUL", "L2_RESEARCH_CLUSTER"]
    },
    {
      id: "CHAMBER",
      name: "Camara",
      tips: [
        "La camara favorece proyectos con consenso.",
        "Mantener reputacion abre puertas comerciales.",
        "Bonos verdes mejoran la narrativa."
      ],
      recommends: ["L2_GREEN_BONDS", "L2_TRADE_CORRIDOR"]
    },
    {
      id: "MASTER_BUILDER",
      name: "Maestro de Obras",
      tips: [
        "Infraestructura es poder a largo plazo.",
        "Evita saturar el tesoro con capex alto.",
        "Prioriza redes y corredores."
      ],
      recommends: ["L2_GRID_UPGRADE", "L2_TRADE_CORRIDOR", "L2_HUMAN_CAPITAL_PUSH"]
    }
  ],
  AUTHORITARIAN: [
    {
      id: "SECURITY",
      name: "Seguridad",
      tips: [
        "Control interno evita crisis politicas.",
        "No descuides estabilidad por crecimiento.",
        "El orden es un activo."
      ],
      recommends: ["L2_SECURITY_OVERHAUL", "L2_DEFENSE_CYBER"]
    },
    {
      id: "PLANNER",
      name: "Planificador",
      tips: [
        "La industria base debe generar empleo rapido.",
        "Diversifica antes de fase 3.",
        "Impacto ambiental puede frenar exportaciones."
      ],
      recommends: ["L2_DIGITAL_GOV", "L2_INDUSTRIAL_AUTOMATION", "L2_HUMAN_CAPITAL_PUSH"]
    },
    {
      id: "PROPAGANDA",
      name: "Propaganda",
      tips: [
        "Reputacion interna sostiene el mandato.",
        "Cualquier logro debe comunicarse rapido.",
        "Evita derrotas publicas."
      ],
      recommends: ["L2_TOURISM_PREMIUM", "L2_REGIONAL_UNION"]
    }
  ]
};

function getRegimeGroup(roleId: string) {
  if (DEMOCRATIC_ROLES.has(roleId)) return "DEMOCRACY";
  if (MONARCHY_ROLES.has(roleId)) return "MONARCHY";
  return "AUTHORITARIAN";
}

function formatInflationRegime(regime: string) {
  switch (regime) {
    case "DEFLATION":
      return "Deflacion";
    case "STABLE":
      return "Estable";
    case "HIGH":
      return "Alta";
    case "HYPER":
      return "Hiper";
    default:
      return regime;
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("es-ES");
}

function ensureLevelFields(save: {
  level?: 1 | 2;
  level1Complete?: boolean;
  phase?: number;
}) {
  const phase = typeof save.phase === "number" ? save.phase : 1;
  return {
    ...save,
    level: save.level ?? 1,
    level1Complete: save.level1Complete ?? phase >= 4
  };
}

export default function Level2() {
  const navigate = useNavigate();
  const config = useGameStore((state) => state.config);
  const token = useGameStore((state) => state.token);
  const save = useGameStore((state) => state.save);
  const setSave = useGameStore((state) => state.setSave);
  const logout = useGameStore((state) => state.logout);
  const userId = useGameStore((state) => state.user?.id ?? null);
  const tickLevel2 = useGameStore((state) => state.tickLevel2);
  const updateBudget = useGameStore((state) => state.updateBudget);
  const autoBalanceBudget = useGameStore((state) => state.autoBalanceBudget);
  const setTaxRatePct = useGameStore((state) => state.setTaxRatePct);
  const setLevel2Advisors = useGameStore((state) => state.setLevel2Advisors);
  const setLevel2BaseIndustry = useGameStore((state) => state.setLevel2BaseIndustry);
  const activateLevel2Industry = useGameStore(
    (state) => state.activateLevel2Industry
  );
  const startLevel2Project = useGameStore((state) => state.startLevel2Project);
  const runCentralBankAction = useGameStore(
    (state) => state.runCentralBankAction
  );
  const [activeTab, setActiveTab] = useState("Gabinete");
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmElectionOpen, setConfirmElectionOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tokenPurchaseError, setTokenPurchaseError] = useState<string | null>(null);
  const [tokenPurchaseInFlight, setTokenPurchaseInFlight] =
    useState<TokenPackId | null>(null);
  const [electionResult, setElectionResult] = useState<{
    win: boolean;
    narrative: string;
  } | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const syncApplied = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const level = save?.level;
  const level2GameOver = save?.level2?.gameOver;

  useEffect(() => {
    syncApplied.current = false;
  }, [token]);

  useEffect(() => {
    if (settingsOpen) {
      setTokenPurchaseError(null);
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (!config || !token || !userId || syncApplied.current) return;
    let active = true;
    setRemoteStatus("loading");
    const loadRemote = async () => {
      try {
        const response = await fetchSave(token);
        const merged = mergeSaves(save ?? null, response.state ?? null);
        if (!active) return;
        if (merged) {
          const normalized = ensureLevelFields(merged);
          setSave(normalized);
          if (userId) {
            saveLocal(normalized, userId);
          }
        }
        syncApplied.current = true;
        setRemoteStatus("ready");
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          navigate("/login", { replace: true });
          return;
        }
        syncApplied.current = true;
        setRemoteStatus("error");
      }
    };
    loadRemote();
    return () => {
      active = false;
    };
  }, [config, token, userId, save, setSave, logout, navigate]);

  useEffect(() => {
    if (!save) return;
    if (save.level !== 2) {
      if (save.level1Complete) {
        navigate("/level-complete", { replace: true });
      } else {
        navigate("/game", { replace: true });
      }
    }
  }, [save, navigate]);

  useEffect(() => {
    if (!save?.level2?.gameOver) return;
    if (electionResult) return;
    navigate("/game-over", { replace: true });
  }, [save?.level2?.gameOver, electionResult, navigate]);

  useEffect(() => {
    if (!config || level !== 2 || level2GameOver) return;
    const interval = window.setInterval(() => {
      tickLevel2();
    }, config.economy.tickMs);
    return () => window.clearInterval(interval);
  }, [config, level, level2GameOver, tickLevel2]);

  useEffect(() => {
    if (!token || !config || !userId) return;
    const interval = window.setInterval(async () => {
      const current = useGameStore.getState().save;
      if (!current) return;
      const updated = { ...current, updatedAt: new Date().toISOString() };
      setSave(updated);
      if (userId) {
        saveLocal(updated, userId);
      }
      try {
        await putSave(token, updated, config.version);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          navigate("/login", { replace: true });
        }
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [token, config, userId, setSave, logout, navigate]);

  const handleSaveNow = useCallback(async () => {
    if (!token || !config || !save) return;
    const updated = { ...save, updatedAt: new Date().toISOString() };
    setSave(updated);
    if (userId) {
      saveLocal(updated, userId);
    }
    try {
      await putSave(token, updated, config.version);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate("/login", { replace: true });
      }
    }
  }, [token, config, save, setSave, userId, logout, navigate]);

  const applyServerSave = useCallback(
    (nextSave: typeof save) => {
      if (!nextSave) return;
      const normalized = ensureLevelFields(nextSave);
      setSave(normalized);
      if (userId) {
        saveLocal(normalized, userId);
      }
    },
    [setSave, userId]
  );

  const handleAuthError = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const handleUpdateBudget = useCallback(
    (key: "industryPct" | "welfarePct" | "securityDiplomacyPct", value: number) => {
      updateBudget(key, value);
    },
    [updateBudget]
  );

  const handleAutoBalance = useCallback(() => {
    autoBalanceBudget();
  }, [autoBalanceBudget]);

  const handleSetTaxRatePct = useCallback(
    (value: number) => {
      setTaxRatePct(value);
    },
    [setTaxRatePct]
  );

  const handleReset = async () => {
    if (!token) return;
    try {
      await resetGame(token);
    } catch {
      // Best-effort reset.
    }
    setSave(null);
    navigate("/onboarding/country", { replace: true });
  };

  const applyTokenPurchaseLocal = useCallback(
    (result: BuyTokensResponse, cost: number) => {
      if (!save) return;
      const createdAt = Date.now();
      const nextNews = Array.isArray(save.news) ? [...save.news] : [];
      nextNews.unshift({
        id: `news_${createdAt}`,
        text: `Canje de tesoro por tokens: +${result.deltaTokens} tokens (-${cost} tesoro).`,
        createdAt,
        type: "SYSTEM"
      });
      if (nextNews.length > 50) {
        nextNews.length = 50;
      }
      applyServerSave({
        ...save,
        treasury: result.treasury,
        premiumTokens: result.tokens,
        updatedAt: new Date().toISOString(),
        news: nextNews
      });
    },
    [save, applyServerSave]
  );

  const handleBuyTokens = useCallback(
    async (packId: TokenPackId) => {
      if (!token) return;
      setTokenPurchaseError(null);
      setTokenPurchaseInFlight(packId);
      try {
        const result = await buyTokensWithTreasury(token, packId);
        const pack = TOKEN_PACKS.find((item) => item.id === packId);
        const cost = pack?.cost ?? Math.abs(result.deltaTreasury);
        applyTokenPurchaseLocal(result, cost);
        showToast(
          `Compra realizada: +${formatNumber(result.deltaTokens)} tokens, -${formatNumber(
            Math.abs(result.deltaTreasury)
          )} tesoro`
        );
        try {
          const refreshed = await fetchSave(token);
          if (refreshed.state) {
            applyServerSave(refreshed.state);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await handleAuthError();
            return;
          }
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await handleAuthError();
          return;
        }
        let message = "No se pudo completar la compra.";
        if (error instanceof ApiError) {
          try {
            const parsed = JSON.parse(error.body);
            if (parsed?.error) {
              message = parsed.error;
            } else if (error.body) {
              message = error.body;
            }
          } catch {
            if (error.body) {
              message = error.body;
            }
          }
        }
        setTokenPurchaseError(message);
      } finally {
        setTokenPurchaseInFlight(null);
      }
    },
    [
      token,
      applyTokenPurchaseLocal,
      applyServerSave,
      handleAuthError,
      showToast
    ]
  );

  const roleId = save?.leader.roleId ?? "PRESIDENT";
  const regimeGroup = getRegimeGroup(roleId);
  const advisors = ADVISORS_BY_REGIME[regimeGroup];

  useEffect(() => {
    if (!save || save.level !== 2) return;
    const advisorIds = advisors.map((advisor) => advisor.id);
    if (!save.level2 || save.level2.advisors.length === 0) {
      setLevel2Advisors(advisorIds);
    }
  }, [save, advisors, setLevel2Advisors]);

  if (!token) {
    navigate("/login", { replace: true });
    return null;
  }

  if (!save || !config || remoteStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow text-center">
          <h1 className="font-display text-3xl">Cargando Nivel 2...</h1>
          <p className="mt-2 text-sm text-ink/60">
            Coordinando el nuevo gabinete.
          </p>
        </div>
      </div>
    );
  }

  const level2 = save.level2;
  if (!level2) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white/80 p-8 shadow-glow text-center">
          <h1 className="font-display text-3xl">Inicializando Nivel 2...</h1>
        </div>
      </div>
    );
  }

  const inflationLabel = formatInflationRegime(level2.macro.regime);
  const inflationPct = formatPct(level2.macro.inflationPct, 1, true);
  const cbCooldown = Math.max(
    0,
    (level2.macro.centralBank.cooldownUntilTick ?? 0) - save.tickCount
  );
  const cbReady = cbCooldown === 0;

  const activeIndustryIds = new Set(level2.industries.activeIndustries);
  const baseIndustryId = level2.industries.chosenBaseIndustryId;
  const level2Projects = level2.projects ?? {};

  const isIndustryUnlocked = (industry: Level2IndustryConfig) => {
    if (level2.phase < industry.unlock.minPhaseL2) return false;
    if (industry.unlock.requiresProjectsL2?.length) {
      return industry.unlock.requiresProjectsL2.every(
        (id) => level2Projects[id]?.status === "completed"
      );
    }
    return true;
  };

  let incomeMult = 0;
  let growthAdd = 0;
  let inflationPressure = 0;
  LEVEL2_INDUSTRIES.forEach((industry) => {
    if (!activeIndustryIds.has(industry.id)) return;
    incomeMult += industry.modifiers.incomeMult;
    growthAdd += industry.modifiers.baseGrowthAddPct;
    inflationPressure += industry.modifiers.inflationPressureAdd;
  });
  const industryBreakdown = {
    incomeMult: incomeMult || 1,
    growthAdd,
    inflationPressure
  };

  const isDemocratic = DEMOCRATIC_ROLES.has(roleId);
  const electionScore =
    save.happiness * 0.35 +
    save.stability * 0.35 +
    save.institutionalTrust * 0.25 -
    save.corruption * 0.3 +
    save.reputation * 0.1;
  const winChance = clamp(electionScore / 100, 0.05, 0.95);
  const electionCooldown = Math.max(
    0,
    (level2.elections.cooldownUntilTick ?? 0) - save.tickCount
  );
  const electionReady = electionCooldown === 0;

  const advisorMap = new Map(advisors.map((advisor) => [advisor.id, advisor.name]));

  const sortedProjects = [...LEVEL2_PROJECTS].sort((a, b) => {
    const aState = level2Projects[a.id];
    const bState = level2Projects[b.id];
    const aAvailable = aState?.status === "available";
    const bAvailable = bState?.status === "available";
    if (aAvailable !== bAvailable) {
      return aAvailable ? -1 : 1;
    }
    if (a.impactScore !== b.impactScore) {
      return b.impactScore - a.impactScore;
    }
    return a.phase - b.phase;
  });

  const handleRunElection = async () => {
    if (!token) return;
    try {
      const result = await runElection(token);
      if (result.state) {
        const normalized = ensureLevelFields(result.state);
        setSave(normalized);
        if (userId) {
          saveLocal(normalized, userId);
        }
      }
      setElectionResult({ win: result.win, narrative: result.narrative });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }
    } finally {
      setConfirmElectionOpen(false);
    }
  };

  const handleElectionClose = () => {
    setElectionResult(null);
  };

  const topBar = (
    <div className="sticky top-4 z-30">
      <div className="rounded-3xl bg-white/80 p-5 shadow-glow border border-white/60 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Nivel 2
            </p>
            <h1 className="font-display text-2xl">
              {save.country.formalName || save.country.baseName}
            </h1>
            <p className="text-sm text-ink/70">{save.leader.name}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-ink/60">Tokens: {save.premiumTokens}</span>
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
              Perfil
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-sm"
            >
              Ajustes
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
              className="rounded-xl border border-ember/40 bg-white/80 px-4 py-2 text-sm text-ember"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6 stagger">
        {topBar}
        <Level2EventPopup
          save={save}
          token={token}
          onApplySave={applyServerSave}
          onSyncSave={handleSaveNow}
          onAuthError={handleAuthError}
        />

        <div className="rounded-3xl bg-white/80 p-3 shadow-glow border border-white/60">
          <div className="flex flex-wrap gap-2">
            {[
              "Gabinete",
              "Economía e Industria",
              "Proyectos",
              "Decretos"
            ].map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab
                      ? "bg-ocean text-white"
                      : "bg-white/80 text-ink/70 hover:bg-white"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </div>

        {activeTab === "Gabinete" ? (
          <Level2CabinetTab
            save={save}
            config={config}
            advisors={advisors}
            isDemocratic={isDemocratic}
            electionCooldown={electionCooldown}
            electionReady={electionReady}
            electionCost={ELECTION_COST}
            winChance={winChance}
            onCallElection={() => setConfirmElectionOpen(true)}
            onJumpToProjects={() => {
              setActiveTab("Proyectos");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : null}

        {activeTab === "Historial" ? (
          <Level2EventsTab save={save} />
        ) : null}

        {activeTab === "Economía e Industria" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
            <div className="space-y-4">
              <BudgetSliders
                budget={save.budget}
                onChange={handleUpdateBudget}
                autoBalanceUnlocked={save.iapFlags?.autoBalanceUnlocked ?? false}
                onAutoBalance={handleAutoBalance}
              />
              <TaxSelector value={save.taxRatePct} onChange={handleSetTaxRatePct} />
              <div className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
                <h2 className="font-display text-2xl">Inflacion</h2>
                <p className="mt-2 text-sm text-ink/60">
                  {inflationPct} - Regimen {inflationLabel}
                </p>
                <div className="mt-3 text-xs text-ink/50">
                  Presion industrial: {formatPct(industryBreakdown.inflationPressure, 2, true)}
                </div>
              </div>
              <div className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
                <h2 className="font-display text-2xl">Banco Central</h2>
                <p className="mt-2 text-sm text-ink/60">
                  Cooldown: {cbReady ? "Listo" : `${cbCooldown} ticks`}
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <button
                    type="button"
                    disabled={!cbReady}
                    onClick={() => runCentralBankAction("RAISE")}
                    className={`rounded-xl px-4 py-3 text-left font-semibold transition ${
                      cbReady ? "bg-ocean text-white" : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    Subir tasa (-0.4 inflacion, penaliza crecimiento)
                  </button>
                  <button
                    type="button"
                    disabled={!cbReady}
                    onClick={() => runCentralBankAction("LOWER")}
                    className={`rounded-xl px-4 py-3 text-left font-semibold transition ${
                      cbReady ? "bg-sage text-white" : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    Bajar tasa (+0.3 inflacion, impulsa crecimiento)
                  </button>
                  <button
                    type="button"
                    disabled={!cbReady || save.treasury < 80}
                    onClick={() => runCentralBankAction("INTERVENE")}
                    className={`rounded-xl px-4 py-3 text-left font-semibold transition ${
                      cbReady && save.treasury >= 80
                        ? "bg-ember text-white"
                        : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    Intervenir (-80 Tesoro, -0.6 inflacion)
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
              <h2 className="font-display text-2xl">Base industrial (Nivel 2)</h2>
              <p className="mt-2 text-sm text-ink/60">
                Elige una base y activa industrias para escalar ingresos.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {LEVEL2_INDUSTRIES.map((industry) => {
                  const unlocked = isIndustryUnlocked(industry);
                  const isBase = baseIndustryId === industry.id;
                  const isActive = activeIndustryIds.has(industry.id);
                  const capexCost = industry.attributes.capex * 15;
                  const actionLabel = isBase
                    ? "Base"
                    : isActive
                    ? "Activa"
                    : baseIndustryId
                    ? "Activar"
                    : "Elegir base";
                  const canActivate =
                    unlocked &&
                    !isActive &&
                    save.treasury >= capexCost &&
                    (baseIndustryId ? true : true);
                  return (
                    <div
                      key={industry.id}
                      className="rounded-2xl border border-ink/10 bg-white/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{industry.name}</p>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
                          {industry.group}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-ink/60">
                        {industry.shortImpactText}
                      </p>
                      <p className="mt-2 text-[11px] text-ink/50">
                        Capex: {capexCost} - Inflacion +{industry.modifiers.inflationPressureAdd}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-ink/50">
                          {unlocked ? "Disponible" : "Bloqueada"}
                        </span>
                        <button
                          type="button"
                          disabled={!unlocked || !canActivate}
                          onClick={() =>
                            baseIndustryId
                              ? activateLevel2Industry(industry.id)
                              : setLevel2BaseIndustry(industry.id)
                          }
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                            unlocked && canActivate
                              ? "bg-ocean text-white"
                              : "bg-ink/10 text-ink/40"
                          }`}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-4">
                <h3 className="text-sm font-semibold text-ink">Breakdown L2</h3>
                <div className="mt-2 text-xs text-ink/60 space-y-1">
                  <div>Multiplicador ingresos: {industryBreakdown.incomeMult.toFixed(2)}</div>
                  <div>Crecimiento extra: {formatPct(industryBreakdown.growthAdd, 2, true)}</div>
                  <div>Presion inflacion: {formatPct(industryBreakdown.inflationPressure, 2, true)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "Proyectos" ? (
          <div className="rounded-3xl bg-white/80 p-6 shadow-glow border border-white/60">
            <h2 className="font-display text-2xl">Proyectos Nivel 2</h2>
            <div className="mt-4 space-y-3 max-h-[520px] overflow-auto pr-2">
              {sortedProjects.map((project) => {
                const state = level2Projects[project.id];
                if (!state) return null;
                const progressPct = Math.min(
                  100,
                  Math.round((state.progress / project.durationTicks) * 100)
                );
                const canStart =
                  state.status === "available" && save.treasury >= project.cost;
                const recommendedBy = project.recommendedBy?.find((id) =>
                  level2.advisors.includes(id)
                );
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-ink/10 bg-white/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{project.name}</p>
                        <p className="text-xs text-ink/60">{project.description}</p>
                        {recommendedBy ? (
                          <p className="mt-1 text-[11px] text-ink/50">
                            Recomendado por: {advisorMap.get(recommendedBy) ?? recommendedBy}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-ocean/70">
                        {state.status === "available"
                          ? "Disponible"
                          : state.status === "in_progress"
                          ? "En curso"
                          : state.status === "completed"
                          ? "Completado"
                          : "Bloqueado"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-ink/60">
                      <span>Costo: {project.cost}</span>
                      <span>Fase {project.phase}</span>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 w-full rounded-full bg-ink/10">
                        <div
                          className="h-2 rounded-full bg-ocean"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-ink/60">
                        Impacto {project.impactScore}
                      </span>
                      <button
                        type="button"
                        disabled={!canStart}
                        onClick={() => startLevel2Project(project.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          canStart
                            ? "bg-ember text-white hover:bg-ember/90"
                            : "bg-ink/10 text-ink/40"
                        }`}
                      >
                        Iniciar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTab === "Decretos" ? (
          <Level2DecreesPanel
            save={save}
            token={token}
            onApplySave={applyServerSave}
            onAuthError={handleAuthError}
          />
        ) : null}
      </div>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-40 rounded-2xl bg-ink px-4 py-3 text-xs text-white shadow-soft">
          {toastMessage}
        </div>
      ) : null}

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Manual rapido" maxHeightVh={85}>
        <div className="space-y-4 text-sm text-ink/70">
          <div>
            <h4 className="text-sm font-semibold text-ink">Nivel 2: objetivo</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Avanza fases L2 con proyectos y una base industrial solida.</li>
              <li>Cuida estabilidad, felicidad y confianza para sostener el mandato.</li>
              <li>Usa decretos y Banco Central para sostener la economia.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Tabs Nivel 2</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Gabinete: indicadores, noticias, resumen, detalles y consejo del dia.</li>
              <li>Economía e Industria: inflacion, Banco Central, base industrial, presupuesto e impuestos.</li>
              <li>Proyectos: inicia y completa proyectos para subir fases.</li>
              <li>Decretos: medidas especiales con costo y cooldown.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Eventos emergentes</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Los eventos aparecen como popup en cualquier tab.</li>
              <li>Las decisiones impactan tesoro, reputacion y estabilidad.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Elecciones (si democratico)</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Cuestan tesoro y tienen cooldown: convocalas con margen.</li>
              <li>Mejora felicidad, estabilidad y confianza; baja corrupcion.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Inflacion y Banco Central</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Busca regimen estable para evitar frenos al crecimiento.</li>
              <li>Subir/bajar tasa o intervenir tiene cooldown y costo en tesoro.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Decretos</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Cada decreto consume tesoro/admin y tiene cooldown.</li>
              <li>Elige decretos segun tu regimen y fase.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Que cambia vs Nivel 1</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink/60 list-disc pl-4">
              <li>Macro con inflacion, base industrial L2 e industrias activables.</li>
              <li>Consejeros y noticias recomendando proyectos.</li>
              <li>Eventos emergentes y decretos especiales.</li>
            </ul>
          </div>
        </div>
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Ajustes" maxHeightVh={85}>
        <div className="space-y-4 text-sm text-ink/70">
          <p>Ultimo guardado: {save.updatedAt}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveNow}
              className="rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
            >
              Guardar ahora
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-ember/40 bg-white/80 px-4 py-3 text-sm text-ember"
            >
              Reset partida
            </button>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 shadow-glow border border-white/60">
            <h3 className="text-sm font-semibold text-ink">Cambiar tesoro por tokens</h3>
            <p className="mt-1 text-xs text-ink/60">
              Convierte tesoro en tokens para acciones premium.
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              {TOKEN_PACKS.map((pack) => {
                const treasury = save?.treasury ?? 0;
                const canAfford = treasury >= pack.cost;
                const isBusy = tokenPurchaseInFlight === pack.id;
                const disabled = !canAfford || Boolean(tokenPurchaseInFlight);
                return (
                  <div key={pack.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleBuyTokens(pack.id)}
                      disabled={disabled}
                      className={`w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold transition ${
                        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white"
                      }`}
                    >
                      {isBusy ? "Procesando..." : pack.label}
                    </button>
                    {!canAfford ? (
                      <span className="text-[11px] text-ember">
                        Tesoro insuficiente
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {tokenPurchaseError ? (
              <p className="mt-2 text-xs text-ember">{tokenPurchaseError}</p>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmElectionOpen}
        onClose={() => setConfirmElectionOpen(false)}
        title="Confirmar elecciones"
        maxHeightVh={85}
      >
        <p className="text-sm text-ink/70">
          Costo: {ELECTION_COST} Tesoro. Probabilidad estimada:{" "}
          {formatPct(winChance * 100, 1)}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRunElection}
            className="rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white"
          >
            Ejecutar elecciones
          </button>
          <button
            type="button"
            onClick={() => setConfirmElectionOpen(false)}
            className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(electionResult)}
        onClose={handleElectionClose}
        title="Resultado electoral"
        maxHeightVh={85}
      >
        <p className="text-sm text-ink/70">{electionResult?.narrative}</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleElectionClose}
            className="rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm"
          >
            Continuar
          </button>
        </div>
      </Modal>
    </div>
  );
}
