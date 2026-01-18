import { apiFetch } from "./client";
import type { GameSave, Level2EventsState, NewsItem } from "../types";

export interface Level2EventsResponse {
  events: Level2EventsState;
  news: NewsItem[];
}

export interface Level2EventResolution {
  outcomeSummary: string;
  state: GameSave;
}

export async function fetchLevel2Events(token: string) {
  return apiFetch<Level2EventsResponse>("/api/level2/events", {}, token);
}

export async function chooseLevel2Event(
  token: string,
  instanceId: string,
  optionId: string
) {
  return apiFetch<Level2EventResolution>(
    "/api/level2/events/choose",
    {
      method: "POST",
      body: JSON.stringify({ instanceId, optionId })
    },
    token
  );
}
