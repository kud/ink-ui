import stringWidth from "string-width"

export type ColumnAlign = "left" | "center" | "right"
export type ColumnOverflow = "wrap" | "truncate"

export type LayoutColumn = {
  header: string
  width?: number
  minWidth?: number
  maxWidth?: number
  flex?: number
}

// A column with nothing to show still needs to be findable, so it never shrinks
// past a few characters unless its own minWidth says otherwise.
const DEFAULT_MIN_WIDTH = 3

// Printable ASCII and Latin text (no soft hyphen) are one column a character,
// so their width is their length. Measuring is the one pass that touches every
// cell of every row, and string-width segments each string into graphemes —
// tens of microseconds a cell — so the common case skips it, and the rest is
// remembered: a status column repeats the same handful of labels ten thousand
// times.
const PLAIN = /^[\x20-\x7e\xa0-\xac\xae-\u02ff]*$/
const MEMO_LIMIT = 4096
const memo = new Map<string, number>()

export const displayWidth = (line: string) => {
  if (PLAIN.test(line)) return line.length
  const known = memo.get(line)
  if (known !== undefined) return known
  const width = stringWidth(line)
  if (memo.size >= MEMO_LIMIT) memo.clear()
  memo.set(line, width)
  return width
}

export const widestLine = (value: string) =>
  value.includes("\n")
    ? value
        .split("\n")
        .reduce((widest, line) => Math.max(widest, displayWidth(line)), 0)
    : displayWidth(value)

const naturalWidth = (column: LayoutColumn, cells: string[], extra: number) => {
  const measured = cells.reduce(
    (widest, cell) => Math.max(widest, widestLine(cell)),
    widestLine(column.header) + extra,
  )
  // A column's own ceiling caps what its content asks for, so one runaway cell
  // cannot claim the width every other row then has to give back.
  return column.maxWidth === undefined
    ? measured
    : Math.min(measured, column.maxWidth)
}

// A floor can never exceed the width it guards: a column narrower than the floor
// is already as small as its content, and raising it would grow the table while
// trying to shrink it.
const floorFor = (column: LayoutColumn, width: number) =>
  column.width !== undefined
    ? width
    : Math.min(width, column.minWidth ?? DEFAULT_MIN_WIDTH)

const widestShrinkable = (widths: number[], floors: number[]) =>
  widths.reduce(
    (best, width, index) =>
      width > floors[index] && (best === -1 || width > widths[best])
        ? index
        : best,
    -1,
  )

// Shrink the widest column that still has room, one character at a time, until the
// table fits. Taking from the widest first keeps the columns that are already tight
// readable, and stops when every flexible column has reached its floor — explicit
// widths are never touched, so an over-wide table stays over-wide rather than
// silently disagreeing with what the caller asked for.
const shrinkToFit = (widths: number[], floors: number[], excess: number) => {
  const shrunk = [...widths]
  let remaining = excess
  while (remaining > 0) {
    const target = widestShrinkable(shrunk, floors)
    if (target === -1) break
    shrunk[target] = shrunk[target] - 1
    remaining -= 1
  }
  return shrunk
}

// Spare width goes to the columns that asked for it, in proportion to their
// `flex`: one column at a time, always to the one that has had least for its
// weight, so the split is exact with no rounding left over, ties go left to
// right, and a column stops growing at its own `maxWidth` — a ceiling is a
// ceiling even when there is room. A fixed `width` always wins over `flex`.
const growToFill = (
  widths: number[],
  columns: LayoutColumn[],
  spare: number,
) => {
  const weights = columns.map((column) =>
    column.width === undefined && (column.flex ?? 0) > 0 ? column.flex! : 0,
  )
  const grown = widths.map(() => 0)
  const room = (index: number) =>
    columns[index]!.maxWidth === undefined ||
    widths[index]! + grown[index]! < columns[index]!.maxWidth!
  for (let left = spare; left > 0; left -= 1) {
    let target = -1
    for (let index = 0; index < weights.length; index += 1) {
      if (weights[index] === 0 || !room(index)) continue
      if (
        target === -1 ||
        grown[index]! / weights[index]! < grown[target]! / weights[target]!
      )
        target = index
    }
    if (target === -1) break
    grown[target] += 1
  }
  return widths.map((width, index) => width + grown[index]!)
}

type ResolveOptions = {
  columns: LayoutColumn[]
  rows: string[][]
  gap: number
  maxWidth: number
  // Width a header needs beyond its text — the sort indicator's slot — so the
  // indicator appearing never truncates the header or moves a column.
  headerExtra?: number
}

export const resolveColumnWidths = ({
  columns,
  rows,
  gap,
  maxWidth,
  headerExtra = 0,
}: ResolveOptions) => {
  const widths = columns.map(
    (column, index) =>
      column.width ??
      naturalWidth(
        column,
        rows.map((row) => row[index] ?? ""),
        headerExtra,
      ),
  )
  const gaps = gap * Math.max(columns.length - 1, 0)
  const excess = widths.reduce((total, width) => total + width, gaps) - maxWidth
  if (excess > 0)
    return shrinkToFit(
      widths,
      columns.map((column, index) => floorFor(column, widths[index])),
      excess,
    )
  return growToFill(widths, columns, -excess)
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

const ELLIPSIS = "…"

// Clip one line to `width` display columns, ending in an ellipsis. It walks
// graphemes rather than code units, so a flag, a ZWJ family or an accented
// letter built from combining marks is kept whole or dropped whole — never cut
// into a broken half — and a double-width glyph that would straddle the edge
// is dropped rather than spilling a column past it.
export const truncateLine = (line: string, width: number) => {
  if (width <= 0) return ""
  if (displayWidth(line) <= width) return line
  const budget = width - stringWidth(ELLIPSIS)
  let used = 0
  let kept = ""
  for (const { segment } of segmenter.segment(line)) {
    const cost = stringWidth(segment)
    if (used + cost > budget) break
    kept += segment
    used += cost
  }
  return kept + ELLIPSIS
}

export const truncateCell = (value: string, width: number) =>
  value
    .split("\n")
    .map((line) => truncateLine(line, width))
    .join("\n")
