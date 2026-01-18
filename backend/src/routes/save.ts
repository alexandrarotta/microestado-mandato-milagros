import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { saveSchema } from "../validation/schemas.js";

export function getSave(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = db
    .prepare("SELECT state_json, updated_at, version FROM saves WHERE user_id = ?")
    .get(userId) as
    | { state_json: string; updated_at: string; version: string }
    | undefined;

  if (!row) {
    return res.json({ state: null });
  }

  return res.json({
    state: JSON.parse(row.state_json),
    updatedAt: row.updated_at,
    version: row.version
  });
}

export function putSave(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updatedAt = parsed.data.updatedAt ?? new Date().toISOString();
  const version = parsed.data.version ?? "v1";
  const stateJson = JSON.stringify(parsed.data.state ?? {});

  db.prepare(
    `
      INSERT INTO saves (user_id, state_json, updated_at, version)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at,
        version = excluded.version
    `
  ).run(userId, stateJson, updatedAt, version);

  return res.json({ saved: true, updatedAt, version });
}
