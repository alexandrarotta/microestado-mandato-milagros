import type { Request, Response } from "express";
import db from "../db.js";
import { telemetrySchema } from "../validation/schemas.js";

export function postTelemetry(req: Request, res: Response) {
  const parsed = telemetrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { eventName, payload } = parsed.data;
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO telemetry (user_id, event_name, payload_json, created_at) VALUES (?, ?, ?, ?)"
  ).run(null, eventName, payload ? JSON.stringify(payload) : null, now);

  return res.json({ ok: true });
}
