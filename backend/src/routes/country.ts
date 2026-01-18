import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { countrySchema } from "../validation/schemas.js";

function normalizeGeography(value: string | undefined) {
  if (!value) return "urban";
  return value.toLowerCase();
}

const DEFAULT_TOURISM_INDEX = 20;
const DEFAULT_TOURISM_CAPACITY = 20;
const DEFAULT_TOURISM_PRESSURE = 5;

export function getCountry(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = db
    .prepare("SELECT country_json, updated_at FROM countries WHERE user_id = ?")
    .get(userId) as { country_json: string; updated_at: string } | undefined;

  if (!row) {
    const saveRow = db
      .prepare("SELECT state_json FROM saves WHERE user_id = ?")
      .get(userId) as { state_json: string } | undefined;
    if (!saveRow) {
      return res.status(404).json({ error: "Country not found" });
    }

    const state = JSON.parse(saveRow.state_json) as { country?: Record<string, unknown> };
    if (!state.country) {
      return res.status(404).json({ error: "Country not found" });
    }

    const now = new Date().toISOString();
    const country = {
      ...state.country,
      geography: normalizeGeography(state.country.geography as string | undefined)
    };

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
      JSON.stringify(country),
      now,
      now,
      DEFAULT_TOURISM_INDEX,
      DEFAULT_TOURISM_CAPACITY,
      DEFAULT_TOURISM_PRESSURE
    );

    return res.json({ country, updatedAt: now });
  }

  return res.json({
    country: JSON.parse(row.country_json),
    updatedAt: row.updated_at
  });
}

export function createCountry(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = countrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const now = new Date().toISOString();
  const country = {
    ...parsed.data,
    geography: normalizeGeography(parsed.data.geography)
  };

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
    JSON.stringify(country),
    now,
    now,
    DEFAULT_TOURISM_INDEX,
    DEFAULT_TOURISM_CAPACITY,
    DEFAULT_TOURISM_PRESSURE
  );

  return res.json({ country, updatedAt: now });
}
