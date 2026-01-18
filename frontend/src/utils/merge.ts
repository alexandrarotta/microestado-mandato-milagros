import type { GameSave } from "../types";

export function mergeSaves(local: GameSave | null, remote: GameSave | null) {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;

  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  return localTime >= remoteTime ? local : remote;
}
