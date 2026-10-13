/** Preserve write order per resource without blocking unrelated resources. */
export function createMutationQueue() {
  const tails = new Map<string, Promise<void>>();
  return function enqueue<T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const task = (tails.get(key) ?? Promise.resolve()).then(operation);
    const settled = task.then(
      () => {},
      () => {},
    );
    tails.set(key, settled);
    void settled.then(() => {
      if (tails.get(key) === settled) tails.delete(key);
    });
    return task;
  };
}
