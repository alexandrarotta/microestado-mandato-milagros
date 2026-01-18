import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";

const dataDir = path.join(process.cwd(), "..", "shared", "data");

function readJson(fileName: string) {
  const filePath = path.join(dataDir, fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function buildConfig() {
  const roles = readJson("roles.json");
  const projects = readJson("projects.json");
  const events = readJson("events.json");
  const economy = readJson("economy.json");
  const policyPresets = readJson("policyPresets.json");
  const stateTypes = readJson("stateTypes.json");
  const industries = readJson("industries.json");
  const iapConfig = readJson("iapConfig.json");
  const remoteConfigKeys = readJson("remoteConfigKeys.json");

  const payload = {
    roles,
    projects,
    events,
    economy,
    policyPresets,
    stateTypes,
    industries,
    iapConfig,
    remoteConfigKeys
  };

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  return { payload, hash };
}

export function getConfig(req: Request, res: Response) {
  try {
    const { payload, hash } = buildConfig();
    return res.json({ ...payload, version: hash });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load config" });
  }
}
