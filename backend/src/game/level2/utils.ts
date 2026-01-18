import { LEVEL2_INDUSTRY_TAGS } from "./industries.catalog.js";

export type InflationRegime = "DEFLATION" | "STABLE" | "HIGH" | "HYPER";

export interface Level2Effects {
  treasury?: number;
  debt?: number;
  inflationPct?: number;
  stability?: number;
  happiness?: number;
  institutionalTrust?: number;
  corruption?: number;
  reputation?: number;
  admin?: number;
  jobs?: number;
  inequality?: number;
  innovation?: number;
  energy?: number;
  water?: number;
  envFootprint?: number;
  growthPct?: number;
}

export type NewsItem = {
  id: string;
  text: string;
  type?: "SYSTEM" | "EVENT" | "PROJECT" | "PROJECT_UNLOCK" | "PROJECT_READY";
  severity?: "OK" | "WARN" | "CRITICAL";
  createdAt: number;
};

const MAX_NEWS = 50;
const INFLATION_MIN = -1;
const INFLATION_MAX = 5;

const CLAMPED_STATS = new Set([
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
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addNews(
  state: Record<string, unknown>,
  text: string,
  type: NewsItem["type"] = "SYSTEM",
  severity: NewsItem["severity"] = "OK"
) {
  const news = Array.isArray(state.news) ? (state.news as NewsItem[]) : [];
  news.unshift({
    id: makeId("news"),
    text,
    createdAt: Date.now(),
    type,
    severity
  });
  if (news.length > MAX_NEWS) {
    news.splice(MAX_NEWS);
  }
  state.news = news;
}

export function getInflationRegime(inflationPct: number): InflationRegime {
  if (inflationPct < 0) return "DEFLATION";
  if (inflationPct < 0.5) return "STABLE";
  if (inflationPct < 2) return "HIGH";
  return "HYPER";
}

export function applyLevel2Effects(
  state: Record<string, unknown>,
  effects: Level2Effects
) {
  if (!effects) return;
  const level2 = state.level2 as
    | { macro?: { inflationPct?: number; regime?: InflationRegime } }
    | undefined;

  const applyNumeric = (key: string, delta: number) => {
    const current = state[key];
    if (typeof current !== "number") return;
    const nextValue = current + delta;
    if (CLAMPED_STATS.has(key)) {
      state[key] = clamp(nextValue, 0, 100);
    } else if (key === "treasury" || key === "admin") {
      state[key] = Math.max(0, nextValue);
    } else if (key === "gdp") {
      state[key] = Math.max(1, nextValue);
    } else {
      state[key] = nextValue;
    }
  };

  if (typeof effects.treasury === "number") {
    applyNumeric("treasury", effects.treasury);
  }
  if (typeof effects.debt === "number") {
    applyNumeric("debt", effects.debt);
  }
  if (typeof effects.admin === "number") {
    applyNumeric("admin", effects.admin);
  }
  if (typeof effects.jobs === "number") {
    applyNumeric("employment", effects.jobs);
  }
  if (typeof effects.happiness === "number") {
    applyNumeric("happiness", effects.happiness);
  }
  if (typeof effects.stability === "number") {
    applyNumeric("stability", effects.stability);
  }
  if (typeof effects.institutionalTrust === "number") {
    applyNumeric("institutionalTrust", effects.institutionalTrust);
  }
  if (typeof effects.corruption === "number") {
    applyNumeric("corruption", effects.corruption);
  }
  if (typeof effects.reputation === "number") {
    applyNumeric("reputation", effects.reputation);
  }
  if (typeof effects.inequality === "number") {
    applyNumeric("inequality", effects.inequality);
  }
  if (typeof effects.innovation === "number") {
    applyNumeric("innovation", effects.innovation);
  }
  if (typeof effects.energy === "number") {
    applyNumeric("energy", effects.energy);
  }
  if (typeof effects.envFootprint === "number") {
    applyNumeric("environmentalImpact", effects.envFootprint);
  }
  if (typeof effects.water === "number") {
    applyNumeric("resources", effects.water);
  }
  if (typeof effects.growthPct === "number") {
    applyNumeric("growthPct", effects.growthPct);
  }

  if (typeof effects.inflationPct === "number" && level2?.macro) {
    const nextInflation = clamp(
      (typeof level2.macro.inflationPct === "number"
        ? level2.macro.inflationPct
        : 0) + effects.inflationPct,
      INFLATION_MIN,
      INFLATION_MAX
    );
    level2.macro.inflationPct = nextInflation;
    const nextRegime = getInflationRegime(nextInflation);
    if (level2.macro.regime !== nextRegime) {
      level2.macro.regime = nextRegime;
      addNews(state, `Inflacion cambia a regimen ${nextRegime.toLowerCase()}.`);
    }
  }
}

export function getActiveIndustryTags(state: Record<string, unknown>) {
  const level2 = state.level2 as
    | { industries?: { activeIndustries?: string[] } }
    | undefined;
  const activeIndustries = level2?.industries?.activeIndustries ?? [];
  const tags = new Set<string>();
  activeIndustries.forEach((industryId) => {
    const industryTags = LEVEL2_INDUSTRY_TAGS[industryId] ?? [];
    industryTags.forEach((tag) => tags.add(tag));
  });
  return tags;
}

export function formatEffectsSummary(effects: Level2Effects) {
  const parts: string[] = [];
  const pushPart = (label: string, value: number, decimals = 0) => {
    const sign = value > 0 ? "+" : "";
    const formatted =
      decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
    parts.push(`${label} ${sign}${formatted}`);
  };

  const entries: Array<[string, number | undefined, string, number]> = [
    ["Tesoro", effects.treasury, "Tesoro", 0],
    ["Deuda", effects.debt, "Deuda", 0],
    ["Inflacion", effects.inflationPct, "Inflacion", 1],
    ["Felicidad", effects.happiness, "Felicidad", 0],
    ["Estabilidad", effects.stability, "Estabilidad", 0],
    ["Confianza", effects.institutionalTrust, "Confianza", 0],
    ["Corrupcion", effects.corruption, "Corrupcion", 0],
    ["Reputacion", effects.reputation, "Reputacion", 0],
    ["Admin", effects.admin, "Admin", 0],
    ["Empleo", effects.jobs, "Empleo", 0],
    ["Inequidad", effects.inequality, "Inequidad", 0],
    ["Innovacion", effects.innovation, "Innovacion", 0],
    ["Energia", effects.energy, "Energia", 0],
    ["Recursos", effects.water, "Recursos", 0],
    ["Huella", effects.envFootprint, "Huella", 0],
    ["Crecimiento", effects.growthPct, "Crecimiento", 2]
  ];

  for (const [, value, label, decimals] of entries) {
    if (typeof value === "number" && value !== 0) {
      pushPart(label, value, decimals);
    }
  }

  return parts.slice(0, 4).join(", ");
}
