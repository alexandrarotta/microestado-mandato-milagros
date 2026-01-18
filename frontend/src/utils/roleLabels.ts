import type { Gender } from "../types";

const ROLE_LABELS = {
  PRESIDENT: {
    male: "Presidente",
    female: "Presidenta",
    neutral: "Jefatura de Estado"
  },
  KING_ABSOLUTE: {
    male: "Rey",
    female: "Reina",
    neutral: "La Corona"
  },
  KING_PARLIAMENT: {
    male: "Rey (Parlamentario)",
    female: "Reina (Parlamentaria)",
    neutral: "Monarquia Parlamentaria"
  },
  PRIME_MINISTER: {
    male: "Primer Ministro",
    female: "Primera Ministra",
    neutral: "Jefatura de Gobierno"
  },
  DICTATOR: {
    male: "Dictador",
    female: "Dictadora",
    neutral: "El Regimen"
  },
  CHANCELLOR: {
    male: "Canciller",
    female: "Canciller",
    neutral: "Cancilleria"
  },
  SUPREME_LEADER: {
    male: "Lider Supremo",
    female: "Lider Suprema",
    neutral: "Liderazgo Supremo"
  },
  DICTATORSHIP: {
    male: "Jefe de la Dictadura",
    female: "Jefa de la Dictadura",
    neutral: "La Dictadura"
  }
} as const;

export function formatRoleTitle(roleId: string, gender: Gender) {
  const labels = ROLE_LABELS[roleId as keyof typeof ROLE_LABELS];
  if (!labels) return "Liderazgo";
  if (gender === "OTHER" || gender === "PREFER_NOT_SAY") {
    return labels.neutral;
  }
  if (gender === "FEMALE") {
    return labels.female;
  }
  return labels.male;
}
