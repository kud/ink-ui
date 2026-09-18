import React from "react"
import { Box, Text, useStdout } from "ink"
import { colors } from "../tokens.js"
import {
  resolveColumnWidths,
  type ColumnAlign,
  type ColumnOverflow,
} from "./table-layout.js"

export type { ColumnAlign, ColumnOverflow }

export type Column<T extends Record<string, unknown>> = {
  key: keyof T & string
  header: string
  width?: number
  minWidth?: number
  align?: ColumnAlign
  overflow?: ColumnOverflow
}

type TableProps<T extends Record<string, unknown>> = {
  data: T[]
  columns: Column<T>[]
  gap?: number
  maxWidth?: number
  headerColor?: string
}

// Used only when nothing else can say how wide the terminal is — a piped or
// captured stdout reports no column count at all.
const FALLBACK_TERMINAL_WIDTH = 80

const justification = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const

const cellText = (value: unknown) => String(value ?? "")

export const Table = <T extends Record<string, unknown>>({
  data,
  columns,
  gap = 2,
  maxWidth,
  headerColor = colors.muted,
}: TableProps<T>) => {
  const { stdout } = useStdout()
  const rows = data.map((row) =>
    columns.map((column) => cellText(row[column.key])),
  )
  const widths = resolveColumnWidths({
    columns,
    rows,
    gap,
    maxWidth: maxWidth ?? stdout?.columns ?? FALLBACK_TERMINAL_WIDTH,
  })

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

  return (
    <Box flexDirection="column">
      <Box gap={gap}>
        {columns.map((column, index) =>
          cell(
            column,
            index,
            <Text bold color={headerColor} wrap="truncate-end">
              {column.header}
            </Text>,
          ),
        )}
      </Box>
      {rows.map((cells, rowIndex) => (
        <Box key={rowIndex} gap={gap}>
          {columns.map((column, index) =>
            cell(
              column,
              index,
              <Text wrap={column.overflow === "wrap" ? "wrap" : "truncate-end"}>
                {cells[index]}
              </Text>,
            ),
          )}
        </Box>
      ))}
    </Box>
  )
}
