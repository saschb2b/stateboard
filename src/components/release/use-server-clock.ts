"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Advance server time with a monotonic clock; the browser wall clock is untrusted. */
export function useServerClock(initialTime: number, frozen: boolean) {
  const [now, setNow] = useState(initialTime);
  const clock = useRef<{ time: number; startedAt: number | null }>({
    time: initialTime,
    startedAt: null,
  });
  useEffect(() => {
    if (frozen) return;
    const monotonic = performance.now();
    const previous = clock.current;
    const elapsed =
      previous.startedAt === null
        ? 0
        : Math.max(0, monotonic - previous.startedAt);
    clock.current = {
      time: Math.max(initialTime, previous.time + elapsed),
      startedAt: monotonic,
    };
  }, [initialTime, frozen]);
  const advance = useCallback(() => {
    const current = clock.current;
    const elapsed =
      current.startedAt === null
        ? 0
        : Math.max(0, performance.now() - current.startedAt);
    setNow(current.time + elapsed);
  }, []);
  const anchor = useCallback((serverTime: number) => {
    clock.current = { time: serverTime, startedAt: performance.now() };
    setNow(serverTime);
  }, []);
  return { now, advance, anchor };
}
