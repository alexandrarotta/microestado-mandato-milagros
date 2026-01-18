import { apiFetch } from "./client";
import type { CountryInfo } from "../types";

export async function fetchCountry(token: string) {
  return apiFetch<{ country: CountryInfo; updatedAt?: string }>(
    "/api/country",
    { cache: "no-store" },
    token
  );
}

export async function createCountry(token: string, country: CountryInfo) {
  return apiFetch<{ country: CountryInfo; updatedAt?: string }>(
    "/api/country",
    {
      method: "POST",
      body: JSON.stringify(country)
    },
    token
  );
}
