/** Restore order without restoring stale screen data or dropping new uploads. */
export function applySavedOrder<T extends { id: string }>(
  current: T[],
  savedIds: string[],
): T[] {
  const positions = new Map(savedIds.map((id, index) => [id, index]));
  return current.toSorted(
    (a, b) =>
      (positions.get(a.id) ?? savedIds.length) -
      (positions.get(b.id) ?? savedIds.length),
  );
}
