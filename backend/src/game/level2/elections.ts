import type Database from "better-sqlite3";

const DEMOCRATIC_ROLE_IDS = new Set([
  "PRESIDENT",
  "PRIME_MINISTER",
  "KING_PARLIAMENT",
  "CHANCELLOR"
]);

const ELECTION_COOLDOWN_TICKS = Number(
  process.env.ELECTION_COOLDOWN_TICKS ?? 600
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseMedals(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }
  } catch {
    // ignore parse errors
  }
  return [] as string[];
}

export function runElectionInternal(
  state: Record<string, unknown>,
  userId: number,
  db: Database,
  { bypassCooldown = false }: { bypassCooldown?: boolean } = {}
):
  | {
      ok: true;
      win: boolean;
      winChance: number;
      narrative: string;
      cooldownUntilTick: number;
    }
  | { ok: false; status: number; error: string; cooldownUntilTick?: number } {
  const level = state.level === 2 ? 2 : 1;
  const level2 = state.level2 as
    | { gameOver?: boolean; gameOverReason?: string | null; elections?: { cooldownUntilTick?: number } }
    | undefined;

  if (level !== 2 || !level2) {
    return { ok: false, status: 400, error: "Level 2 not active" };
  }

  const leader = state.leader as { roleId?: string } | undefined;
  const roleId = leader?.roleId ?? "";
  if (!DEMOCRATIC_ROLE_IDS.has(roleId)) {
    return { ok: false, status: 403, error: "Regime not democratic" };
  }

  const tickCount = typeof state.tickCount === "number" ? state.tickCount : 0;
  const cooldownUntilTick =
    typeof level2.elections?.cooldownUntilTick === "number"
      ? level2.elections?.cooldownUntilTick
      : 0;

  if (!bypassCooldown && tickCount < cooldownUntilTick) {
    return {
      ok: false,
      status: 400,
      error: "Cooldown active",
      cooldownUntilTick
    };
  }

  const happiness = typeof state.happiness === "number" ? state.happiness : 0;
  const stability = typeof state.stability === "number" ? state.stability : 0;
  const institutionalTrust =
    typeof state.institutionalTrust === "number" ? state.institutionalTrust : 0;
  const corruption = typeof state.corruption === "number" ? state.corruption : 0;
  const reputation = typeof state.reputation === "number" ? state.reputation : 0;

  const score =
    happiness * 0.35 +
    stability * 0.35 +
    institutionalTrust * 0.25 -
    corruption * 0.3 +
    reputation * 0.1;
  const winChance = clamp(score / 100, 0.05, 0.95);
  const win = Math.random() < winChance;

  const currentTreasury = typeof state.treasury === "number" ? state.treasury : 0;
  state.treasury = Math.max(0, currentTreasury - 100);

  level2.elections = {
    cooldownUntilTick: tickCount + ELECTION_COOLDOWN_TICKS
  };

  let narrative = "";
  if (win) {
    state.reputation = clamp(reputation + 5, 0, 100);
    state.institutionalTrust = clamp(institutionalTrust + 5, 0, 100);
    narrative = "La coalicion ratifica el mandato con respaldo amplio.";

    const user = db
      .prepare("SELECT medals_json FROM users WHERE id = ?")
      .get(userId) as { medals_json: string | null } | undefined;
    const medals = parseMedals(user?.medals_json ?? null);
    if (!medals.includes("REELECTION_L2")) {
      medals.push("REELECTION_L2");
      db.prepare("UPDATE users SET medals_json = ? WHERE id = ?").run(
        JSON.stringify(medals),
        userId
      );
    }
  } else {
    level2.gameOver = true;
    level2.gameOverReason = "Derrota electoral";
    narrative = "La oposicion gana y el gabinete entrega el poder.";
  }

  state.level2 = level2;

  return {
    ok: true,
    win,
    winChance,
    narrative,
    cooldownUntilTick: level2.elections.cooldownUntilTick ?? 0
  };
}
