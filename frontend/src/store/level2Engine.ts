import type {
  ConfigPayload,
  GameSave,
  InflationRegime,
  Level2IndustryConfig,
  Level2ProjectConfig,
  Level2ProjectState
} from "../types";
import { clamp } from "../utils/clamp";
import { makeId } from "../utils/random";

const MAX_NEWS = 50;
const INCOME_BASE_SCALE = 0.02;
const OPEX_COST_SCALE = 2.5;
const INFLATION_MIN = -1;
const INFLATION_MAX = 5;

const LEVEL2_PHASE_THRESHOLDS = {
  phase2: 3,
  phase3: 6,
  phase4: 10
};

export function getInflationRegime(inflationPct: number): InflationRegime {
  if (inflationPct < 0) return "DEFLATION";
  if (inflationPct < 0.5) return "STABLE";
  if (inflationPct < 2) return "HIGH";
  return "HYPER";
}

function addNews(save: GameSave, text: string) {
  save.news.unshift({
    id: makeId("news"),
    text,
    createdAt: Date.now(),
    type: "SYSTEM",
    severity: "OK"
  });
  if (save.news.length > MAX_NEWS) {
    save.news = save.news.slice(0, MAX_NEWS);
  }
}

export function buildLevel2ProjectsState(
  projects: Level2ProjectConfig[],
  save: GameSave
) {
  const next: Record<string, Level2ProjectState> = {};
  projects.forEach((project) => {
    const available = meetsLevel2ProjectRequirements(project, save);
    next[project.id] = {
      status: available ? "available" : "locked",
      progress: 0
    };
  });
  return next;
}

export function meetsLevel2ProjectRequirements(
  project: Level2ProjectConfig,
  save: GameSave
) {
  const level2 = save.level2;
  if (!level2) return false;
  const req = project.requirements ?? {};
  if (typeof req.minPhaseL2 === "number" && level2.phase < req.minPhaseL2) {
    return false;
  }
  if (req.requiresBaseIndustryId) {
    if (level2.industries.chosenBaseIndustryId !== req.requiresBaseIndustryId) {
      return false;
    }
  }
  if (req.requiresIndustries?.length) {
    const active = new Set(level2.industries.activeIndustries);
    if (!req.requiresIndustries.every((id) => active.has(id))) return false;
  }
  if (req.requiresAdvisorIds?.length) {
    const advisors = new Set(level2.advisors);
    if (!req.requiresAdvisorIds.some((id) => advisors.has(id))) return false;
  }
  if (req.requiresProjects?.length) {
    if (
      !req.requiresProjects.every(
        (id) => level2.projects[id]?.status === "completed"
      )
    ) {
      return false;
    }
  }
  if (req.requiresCentralBankAction) {
    const lastActionTick = level2.macro.centralBank.lastActionTick ?? 0;
    if (lastActionTick <= 0) return false;
  }
  return true;
}

export function applyLevel2ProjectEffects(save: GameSave, effects: Record<string, number>) {
  const level2 = save.level2;
  if (!level2) return;
  for (const [key, value] of Object.entries(effects)) {
    if (key === "inflationPct") {
      level2.macro.inflationPct = clamp(
        level2.macro.inflationPct + value,
        INFLATION_MIN,
        INFLATION_MAX
      );
      continue;
    }
    if (key in save) {
      const current = save[key as keyof GameSave];
      if (typeof current === "number") {
        const nextValue = current + value;
        if (
          [
            "happiness",
            "stability",
            "institutionalTrust",
            "corruption",
            "reputation",
            "employment",
            "energy",
            "innovation",
            "inequality",
            "environmentalImpact",
            "resources"
          ].includes(key)
        ) {
          (save as Record<string, number>)[key] = clamp(nextValue, 0, 100);
        } else if (key === "gdp") {
          (save as Record<string, number>)[key] = Math.max(1, nextValue);
        } else {
          (save as Record<string, number>)[key] = nextValue;
        }
      }
    }
  }
}

function recalcLevel2Phase(level2: GameSave["level2"]) {
  if (!level2) return 1;
  const completed = Object.values(level2.projects).filter(
    (state) => state.status === "completed"
  ).length;
  if (completed >= LEVEL2_PHASE_THRESHOLDS.phase4) return 4;
  if (completed >= LEVEL2_PHASE_THRESHOLDS.phase3) return 3;
  if (completed >= LEVEL2_PHASE_THRESHOLDS.phase2) return 2;
  return 1;
}

function ensureProjectsState(
  save: GameSave,
  projects: Level2ProjectConfig[]
) {
  if (!save.level2) return;
  if (!save.level2.projects || Object.keys(save.level2.projects).length === 0) {
    save.level2.projects = buildLevel2ProjectsState(projects, save);
    return;
  }
  for (const project of projects) {
    if (!save.level2.projects[project.id]) {
      save.level2.projects[project.id] = {
        status: meetsLevel2ProjectRequirements(project, save) ? "available" : "locked",
        progress: 0
      };
    }
  }
}

