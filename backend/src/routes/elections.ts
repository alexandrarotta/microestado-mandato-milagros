import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { runElectionInternal } from "../game/level2/elections.js";

export function runElection(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = db
    .prepare("SELECT state_json, version FROM saves WHERE user_id = ?")
    .get(userId) as { state_json: string; version: string } | undefined;

  if (!row) {
    return res.status(404).json({ error: "Save not found" });
  }

  const state = JSON.parse(row.state_json) as Record<string, unknown>;
  const result = runElectionInternal(state, userId, db);

  if (!result.ok) {
    return res
      .status(result.status)
      .json({ error: result.error, cooldownUntilTick: result.cooldownUntilTick });
  }

  state.updatedAt = new Date().toISOString();
  db.prepare(
    "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
  ).run(JSON.stringify(state), state.updatedAt, userId);

  return res.json({
    win: result.win,
    winChance: result.winChance,
    narrative: result.narrative,
    cooldownUntilTick: result.cooldownUntilTick,
    state
  });
}
