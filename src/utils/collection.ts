// src\utils\collection.ts
export function shuffle<T>(list: T[] | undefined): T[] | undefined {
  if (!list) return undefined;
  let n = list.length;
  while (n-- > 1) {
    const k = Math.floor(Math.random() * (n + 1));
    [list[n], list[k]] = [list[k], list[n]];
  }
  return list;
}