function refreshProjectAvailability(
  save: GameSave,
  projects: Level2ProjectConfig[]
) {
  if (!save.level2) return;
  for (const project of projects) {
    const state = save.level2.projects[project.id];
    if (!state || state.status === "completed" || state.status === "in_progress") {
      continue;
    }
    state.status = meetsLevel2ProjectRequirements(project, save)
      ? "available"
      : "locked";
  }
}

export function applyLevel2Tick(
  save: GameSave,
  config: ConfigPayload,
  industries: Level2IndustryConfig[],
  projects: Level2ProjectConfig[]
) {
  const level2 = save.level2;
  if (!level2) return;
  if (!save.news) {
    save.news = [];
  }

  ensureProjectsState(save, projects);

  const activeIndustries = new Set(level2.industries.activeIndustries);
  if (
    level2.industries.chosenBaseIndustryId &&
    !activeIndustries.has(level2.industries.chosenBaseIndustryId)
  ) {
    activeIndustries.add(level2.industries.chosenBaseIndustryId);
    level2.industries.activeIndustries = Array.from(activeIndustries);
  }

  const industryMap = new Map(
    industries.map((industry) => [industry.id, industry])
  );
  const activeIndustryConfigs = level2.industries.activeIndustries
    .map((id) => industryMap.get(id))
    .filter((item): item is Level2IndustryConfig => Boolean(item));

  let incomeMultSum = 0;
  let growthAdd = 0;
  let inflationPressure = 0;
  let pollutionAdd = 0;
  let opexCost = 0;

  for (const industry of activeIndustryConfigs) {
    incomeMultSum += industry.modifiers.incomeMult;
    growthAdd += industry.modifiers.baseGrowthAddPct;
    inflationPressure += industry.modifiers.inflationPressureAdd;
    pollutionAdd += industry.modifiers.pollutionAdd;
    opexCost += industry.attributes.opex * OPEX_COST_SCALE;
  }

  const baseIncome = save.gdp * INCOME_BASE_SCALE;
  const incomeL2 = baseIncome * (incomeMultSum > 0 ? incomeMultSum : 1);

  let netIncome = incomeL2 - opexCost;
  if (level2.macro.regime === "DEFLATION") {
    netIncome *= 0.95;
    save.institutionalTrust = clamp(save.institutionalTrust - 0.1, 0, 100);
  }

  save.treasury = Math.max(0, save.treasury + netIncome);

  if (pollutionAdd !== 0) {
    save.environmentalImpact = clamp(
      save.environmentalImpact + pollutionAdd,
      0,
      100
    );
  }

  let inflationNext = level2.macro.inflationPct + inflationPressure;
  inflationNext = clamp(inflationNext, INFLATION_MIN, INFLATION_MAX);
  const nextRegime = getInflationRegime(inflationNext);
  if (nextRegime !== level2.macro.regime) {
    level2.macro.regime = nextRegime;
    addNews(
      save,
      `Inflacion cambia a regimen ${nextRegime.toLowerCase()}.`
    );
  }
  level2.macro.inflationPct = inflationNext;

  const centralBank = level2.macro.centralBank;
  if (
    centralBank.effectUntilTick &&
    save.tickCount >= centralBank.effectUntilTick
  ) {
    centralBank.effectUntilTick = undefined;
    centralBank.growthEffectPct = 0;
  }

  let inflationPenalty = 0;
  if (level2.macro.regime === "HIGH") {
    inflationPenalty = 0.3;
    save.happiness = clamp(save.happiness - 0.1, 0, 100);
  }
  if (level2.macro.regime === "HYPER") {
    inflationPenalty = 0.6;
    save.happiness = clamp(save.happiness - 0.3, 0, 100);
  }

  const growthEffect = centralBank.growthEffectPct ?? 0;
  const effectiveGrowthPct =
    growthAdd +
    save.growthPct * config.economy.gdpGrowthScale +
    growthEffect -
    inflationPenalty;
  save.gdp = Math.max(1, save.gdp * (1 + effectiveGrowthPct / 100));

  for (const project of projects) {
    const state = level2.projects[project.id];
    if (!state) continue;
    if (state.status === "in_progress") {
      state.progress += 1;
      if (state.progress >= project.durationTicks) {
        state.status = "completed";
        applyLevel2ProjectEffects(save, project.effects);
        addNews(save, `Nivel 2 completa: ${project.name}.`);
      }
    }
  }

  refreshProjectAvailability(save, projects);

  level2.phase = recalcLevel2Phase(level2);
  if (level2.phase >= 4) {
    level2.complete = true;
  }

  save.tickCount += 1;
  save.lastTickAt = Date.now();
}
