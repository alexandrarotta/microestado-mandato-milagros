import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import { chooseLevel2Event, fetchLevel2Events } from "../../../api/level2Events";
import type { GameSave, NewsItem } from "../../../types";
import Level2EventModal from "./Level2EventModal";

interface Level2EventPopupProps {
  save: GameSave;
  token: string;
  onApplySave: (save: GameSave) => void;
  onSyncSave: () => Promise<void>;
  onAuthError: () => Promise<void>;
}

const MAX_NEWS = 50;

function mergeNews(existing: NewsItem[], incoming: NewsItem[]) {
  const byId = new Map<string, NewsItem>();
  existing.forEach((item) => byId.set(item.id, item));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_NEWS);
}

export default function Level2EventPopup({
  save,
  token,
  onApplySave,
  onSyncSave,
  onAuthError
}: Level2EventPopupProps) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPendingIdRef = useRef<string | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const pending = save.level2?.events?.pending ?? null;
  const pendingId = pending?.instanceId ?? null;

  useEffect(() => {
    if (!pendingId) {
      lastPendingIdRef.current = null;
      return;
    }
    if (pendingId !== lastPendingIdRef.current) {
      lastPendingIdRef.current = pendingId;
      setDismissedId(null);
      setResultSummary(null);
      setError(null);
    }
  }, [pendingId]);

  const open = Boolean(resultSummary) || (Boolean(pendingId) && pendingId !== dismissedId);

  const refreshEvents = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetchLevel2Events(token);
      const currentSave = saveRef.current;
      const mergedNews = mergeNews(currentSave.news ?? [], response.news ?? []);
      const nextSave: GameSave = {
        ...currentSave,
        level2: {
          ...currentSave.level2,
          events: response.events
        },
        news: mergedNews
      };
      onApplySave(nextSave);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await onAuthError();
      }
    }
  }, [token, onApplySave, onAuthError]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    const interval = window.setInterval(refreshEvents, 15000);
    return () => window.clearInterval(interval);
  }, [refreshEvents]);

  const handleSelect = useCallback(
    async (optionId: string) => {
      if (!pending || !token) return;
      setIsResolving(true);
      setError(null);
      try {
        await onSyncSave();
        const response = await chooseLevel2Event(
          token,
          pending.instanceId,
          optionId
        );
        if (response.state) {
          onApplySave(response.state);
        }
        setResultSummary(response.outcomeSummary);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await onAuthError();
          return;
        }
        setError("No se pudo resolver el evento.");
      } finally {
        setIsResolving(false);
      }
    },
    [pending, token, onSyncSave, onApplySave, onAuthError]
  );

  const handleClose = useCallback(() => {
    if (resultSummary) {
      setResultSummary(null);
      return;
    }
    if (pendingId) {
      setDismissedId(pendingId);
    }
  }, [resultSummary, pendingId]);

  const handleCloseResult = useCallback(() => {
    setResultSummary(null);
  }, []);

  if (!save.level2) return null;

  return (
    <Level2EventModal
      open={open}
      pending={pending}
      isResolving={isResolving}
      error={error}
      resultSummary={resultSummary}
      onSelect={handleSelect}
      onClose={handleClose}
      onCloseResult={handleCloseResult}
    />
  );
}
