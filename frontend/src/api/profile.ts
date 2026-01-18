import { apiFetch } from "./client";
import type { ProfilePayload } from "../types";

export async function fetchProfile(token: string) {
  return apiFetch<ProfilePayload>(
    "/api/profile",
    { cache: "no-store" },
    token
  );
}

export async function updateProfile(
  token: string,
  payload: { displayName?: string; motto?: string; addMedal?: string }
) {
  return apiFetch<ProfilePayload>(
    "/api/profile",
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}
