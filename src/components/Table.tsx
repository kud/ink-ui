import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

export type Column<T extends Record<string, unknown>> = {
  key: keyof T & string
  header: string
  width?: number
}

type TableProps<T extends Record<string, unknown>> = {
  data: T[]
  columns: Column<T>[]
}

export const Table = <T extends Record<string, unknown>>({
  data,
  columns,
}: TableProps<T>) => (
  <Box flexDirection="column">
    <Box gap={2}>
      {columns.map((col) => (
        <Box key={col.key} width={col.width} minWidth={col.width}>
          <Text bold color={colors.muted}>
            {col.header}
          </Text>
        </Box>
      ))}
    </Box>
    {data.map((row, i) => (
      <Box key={i} gap={2}>
        {columns.map((col) => (
          <Box key={col.key} width={col.width} minWidth={col.width}>
            <Text wrap="truncate-end">{String(row[col.key] ?? "")}</Text>
          </Box>
        ))}
      </Box>
    ))}
  </Box>
)
