import { apiFetch } from "./client";
import type { GameSave } from "../types";

export interface ElectionResult {
  win: boolean;
  winChance: number;
  narrative: string;
  cooldownUntilTick: number;
  state?: GameSave;
}

export async function runElection(token: string) {
  return apiFetch<ElectionResult>(
    "/api/elections/run",
    { method: "POST" },
    token
  );
}
