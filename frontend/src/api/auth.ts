import { apiFetch } from "./client";

export interface AuthResponse {
  token: string;
}

export async function registerUser(payload: {
  email: string;
  password: string;
}) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function logoutUser() {
  return apiFetch<void>("/api/logout", {
    method: "POST"
  });
}
