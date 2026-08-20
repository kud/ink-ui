import stringWidth from "string-width"

export type ColumnAlign = "left" | "center" | "right"
export type ColumnOverflow = "wrap" | "truncate"

export type LayoutColumn = {
  header: string
  width?: number
  minWidth?: number
}

// A column with nothing to show still needs to be findable, so it never shrinks
// past a few characters unless its own minWidth says otherwise.
const DEFAULT_MIN_WIDTH = 3

export const widestLine = (value: string) =>
  value
    .split("\n")
    .reduce((widest, line) => Math.max(widest, stringWidth(line)), 0)

const naturalWidth = (column: LayoutColumn, cells: string[]) =>
  cells.reduce(
    (widest, cell) => Math.max(widest, widestLine(cell)),
    widestLine(column.header),
  )

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

type ResolveOptions = {
  columns: LayoutColumn[]
  rows: string[][]
  gap: number
  maxWidth: number
}

export const resolveColumnWidths = ({
  columns,
  rows,
  gap,
  maxWidth,
}: ResolveOptions) => {
  const widths = columns.map(
    (column, index) =>
      column.width ??
      naturalWidth(
        column,
        rows.map((row) => row[index] ?? ""),
      ),
  )
  const gaps = gap * Math.max(columns.length - 1, 0)
  const excess = widths.reduce((total, width) => total + width, gaps) - maxWidth
  return excess > 0
    ? shrinkToFit(
        widths,
        columns.map((column, index) => floorFor(column, widths[index])),
        excess,
      )
    : widths
}
