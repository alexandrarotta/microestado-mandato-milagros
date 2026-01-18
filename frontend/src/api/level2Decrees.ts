import { apiFetch } from "./client";
import type { GameSave, Level2DecreeHistoryItem } from "../types";

export interface Level2DecreeInfo {
  id: string;
  title: string;
  body: string;
  cooldownTicks: number;
  cost: { treasury?: number; admin?: number };
  requires?: { minPhase?: number; regimesAny?: string[] };
}

export interface Level2DecreeListResponse {
  decrees: Level2DecreeInfo[];
  cooldownUntilById: Record<string, number>;
  history: Level2DecreeHistoryItem[];
}

export interface Level2DecreeResult {
  summary: string;
  state: GameSave;
}

export async function fetchLevel2Decrees(token: string) {
  return apiFetch<Level2DecreeListResponse>("/api/level2/decrees", {}, token);
}

export async function enactLevel2Decree(token: string, decreeId: string) {
  return apiFetch<Level2DecreeResult>(
    "/api/level2/decrees/enact",
    {
      method: "POST",
      body: JSON.stringify({ decreeId })
    },
    token
  );
}
