import { apiFetch } from "./client";
import type { GameSave } from "../types";

export async function fetchSave(token: string) {
  return apiFetch<{ state: GameSave | null; updatedAt?: string }>(
    "/api/save",
    { cache: "no-store" },
    token
  );
}

export async function putSave(token: string, state: GameSave, version: string) {
  return apiFetch<{ saved: boolean; updatedAt: string; version: string }>(
    "/api/save",
    {
      method: "PUT",
      body: JSON.stringify({ state, updatedAt: state.updatedAt, version })
    },
    token
  );
}
