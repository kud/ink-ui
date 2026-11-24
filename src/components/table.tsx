import React, { useMemo, useRef } from "react"
import { Box, Text, useStdout } from "ink"
import { glyph } from "@kud/glyphs"
import { useTheme } from "../theme/theme-provider.js"
import { paint } from "../theme/theme.js"
import { setStatusTheme } from "./table-status.js"
import {
  resolveColumnWidths,
  truncateCell,
  type ColumnAlign,
  type ColumnOverflow,
} from "./table-layout.js"
import { sortIndices, type SortDirection, type SortState } from "./table-sort.js"

export type { ColumnAlign, ColumnOverflow, SortDirection, SortState }

export type TableSelection = "single" | "multiple"

export type Column<T extends Record<string, unknown>> = {
  key: keyof T & string
  header: string
  // Fixed width in display columns — never shrunk, never grown.
  width?: number
  // Floor a measured column shrinks to when the table is too wide.
  minWidth?: number
  // Ceiling on what the content may ask for; longer cells truncate.
  maxWidth?: number
  // Share of the spare width this column takes when the table is narrower
  // than its bounds. Ignored on a column with a fixed `width`.
  flex?: number
  align?: ColumnAlign
  overflow?: ColumnOverflow
  // The text a cell shows, measures and truncates. Defaults to String(value).
  format?: (value: T[keyof T & string], row: T) => string
  // A colour token for the cell's text. Never the only carrier of a state:
  // pair it with a glyph or a word in `format`, as `statusColumn` does.
  color?: (value: T[keyof T & string], row: T) => string | undefined
  // Orders two rows when this column is sorted ascending. Defaults to
  // comparing the raw values: numbers and dates by magnitude, text by a
  // numeric collator. Empties sort last either way.
  compare?: (a: T, b: T) => number
  // Set false to keep a column out of the sort cycle.
  sortable?: boolean
}

type TableProps<T extends Record<string, unknown>> = {
  data: T[]
  columns: Column<T>[]
  gap?: number
  maxWidth?: number
  headerColor?: string
  // Passing `sort` (null included) makes the table sortable: the rows are
  // ordered by it and every sortable header reserves a slot for the ↑/↓
  // indicator, so the indicator arriving never moves a column.
  sort?: SortState | null
  // Index of the active row in display order. Draws the ❯ gutter.
  cursor?: number
  // Index of the focused column: its header is underlined.
  focusedColumn?: number
  // Draws the selection column: ■/□ for multiple, ●/○ for single.
  selection?: TableSelection
  selected?: readonly string[]
  rowKey?: (row: T, index: number) => string
  // Body rows on screen at once. The header stays put above them and only
  // that window is rendered, so ten thousand rows cost what `height` rows do.
  height?: number
  // First visible row. Computed from the cursor when omitted.
  offset?: number
  // Shown under the header when there are no rows.
  empty?: React.ReactNode
}

// Used only when nothing else can say how wide the terminal is — a piped or
// captured stdout reports no column count at all.
const FALLBACK_TERMINAL_WIDTH = 80

// Each gutter is a glyph and a space: the cursor's ❯ and the selection mark.
const GUTTER_WIDTH = 2
// The sort indicator's slot: a space and an arrow.
const SORT_SLOT = 2

const justification = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const

const cellText = (value: unknown) => String(value ?? "")

export const defaultRowKey = (_row: unknown, index: number) => String(index)

export const sortGlyph = (direction: SortDirection) =>
  glyph(direction === "asc" ? "keyUp" : "keyDown", "unicode")

const selectionGlyphs = {
  multiple: {
    on: glyph("square", "unicode"),
    off: glyph("squareEmpty", "unicode"),
  },
  single: {
    on: glyph("circle", "unicode"),
    off: glyph("circleEmpty", "unicode"),
  },
} as const

// The same marks in 7-bit, one cell each, after shui's ascii set.
const asciiSelectionGlyphs = {
  multiple: { on: "#", off: "." },
  single: { on: "*", off: "o" },
} as const

// Keep the cursor inside the window while moving the window as little as
// possible: a list that recentres on every keystroke makes the eye chase it.
// The previous offset is the starting point; it only moves when the cursor
// would fall off either edge, and never past the last full page.
export const scrollWindow = ({
  total,
  height,
  cursor,
  previous = 0,
}: {
  total: number
  height: number
  cursor: number
  previous?: number
}) => {
  if (total <= height) return 0
  const last = total - height
  const clamped = Math.min(Math.max(previous, 0), last)
  if (cursor < clamped) return Math.max(cursor, 0)
  if (cursor >= clamped + height) return Math.min(cursor - height + 1, last)
  return clamped
}

