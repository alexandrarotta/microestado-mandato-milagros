import { apiFetch } from "./client";
import type { UserProfile } from "../types";

export async function fetchMe(token: string) {
  return apiFetch<UserProfile>(
    "/api/me",
    { cache: "no-store" },
    token
  );
}

export async function updateMe(
  token: string,
  payload: { displayName?: string; leaderName?: string; pronouns?: string }
) {
  return apiFetch<UserProfile>(
    "/api/me",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    token
  );
}
