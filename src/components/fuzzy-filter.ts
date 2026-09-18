import type { PaletteItem } from "./CommandPalette.js"

// A subsequence match: every character of the query appears in the haystack
// in order, not necessarily adjacently — `cfg` finds `config`. Substring
// matches rank above these, because a query that appears verbatim is the one
// the reader typed on purpose and a subsequence hit is a guess on their behalf.
const isSubsequence = (needle: string, haystack: string) => {
  let at = 0
  for (const ch of haystack) {
    if (ch === needle[at]) at++
    if (at === needle.length) return true
  }
  return needle.length === 0
}

const haystackOf = (item: PaletteItem) =>
  [item.title, item.group ?? "", item.hint ?? "", ...(item.keywords ?? [])]
    .join(" ")
    .toLowerCase()

/**
 * The static-list half of a launcher, as a pure function: the items that match
 * `query`, substring hits first, in the caller's order within each rank. An
 * empty or whitespace query returns every item unchanged — the palette then
 * draws them grouped — so a host that only ever has a fixed command tree can
 * hand this straight to `onQueryChange` and never filter itself.
 *
 * Deliberately NOT inside `CommandPalette`: the palette takes whatever rows the
 * host gives it and knows nothing about where they came from, which is what
 * lets a host derive rows from the query (a ticket key becomes two verbs) rather
 * than narrow a preset list. Both shapes share one component; only this helper
 * is optional.
 */
export const fuzzyFilter = (
  items: PaletteItem[],
  query: string,
): PaletteItem[] => {
  const q = query.trim().toLowerCase()
  if (!q) return items
  const substring: PaletteItem[] = []
  const subsequence: PaletteItem[] = []
  for (const item of items) {
    const hay = haystackOf(item)
    if (hay.includes(q)) substring.push(item)
    else if (isSubsequence(q, hay)) subsequence.push(item)
  }
  return [...substring, ...subsequence]
}