export const Table = <T extends Record<string, unknown>>({
  data,
  columns,
  gap = 2,
  maxWidth,
  headerColor: headerColorProp,
  sort,
  cursor,
  focusedColumn,
  selection,
  selected,
  rowKey = defaultRowKey,
  height,
  offset,
  empty = "No rows",
}: TableProps<T>) => {
  const { stdout } = useStdout()
  const theme = useTheme()
  const colors = theme.colors
  const headerColor = paint(theme, headerColorProp) ?? colors.muted
  const ascii = theme.icons === "ascii"
  // Status cells format against this table's theme, not the ambient one.
  setStatusTheme(theme)
  const sortable = sort !== undefined
  const hasCursor = cursor !== undefined
  const gutters = (hasCursor ? GUTTER_WIDTH : 0) + (selection ? GUTTER_WIDTH : 0)
  const bounds =
    (maxWidth ??
      // Ink 8 types stdout as a plain stream; only a TTY carries `columns`.
      (stdout as { columns?: number } | undefined)?.columns ??
      FALLBACK_TERMINAL_WIDTH) - gutters

  // Formatting and measuring touch every row, so both are memoised on the data
  // itself — never on the sort or the cursor. The columns are measured across
  // the whole data set, not the visible window, so scrolling never changes a
  // width and the grid holds still under the eye.
  const cells = useMemo(
    () =>
      data.map((row) =>
        columns.map((column) => {
          const value = row[column.key] as T[keyof T & string]
          return column.format ? column.format(value, row) : cellText(value)
        }),
      ),
    [data, columns, theme],
  )
  const widths = useMemo(
    () =>
      resolveColumnWidths({
        columns,
        rows: cells,
        gap,
        maxWidth: bounds,
        headerExtra: sortable ? SORT_SLOT : 0,
      }),
    [columns, cells, gap, bounds, sortable],
  )
  // Keyed on the sort's fields, not its identity: a caller writing the sort as
  // an inline literal must not pay for a ten-thousand-row sort on every frame.
  const sortKey = sort?.key
  const sortDirection = sort?.direction
  const order = useMemo(
    () =>
      sortKey && sortDirection
        ? sortIndices(data, columns, { key: sortKey, direction: sortDirection })
        : data.map((_, i) => i),
    [data, columns, sortKey, sortDirection],
  )

  const previousOffset = useRef(0)
  const visibleCount = height ?? order.length
  const start =
    offset ??
    scrollWindow({
      total: order.length,
      height: visibleCount,
      cursor: cursor ?? 0,
      previous: previousOffset.current,
    })
  previousOffset.current = start
  const window = order.slice(start, start + visibleCount)

  const selectedSet = useMemo(() => new Set(selected ?? []), [selected])

  // flexShrink={0} is what keeps every row's columns lining up: the widths were
  // measured once for the whole table, so letting Yoga renegotiate them per row
  // would make each row disagree with its neighbours.
  const cell = (column: Column<T>, index: number, content: React.ReactNode) => (
    <Box
      key={column.key}
      width={widths[index]}
      flexShrink={0}
      flexGrow={0}
      justifyContent={justification[column.align ?? "left"]}
    >
      {content}
    </Box>
  )

  const gutter = (key: string, content: React.ReactNode) => (
    <Box key={key} width={GUTTER_WIDTH} flexShrink={0}>
      {content}
    </Box>
  )

  const headerLabel = (column: Column<T>) => {
    if (!sortable || column.sortable === false) return column.header
    const indicator =
      sort?.key === column.key ? ` ${ascii ? (sort.direction === "asc" ? theme.glyphs.up : theme.glyphs.down) : sortGlyph(sort.direction)}` : ""
    return column.header + indicator
  }

  return (
    <Box flexDirection="column" aria-role="table">
      <Box>
        {hasCursor ? gutter("cursor", <Text> </Text>) : null}
        {selection ? gutter("selection", <Text> </Text>) : null}
        <Box gap={gap}>
          {columns.map((column, index) => {
            const focused = focusedColumn === index
            const sorted = sortable && sort?.key === column.key
            return cell(
              column,
              index,
              <Text
                bold
                underline={focused}
                color={
                  focused ? colors.accent : sorted ? undefined : headerColor
                }
                wrap="truncate-end"
              >
                {truncateCell(headerLabel(column), widths[index])}
              </Text>,
            )
          })}
        </Box>
      </Box>
      {order.length === 0 ? (
        <Box>
          {hasCursor ? gutter("cursor", <Text> </Text>) : null}
          {selection ? gutter("selection", <Text> </Text>) : null}
          {typeof empty === "string" ? (
            <Text color={colors.muted}>{empty}</Text>
          ) : (
            empty
          )}
        </Box>
      ) : null}
      {window.map((dataIndex, position) => {
        const row = data[dataIndex]!
        const rowCells = cells[dataIndex]!
        const key = rowKey(row, dataIndex)
        const active = hasCursor && start + position === cursor
        const isSelected = selectedSet.has(key)
        return (
          <Box key={key}>
            {hasCursor
              ? gutter(
                  "cursor",
                  <Text color={colors.info}>{active ? theme.glyphs.pointer : " "}</Text>,
                )
              : null}
            {selection
              ? gutter(
                  "selection",
                  <Text color={isSelected ? colors.info : colors.muted}>
                    {(ascii ? asciiSelectionGlyphs : selectionGlyphs)[selection][
                      isSelected ? "on" : "off"
                    ]}
                  </Text>,
                )
              : null}
            <Box gap={gap}>
              {columns.map((column, index) => {
                const value = row[column.key] as T[keyof T & string]
                const text = rowCells[index]!
                const wrap = column.overflow === "wrap"
                return cell(
                  column,
                  index,
                  <Text
                    bold={active}
                    color={column.color?.(value, row)}
                    wrap={wrap ? "wrap" : "truncate-end"}
                  >
                    {wrap ? text : truncateCell(text, widths[index]!)}
                  </Text>,
                )
              })}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
