import { describe, expect, it } from "vitest";
import { ADMIN_UNLOCK_PROJECT_ID, syncAdminUnlock } from "./engine";
import { getAdminHint } from "../utils/admin";
import type { GameSave } from "../types";

const makeSave = (
  status: "completed" | "available" | "locked",
  adminUnlocked: boolean
) =>
  ({
    adminUnlocked,
    projects: {
      [ADMIN_UNLOCK_PROJECT_ID]: { status, progress: 0 }
    }
  }) as GameSave;

describe("admin unlock", () => {
  it("unlocks admin when Contraloria is completed", () => {
    const save = makeSave("completed", false);
    syncAdminUnlock(save);
    expect(save.adminUnlocked).toBe(true);
  });

  it("locks admin when Contraloria is not completed", () => {
    const save = makeSave("available", true);
    syncAdminUnlock(save);
    expect(save.adminUnlocked).toBe(false);
  });
});

describe("admin hint", () => {
  it("does not show Bloqueado when admin is unlocked", () => {
    expect(getAdminHint(0, true)).toBe("+0.000/tick");
  });
});
