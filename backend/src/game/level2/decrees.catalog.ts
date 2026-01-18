import type { Level2Effects } from "./utils.js";

export interface Level2DecreeDef {
  id: string;
  title: string;
  body: string;
  cooldownTicks: number;
  cost: { treasury?: number; admin?: number };
  requires?: { minPhase?: 1 | 2 | 3 | 4; regimesAny?: string[] };
  effects: Level2Effects;
  action?: "CALL_ELECTIONS";
  summary?: string;
}

const DEMOCRATIC_ROLE_IDS = new Set([
  "PRESIDENT",
  "PRIME_MINISTER",
  "KING_PARLIAMENT",
  "CHANCELLOR"
]);

const AUTHORITARIAN_ROLE_IDS = new Set([
  "DICTATOR",
  "SUPREME_LEADER",
  "DICTATORSHIP"
]);

const DEMOCRACY_DECREES: Level2DecreeDef[] = [
  {
    id: "DEC_CALL_ELECTIONS",
    title: "Llamar a elecciones",
    body: "Convoca a la ciudadania y renueva el mandato.",
    cooldownTicks: 600,
    cost: { treasury: 100 },
    effects: {},
    action: "CALL_ELECTIONS",
    summary: "Elecciones convocadas."
  },
  {
    id: "DEC_SOCIAL_PACT",
    title: "Pacto social",
    body: "Acuerdo amplio para calmar tensiones.",
    cooldownTicks: 240,
    cost: { treasury: 140 },
    effects: {
      happiness: 8,
      institutionalTrust: 6,
      inequality: -8,
      stability: 2,
      inflationPct: 0.1
    },
    summary: "Se firma un pacto amplio con sindicatos y empresas."
  },
  {
    id: "DEC_POLICE_REFORM",
    title: "Reforma policial",
    body: "Reestructura y mejora los protocolos.",
    cooldownTicks: 240,
    cost: { treasury: 90 },
    effects: { stability: 6, corruption: -6, reputation: 1, happiness: -2 },
    summary: "Se anuncia una reforma con control civil."
  },
  {
    id: "DEC_TRANSPARENCY",
    title: "Transparencia",
    body: "Publica datos y reduce discrecionalidad.",
    cooldownTicks: 200,
    cost: { treasury: 60 },
    effects: { corruption: -10, institutionalTrust: 6, reputation: 3, stability: -1 },
    summary: "Se abren contratos y licitaciones al publico."
  },
  {
    id: "DEC_ANTI_INFLATION_PROGRAM",
    title: "Programa anti-inflacion",
    body: "Paquete de medidas para bajar precios.",
    cooldownTicks: 180,
    cost: { treasury: 80 },
    effects: { inflationPct: -0.6, institutionalTrust: 1, growthPct: -0.08 },
    summary: "Se lanza un programa con metas duras."
  },
  {
    id: "DEC_DIGITALIZATION",
    title: "Digitalizacion",
    body: "Moderniza tramites y reduce tiempos.",
    cooldownTicks: 260,
    cost: { treasury: 120 },
    requires: { minPhase: 2 },
    effects: { innovation: 8, corruption: -3, treasury: 40 },
    summary: "Se digitaliza el estado con ventanillas nuevas."
  },
  {
    id: "DEC_ENERGY_EFFICIENCY",
    title: "Eficiencia energetica",
    body: "Plan nacional de ahorro y eficiencia.",
    cooldownTicks: 240,
    cost: { treasury: 110 },
    requires: { minPhase: 2 },
    effects: { energy: 10, reputation: 3, inflationPct: -0.2 },
    summary: "Se incentiva tecnologia eficiente en todo el pais."
  }
];

const AUTHORITARIAN_DECREES: Level2DecreeDef[] = [
  {
    id: "DEC_CURFEW",
    title: "Toque de queda",
    body: "Restringe movimientos para controlar la calle.",
    cooldownTicks: 180,
    cost: { treasury: 40 },
    effects: { stability: 8, happiness: -6, reputation: -4, institutionalTrust: -3 },
    summary: "Se impone un toque de queda nacional."
  },
  {
    id: "DEC_MEDIA_CONTROL",
    title: "Control de medios",
    body: "Centraliza mensajes y reduce criticas.",
    cooldownTicks: 220,
    cost: { treasury: 50 },
    effects: { stability: 4, institutionalTrust: -6, corruption: 4, reputation: -3 },
    summary: "Se ordena un control estricto de la informacion."
  },
  {
    id: "DEC_STRONG_EMERGENCY",
    title: "Estado de emergencia reforzado",
    body: "Amplia poderes ejecutivos y restricciones.",
    cooldownTicks: 300,
    cost: { treasury: 90 },
    effects: { stability: 12, corruption: 2, happiness: -8, reputation: -6 },
    summary: "Se anuncia emergencia con medidas excepcionales."
  }
];

const NEUTRAL_DECREES: Level2DecreeDef[] = [
  {
    id: "DEC_EFFICIENCY_PLAN",
    title: "Plan de eficiencia",
    body: "Recorta gastos y ajusta procesos.",
    cooldownTicks: 180,
    cost: { treasury: 60 },
    effects: { treasury: 40, admin: 2, corruption: -2 },
    summary: "Se aprueba un plan de eficiencia fiscal."
  },
  {
    id: "DEC_SYMBOLIC_WORKS",
    title: "Obras simbolicas",
    body: "Proyectos visibles para levantar el animo.",
    cooldownTicks: 200,
    cost: { treasury: 80 },
    effects: { happiness: 4, stability: 1, reputation: 1 },
    summary: "Se inauguran obras con corte de cinta."
  },
  {
    id: "DEC_EXPERT_COMMISSION",
    title: "Comision de expertos",
    body: "Consulta tecnica para decisiones complejas.",
    cooldownTicks: 160,
    cost: { treasury: 50 },
    effects: { institutionalTrust: 3, innovation: 2 },
    summary: "Se convoca a una comision tecnocratica."
  }
];

export function getDecreesForRegime(roleId?: string) {
  if (roleId && DEMOCRATIC_ROLE_IDS.has(roleId)) return DEMOCRACY_DECREES;
  if (roleId && AUTHORITARIAN_ROLE_IDS.has(roleId)) return AUTHORITARIAN_DECREES;
  return NEUTRAL_DECREES;
}
