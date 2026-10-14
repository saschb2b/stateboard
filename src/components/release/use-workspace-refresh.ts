"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  createWorkspaceDrafts,
  createWorkspaceRefresh,
} from "@/lib/workspace-refresh";

export function useWorkspaceRefresh<T>({
  load,
  onReceive,
  onError,
  enabled = true,
}: {
  load: () => Promise<T>;
  onReceive: (value: T) => void;
  onError: (cause: unknown) => void;
  enabled?: boolean;
}) {
  const [requests] = useState(createWorkspaceRefresh);
  const [drafts] = useState(createWorkspaceDrafts);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (drafts.hasDrafts()) return;
    const request = requests.read(load, (value) => {
      if (!drafts.hasDrafts()) onReceive(value);
    });
    if (!request) return;
    setRefreshing(true);
    try {
      await request;
    } finally {
      if (requests.isActive()) setRefreshing(requests.isReading());
    }
  }
  const refreshVisible = useEffectEvent(() => {
    if (document.visibilityState === "visible") void refresh().catch(onError);
  });
  useEffect(() => {
    requests.activate();
    if (!enabled) return () => requests.deactivate();
    const onVisible = () => refreshVisible();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(onVisible, 30_000);
    const unsubscribe = drafts.subscribe(() => {
      requests.invalidateReads();
      setRefreshing(false);
      if (!drafts.hasDrafts()) onVisible();
    });
    return () => {
      requests.deactivate();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [enabled, requests, drafts]);

  return {
    refresh,
    refreshing,
    drafts,
    write: (operation: () => Promise<T>) =>
      requests.write(operation, onReceive),
  };
}
