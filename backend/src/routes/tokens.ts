import type { Response } from "express";
import db from "../db.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { addNews } from "../game/level2/utils.js";

const TOKEN_PACKS = {
  PACK_100: { cost: 1_000_000, tokens: 100 },
  PACK_200: { cost: 1_800_000, tokens: 200 },
  PACK_300: { cost: 2_400_000, tokens: 300 }
} as const;

type TokenPackId = keyof typeof TOKEN_PACKS;

export function buyTokens(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { pack } = req.body as { pack?: TokenPackId };
  if (!pack || !(pack in TOKEN_PACKS)) {
    return res.status(400).json({ error: "Invalid pack" });
  }

  const row = db
    .prepare("SELECT state_json FROM saves WHERE user_id = ?")
    .get(userId) as { state_json: string } | undefined;

  if (!row) {
    return res.status(404).json({ error: "Save not found" });
  }

  const state = JSON.parse(row.state_json) as Record<string, unknown>;
  const treasury =
    typeof state.treasury === "number" ? state.treasury : 0;
  const currentTokens =
    typeof state.premiumTokens === "number" ? state.premiumTokens : 0;
  const packInfo = TOKEN_PACKS[pack];

  if (treasury < packInfo.cost) {
    return res.status(400).json({ error: "Tesoro insuficiente" });
  }

  state.treasury = treasury - packInfo.cost;
  state.premiumTokens = currentTokens + packInfo.tokens;
  addNews(
    state,
    `Canje de tesoro por tokens: +${packInfo.tokens} tokens (-${packInfo.cost} tesoro).`,
    "SYSTEM"
  );

  const updatedAt = new Date().toISOString();
  state.updatedAt = updatedAt;

  db.prepare(
    "UPDATE saves SET state_json = ?, updated_at = ? WHERE user_id = ?"
  ).run(JSON.stringify(state), updatedAt, userId);

  return res.json({
    tokens: state.premiumTokens,
    treasury: state.treasury,
    purchasedPack: pack,
    deltaTokens: packInfo.tokens,
    deltaTreasury: -packInfo.cost
  });
}
