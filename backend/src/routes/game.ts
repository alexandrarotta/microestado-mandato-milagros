import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export function resetGame(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.prepare("DELETE FROM saves WHERE user_id = ?").run(userId);
  return res.json({ ok: true });
}

export function rescueGame(req: AuthenticatedRequest, res: Response) {
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
  const currentTreasury =
    typeof state.treasury === "number" ? state.treasury : 0;
  const updatedAt = new Date().toISOString();
  const nextState = {
    ...state,
    treasury: currentTreasury + 200,
    updatedAt
  };

  db.prepare(
    "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
  ).run(JSON.stringify(nextState), updatedAt, userId);

  return res.json({ state: nextState, updatedAt, version: row.version });
}

export function continueToLevel2(req: AuthenticatedRequest, res: Response) {
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
  const phase = typeof state.phase === "number" ? state.phase : 1;
  const level1Complete =
    state.level1Complete === true || (phase >= 4 && state.level !== 2);

  if (!level1Complete) {
    return res.status(400).json({ error: "Level 1 not complete" });
  }

  if (state.level === 2 && state.level2) {
    return res.json({ state, version: row.version });
  }

  const nextState = {
    ...state,
    level: 2,
    level1Complete: true,
      level2: {
        phase: 1,
        complete: false,
        gameOver: false,
        elections: { cooldownUntilTick: 0 },
        events: { pending: null, nextCheckTick: 0, history: [] },
        decrees: { cooldownUntilById: {}, history: [] },
        macro: {
          inflationPct: 0.2,
          regime: "STABLE",
          centralBank: { cooldownUntilTick: 0 }
        },
      advisors: [],
      industries: { chosenBaseIndustryId: null, activeIndustries: [] },
      projects: {}
    }
  };

  const updatedAt = new Date().toISOString();
  nextState.updatedAt = updatedAt;

  db.prepare(
    "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
  ).run(JSON.stringify(nextState), updatedAt, userId);

  return res.json({ state: nextState, updatedAt, version: row.version });
}
