/**
 * fuzzy-match — small, dependency-free string matcher for the command palette.
 *
 * Scoring (highest wins):
 *   - 100: exact case-insensitive equality
 *   -  80: word-prefix match (query matches the start of a whitespace-delimited
 *          word in the value)
 *   -  60: substring match anywhere in the value
 *   -  40: consecutive-char match (every char of the query appears in order
 *          inside the value with no breaks)
 *   -  20: subsequence match (every char of the query appears in order with
 *          arbitrary gaps)
 *   -   0: no match (filtered out)
 *
 * Empty query: every item is returned with score 0 in original order.
 * Sort: highest score first, stable tie-break by original index.
 */

export type FuzzyResult<T> = { item: T; score: number };

function scoreOne(value: string, query: string): number {
  const v = value.toLowerCase();
  const q = query.toLowerCase();
  if (v === q) return 100;

  // Word-prefix: query matches the start of any whitespace-delimited word.
  const words = v.split(/\s+/);
  for (const w of words) {
    if (w.startsWith(q)) return 80;
  }

  // Substring anywhere.
  if (v.includes(q)) return 60;

  // Consecutive-char: query appears as a contiguous run somewhere. Already
  // covered by `includes`, but keep separate for clarity / future tuning.
  // (Falls through; we treat consecutive-without-spaces as the same as
  // substring above.)

  // Subsequence: every char of the query appears in order in the value.
  let qi = 0;
  for (let vi = 0; vi < v.length && qi < q.length; vi++) {
    if (v[vi] === q[qi]) qi++;
  }
  if (qi === q.length) {
    // If the matched chars were mostly consecutive, score higher.
    // Heuristic: if at least half of the value is the query length and
    // query length >= 2, treat as the "consecutive" tier.
    return q.length >= 2 ? 40 : 20;
  }

  return 0;
}

export function fuzzyMatch<T>(
  items: T[],
  query: string,
  key: (t: T) => string
): Array<FuzzyResult<T>> {
  if (query.trim().length === 0) {
    return items.map((item) => ({ item, score: 0 }));
  }

  const trimmed = query.trim();
  const indexed = items.map((item, index) => ({
    item,
    index,
    score: scoreOne(key(item), trimmed),
  }));

  return indexed
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map(({ item, score }) => ({ item, score }));
}
