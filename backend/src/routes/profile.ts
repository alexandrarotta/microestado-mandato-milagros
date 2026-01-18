import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { profilePatchSchema } from "../validation/schemas.js";

type SaveSnapshot = {
  country?: Record<string, unknown>;
  leader?: { name?: string; roleId?: string };
};

const DEFAULT_TOURISM_INDEX = 20;
const DEFAULT_TOURISM_CAPACITY = 20;
const DEFAULT_TOURISM_PRESSURE = 5;

function parseMedals(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }
  } catch {
    // Ignore parse errors.
  }
  return [] as string[];
}

function readSaveSnapshot(userId: number): SaveSnapshot | null {
  const saveRow = db
    .prepare("SELECT state_json FROM saves WHERE user_id = ?")
    .get(userId) as { state_json: string } | undefined;
  if (!saveRow) return null;
  try {
    return JSON.parse(saveRow.state_json) as SaveSnapshot;
  } catch {
    return null;
  }
}

function readCountry(userId: number, saveState: SaveSnapshot | null) {
  const countryRow = db
    .prepare("SELECT country_json FROM countries WHERE user_id = ?")
    .get(userId) as { country_json: string } | undefined;
  if (countryRow) {
    try {
      return JSON.parse(countryRow.country_json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return saveState?.country ?? null;
}

function buildProfile(userId: number) {
  const user = db
    .prepare(
      `
        SELECT id, email, display_name, leader_name, medals_json
        FROM users
        WHERE id = ?
      `
    )
    .get(userId) as
    | {
        id: number;
        email: string;
        display_name: string | null;
        leader_name: string | null;
        medals_json: string | null;
      }
    | undefined;

  if (!user) return null;

  const medals = parseMedals(user.medals_json);
  const saveState = readSaveSnapshot(userId);
  const country = readCountry(userId, saveState);
  const leaderName = saveState?.leader?.name ?? null;
  const regime = saveState?.leader?.roleId ?? null;

  return {
    email: user.email,
    displayName: user.leader_name ?? leaderName ?? user.display_name ?? null,
    country,
    regime,
    medals,
    motto:
      country && typeof country === "object" && "motto" in country
        ? (country.motto as string | null)
        : null
  };
}

export function getProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profile = buildProfile(userId);
  if (!profile) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(profile);
}

function upsertCountryMotto(
  userId: number,
  motto: string,
  saveState: SaveSnapshot | null
) {
  const countryRow = db
    .prepare("SELECT country_json FROM countries WHERE user_id = ?")
    .get(userId) as { country_json: string } | undefined;
  const now = new Date().toISOString();
  if (countryRow) {
    const current = JSON.parse(countryRow.country_json) as Record<string, unknown>;
    const next = { ...current, motto };
    db.prepare("UPDATE countries SET country_json = ?, updated_at = ? WHERE user_id = ?")
      .run(JSON.stringify(next), now, userId);
    return;
  }

  const fallback = saveState?.country;
  if (!fallback || typeof fallback !== "object") return;
  const nextCountry = { ...fallback, motto };

  db.prepare(
    `
      INSERT INTO countries (
        user_id,
        country_json,
        created_at,
        updated_at,
        tourism_index,
        tourism_capacity,
        tourism_pressure
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        country_json = excluded.country_json,
        updated_at = excluded.updated_at,
        tourism_index = excluded.tourism_index,
        tourism_capacity = excluded.tourism_capacity,
        tourism_pressure = excluded.tourism_pressure
    `
  ).run(
    userId,
    JSON.stringify(nextCountry),
    now,
    now,
    DEFAULT_TOURISM_INDEX,
    DEFAULT_TOURISM_CAPACITY,
    DEFAULT_TOURISM_PRESSURE
  );
}

export function updateProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = profilePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { displayName, motto, addMedal } = parsed.data;
  const now = new Date().toISOString();
  const saveState = readSaveSnapshot(userId);

  if (displayName !== undefined || addMedal) {
    const user = db
      .prepare("SELECT leader_name, medals_json FROM users WHERE id = ?")
      .get(userId) as { leader_name: string | null; medals_json: string | null } | undefined;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const medals = parseMedals(user.medals_json);
    if (addMedal && !medals.includes(addMedal)) {
      medals.push(addMedal);
    }
    db.prepare(
      `
        UPDATE users
        SET leader_name = COALESCE(?, leader_name),
            medals_json = ?,
            updated_at = ?
        WHERE id = ?
      `
    ).run(
      displayName?.trim() ?? null,
      JSON.stringify(medals),
      now,
      userId
    );
  }

  if (motto !== undefined) {
    upsertCountryMotto(userId, motto.trim(), saveState);
  }

  const profile = buildProfile(userId);
  if (!profile) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(profile);
}
