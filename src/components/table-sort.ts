export type SortDirection = "asc" | "desc"

export type SortState = {
  key: string
  direction: SortDirection
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === ""

// The comparator a column gets when it does not bring its own: numbers and
// dates by magnitude, booleans false-first, everything else as text through a
// numeric collator so `item-9` sorts before `item-10` and case does not split
// a list in two.
export const compareValues = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "boolean" && typeof b === "boolean")
    return Number(a) - Number(b)
  return collator.compare(String(a), String(b))
}

type SortableColumn<T> = {
  key: string
  compare?: (a: T, b: T) => number
}

// A stable sort that keeps empties at the bottom in both directions — judged on
// the raw value, so a column with its own comparator gets the same rule: a missing
// value is not "smaller" than every real one, it is absent, and flipping the
// direction should reorder the data rather than bring the blanks to the top.
// Ties fall back to the original index, so equal rows keep the order the
// caller gave them however many times the sort is cycled.
export const sortIndices = <T extends Record<string, unknown>>(
  data: readonly T[],
  columns: readonly SortableColumn<T>[],
  sort: SortState | null | undefined,
): number[] => {
  const identity = () => data.map((_, index) => index)
  if (!sort) return identity()
  const column = columns.find((candidate) => candidate.key === sort.key)
  if (!column) return identity()
  const sign = sort.direction === "asc" ? 1 : -1
  const indexed = data.map((row, index) => ({ row, index }))
  indexed.sort((left, right) => {
    const a = left.row[sort.key]
    const b = right.row[sort.key]
    const emptyA = isEmpty(a)
    const emptyB = isEmpty(b)
    if (emptyA !== emptyB) return emptyA ? 1 : -1
    if (!emptyA) {
      const order = column.compare
        ? column.compare(left.row, right.row)
        : compareValues(a, b)
      if (order !== 0) return sign * order
    }
    return left.index - right.index
  })
  return indexed.map(({ index }) => index)
}

export const sortRows = <T extends Record<string, unknown>>(
  data: readonly T[],
  columns: readonly SortableColumn<T>[],
  sort: SortState | null | undefined,
): T[] => sortIndices(data, columns, sort).map((index) => data[index]!)

// One key cycles a column through ascending, descending and back to the
// order the data arrived in — the third state matters, because "unsorted" is
// often the order the source meant (most recent first, by relevance).
// Moving to a different column always starts it ascending.
export const nextSort = (
  current: SortState | null | undefined,
  key: string,
): SortState | null => {
  if (!current || current.key !== key) return { key, direction: "asc" }
  if (current.direction === "asc") return { key, direction: "desc" }
  return null
}
