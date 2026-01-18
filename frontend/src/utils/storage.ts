import type { GameSave } from "../types";

const SAVE_PREFIX = "microestado_save";
const TOKEN_KEY = "microestado_token";

function getSaveKey(userId: number) {
  return `${SAVE_PREFIX}.${userId}`;
}

export function loadSave(userId: number): GameSave | null {
  const raw = localStorage.getItem(getSaveKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameSave;
  } catch {
    return null;
  }
}

export function saveLocal(state: GameSave, userId: number) {
  localStorage.setItem(getSaveKey(userId), JSON.stringify(state));
}

export function clearSave(userId: number) {
  localStorage.removeItem(getSaveKey(userId));
}

export function clearLegacySave() {
  localStorage.removeItem(SAVE_PREFIX);
}

export function clearAllSaves() {
  Object.keys(localStorage).forEach((key) => {
    if (key === SAVE_PREFIX || key.startsWith(`${SAVE_PREFIX}.`)) {
      localStorage.removeItem(key);
    }
  });
}

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
