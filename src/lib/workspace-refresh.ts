import { createMutationQueue } from "./mutation-queue.ts";

export function createWorkspaceDrafts() {
  const open = new Set<symbol>();
  const listeners = new Set<() => void>();
  return {
    hasDrafts: () => open.size > 0,
    register() {
      const id = Symbol();
      open.add(id);
      listeners.forEach((listener) => listener());
      return () => {
        if (open.delete(id)) listeners.forEach((listener) => listener());
      };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Discard outdated reads and keep local writes ahead of background refreshes. */
export function createWorkspaceRefresh() {
  const enqueue = createMutationQueue();
  let generation = 0;
  let lifecycle = 0;
  let active = true;
  let reading: number | null = null;
  let pendingWrites = 0;

  return {
    activate() {
      active = true;
    },
    deactivate() {
      active = false;
      generation += 1;
      lifecycle += 1;
      reading = null;
    },
    isActive: () => active,
    isReading: () => reading !== null,
    invalidateReads() {
      generation += 1;
      reading = null;
    },
    read<T>(load: () => Promise<T>, receive: (value: T) => void) {
      if (!active || pendingWrites > 0 || reading !== null) return null;
      const ticket = ++generation;
      reading = ticket;
      return load()
        .then((value) => {
          if (active && ticket === generation) receive(value);
        })
        .catch((cause: unknown) => {
          if (active && ticket === generation) throw cause;
        })
        .finally(() => {
          if (reading === ticket) reading = null;
        });
    },
    write<T>(operation: () => Promise<T>, receive: (value: T) => void) {
      const startedIn = lifecycle;
      pendingWrites += 1;
      generation += 1;
      reading = null;
      return enqueue("workspace", operation)
        .then((value) => {
          if (active && lifecycle === startedIn) receive(value);
          return value;
        })
        .finally(() => {
          pendingWrites -= 1;
          generation += 1;
        });
    },
  };
}
