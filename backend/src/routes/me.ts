import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { profileUpdateSchema } from "../validation/schemas.js";

export function getMe(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = db
    .prepare(
      `
        SELECT id, email, display_name, leader_name, pronouns, created_at, updated_at
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
        pronouns: string | null;
        created_at: string;
        updated_at: string | null;
      }
    | undefined;

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    userId: user.id,
    id: user.id,
    email: user.email,
    displayName: user.display_name ?? null,
    leaderName: user.leader_name ?? null,
    pronouns: user.pronouns ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? null
  });
}

export function updateMe(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { displayName, leaderName, pronouns } = parsed.data;
  const now = new Date().toISOString();

  db.prepare(
    `
      UPDATE users
      SET display_name = COALESCE(?, display_name),
          leader_name = COALESCE(?, leader_name),
          pronouns = COALESCE(?, pronouns),
          updated_at = ?
      WHERE id = ?
    `
  ).run(
    displayName?.trim() ?? null,
    leaderName?.trim() ?? null,
    pronouns?.trim() ?? null,
    now,
    userId
  );

  const user = db
    .prepare(
      `
        SELECT id, email, display_name, leader_name, pronouns, created_at, updated_at
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
        pronouns: string | null;
        created_at: string;
        updated_at: string | null;
      }
    | undefined;

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    userId: user.id,
    id: user.id,
    email: user.email,
    displayName: user.display_name ?? null,
    leaderName: user.leader_name ?? null,
    pronouns: user.pronouns ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? null
  });
}
