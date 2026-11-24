import { statusVariant, type StatusVariant } from "./status-variants.js"
import type { Column } from "./table.js"
import type { Theme } from "../theme/theme.js"
import { ambientTheme } from "../theme/theme-provider.js"

export type TableStatus = StatusVariant | "pending"

// Waiting is not news: `pending` takes the hollow ring and no hue, so a board
// full of queued rows stays quiet and the one failure stands out.
//
// A column spec is built outside any render, so it cannot read the theme
// itself: `Table` hands it the theme it is drawing with, just before it
// formats a cell, and a column used on its own falls back to the ambient one.
let drawingTheme: Theme | undefined

/** Internal: `Table` sets the theme its status cells are formatted in. */
export const setStatusTheme = (theme: Theme | undefined): void => {
  drawingTheme = theme
}

const glyphFor = (status: TableStatus) => {
  const theme = drawingTheme ?? ambientTheme()
  return status === "pending"
    ? { icon: theme.glyphs.pending, color: theme.colors.pending }
    : statusVariant(theme, status)
}

// Ascending puts what needs attention first: a failure outranks a warning,
// which outranks work still running, then information, then done.
const SEVERITY: Record<TableStatus, number> = {
  error: 0,
  warning: 1,
  pending: 2,
  info: 3,
  success: 4,
}

type StatusColumnOptions<T extends Record<string, unknown>> = Omit<
  Column<T>,
  "format" | "color" | "compare"
> & {
  // The state of a row, or undefined for a row with none (drawn empty).
  status: (row: T) => TableStatus | undefined
  // The word beside the glyph. Defaults to the cell's own value.
  label?: (row: T) => string
}

// A column whose cell is a state: the glyph carries it, the word names it and
// the colour token only reinforces both, so it survives a colourblind reader
// and a piped terminal alike. Sorting it orders by severity, not alphabet.
export const statusColumn = <T extends Record<string, unknown>>({
  status,
  label,
  ...column
}: StatusColumnOptions<T>): Column<T> => {
  const rank = (row: T) => {
    const state = status(row)
    return state === undefined ? Number.POSITIVE_INFINITY : SEVERITY[state]
  }
  return {
    ...column,
    format: (value, row) => {
      const state = status(row)
      if (state === undefined) return ""
      const word = label ? label(row) : String(value ?? state)
      return `${glyphFor(state).icon} ${word}`
    },
    color: (_value, row) => {
      const state = status(row)
      return state === undefined ? undefined : glyphFor(state).color
    },
    compare: (a, b) => {
      const left = rank(a)
      const right = rank(b)
      return left === right ? 0 : left < right ? -1 : 1
    },
  }
}
