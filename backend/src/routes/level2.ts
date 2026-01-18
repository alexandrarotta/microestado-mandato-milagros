import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { maybeTriggerLevel2Event, resolveLevel2Event } from "../game/level2/events.js";
import { enactLevel2Decree } from "../game/level2/decrees.js";
import { getDecreesForRegime } from "../game/level2/decrees.catalog.js";

function loadState(userId: number) {
  const row = db
    .prepare("SELECT state_json, version FROM saves WHERE user_id = ?")
    .get(userId) as { state_json: string; version: string } | undefined;
  if (!row) return null;
  return { state: JSON.parse(row.state_json) as Record<string, unknown>, version: row.version };
}

export function getLevel2Events(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = loadState(userId);
  if (!row) {
    return res.status(404).json({ error: "Save not found" });
  }

  const { state } = row;
  if (state.level !== 2 || !state.level2) {
    return res.status(400).json({ error: "Level 2 not active" });
  }

  const triggerResult = maybeTriggerLevel2Event(state);
  if (triggerResult.updated) {
    state.updatedAt = new Date().toISOString();
    db.prepare(
      "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
    ).run(JSON.stringify(state), state.updatedAt, userId);
  }

  const level2 = state.level2 as { events?: unknown };
  const events =
    level2.events ?? { pending: null, nextCheckTick: 0, history: [] };
  return res.json({
    events,
    pending: events.pending ?? null,
    history: events.history ?? [],
    news: state.news ?? []
  });
}

export function chooseLevel2Event(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { instanceId, optionId } = req.body as {
    instanceId?: string;
    optionId?: string;
  };

  if (!instanceId || !optionId) {
    return res.status(400).json({ error: "Missing instanceId or optionId" });
  }

  const row = loadState(userId);
  if (!row) {
    return res.status(404).json({ error: "Save not found" });
  }

  const { state } = row;
  const result = resolveLevel2Event(state, instanceId, optionId, { userId, db });
  if (!result.ok) {
    return res
      .status(result.status)
      .json({ error: result.error, cooldownUntilTick: result.cooldownUntilTick });
  }

  state.updatedAt = new Date().toISOString();
  db.prepare(
    "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
  ).run(JSON.stringify(state), state.updatedAt, userId);

  const events = (state.level2 as { events?: { pending?: unknown } })?.events;
  return res.json({
    pending: events?.pending ?? null,
    lastOutcome: { outcomeSummary: result.outcomeSummary },
    outcomeSummary: result.outcomeSummary,
    state
  });
}

export function getLevel2Decrees(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const row = loadState(userId);
  if (!row) {
    return res.status(404).json({ error: "Save not found" });
  }

  const { state } = row;
  if (state.level !== 2 || !state.level2) {
    return res.status(400).json({ error: "Level 2 not active" });
  }

  const roleId = (state.leader as { roleId?: string } | undefined)?.roleId;
  const decrees = getDecreesForRegime(roleId).map((decree) => ({
    id: decree.id,
    title: decree.title,
    body: decree.body,
    cooldownTicks: decree.cooldownTicks,
    cost: decree.cost,
    requires: decree.requires
  }));

  const level2 = state.level2 as { decrees?: { cooldownUntilById?: Record<string, number>; history?: unknown[] } };
  if (!level2.decrees) {
    level2.decrees = { cooldownUntilById: {}, history: [] };
    state.updatedAt = new Date().toISOString();
    db.prepare(
      "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
    ).run(JSON.stringify(state), state.updatedAt, userId);
  }

  return res.json({
    decrees,
    cooldownUntilById: level2.decrees?.cooldownUntilById ?? {},
    history: level2.decrees?.history ?? []
  });
}

export function enactLevel2DecreeRoute(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { decreeId } = req.body as { decreeId?: string };
  if (!decreeId) {
    return res.status(400).json({ error: "Missing decreeId" });
  }

  const row = loadState(userId);
  if (!row) {
    return res.status(404).json({ error: "Save not found" });
  }

  const { state } = row;
  const result = enactLevel2Decree(state, decreeId, { userId, db });
  if (!result.ok) {
    return res
      .status(result.status)
      .json({ error: result.error, cooldownUntil: result.cooldownUntil });
  }

  state.updatedAt = new Date().toISOString();
  db.prepare(
    "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
  ).run(JSON.stringify(state), state.updatedAt, userId);

  return res.json({ summary: result.summary, state });
}
