import { apiFetch } from "./client";
import type { GameSave } from "../types";

export async function resetGame(token: string) {
  return apiFetch<{ ok: boolean }>("/api/game/reset", { method: "POST" }, token);
}

export async function rescueGame(token: string) {
  return apiFetch<{ state: GameSave; updatedAt?: string }>(
    "/api/game/rescue",
    { method: "POST" },
    token
  );
}

export async function continueToLevel2(token: string) {
  return apiFetch<{ state?: GameSave }>(
    "/api/game/continue-to-level2",
    { method: "POST" },
    token
  );
}
