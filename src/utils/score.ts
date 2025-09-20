// src/utils/score.ts
export function computeCeilPercentages(scores: Record<string, number>): Record<string, number> {
  const entries = Object.entries(scores);
  const total = entries.reduce((s, [, v]) => s + (typeof v === 'number' ? v : 0), 0);

  if (total === 0) {
    // return zeros if nothing counted
    const zeros: Record<string, number> = {};
    entries.forEach(([k]) => (zeros[k] = 0));
    return zeros;
  }

  // initial ceil percent for each category
  const percentMap: Record<string, number> = {};
  entries.forEach(([k, v]) => {
    const pct = Math.ceil((v / total) * 100);
    percentMap[k] = pct;
  });

  // ensure total of percentages equals 100 by reducing from highest values if needed
  let sum = Object.values(percentMap).reduce((s, n) => s + n, 0);

  if (sum > 100) {
    // reduce the excess starting from the largest value(s)
    let excess = sum - 100;
    // create array of keys sorted by percent desc
    const sortedKeys = Object.keys(percentMap).sort((a, b) => percentMap[b] - percentMap[a]);
    let i = 0;
    while (excess > 0 && i < sortedKeys.length) {
      const key = sortedKeys[i];
      const canReduce = Math.min(excess, percentMap[key]); // never go negative
      // ensure we don't reduce below 0
      percentMap[key] = Math.max(0, percentMap[key] - canReduce);
      excess -= canReduce;
      i++;
      if (i === sortedKeys.length && excess > 0) {
        // wrap around just in case (shouldn't happen)
        i = 0;
      }
    }
  } else if (sum < 100) {
    // if somehow sum < 100 (e.g. rounding to zero), distribute the remaining to the largest
    let deficit = 100 - sum;
    const sortedKeys = Object.keys(percentMap).sort((a, b) => percentMap[b] - percentMap[a]);
    let idx = 0;
    while (deficit > 0 && sortedKeys.length > 0) {
      percentMap[sortedKeys[idx % sortedKeys.length]] += 1;
      deficit -= 1;
      idx++;
    }
  }

  return percentMap;
}
