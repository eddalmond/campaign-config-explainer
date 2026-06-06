/**
 * Sorts a list while preserving the original index of each item.
 * Returns the sorted items and a function to map a sorted-position back to
 * the original index.
 */
export function sortWithOriginalIndex<T>(items: T[], compare: (a: T, b: T) => number): {
  sorted: T[];
  originalIndex: (sortedIndex: number) => number;
} {
  const indexed = items.map((item, originalIndex) => ({ item, originalIndex }));
  indexed.sort((a, b) => compare(a.item, b.item));
  return {
    sorted: indexed.map(x => x.item),
    originalIndex: (sortedIndex: number) => indexed[sortedIndex].originalIndex,
  };
}
