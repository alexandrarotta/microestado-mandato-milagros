import { apiFetch } from "./client";
import type { ConfigPayload } from "../types";

export async function fetchConfig() {
  return apiFetch<ConfigPayload>("/api/config", { cache: "no-store" });
}
