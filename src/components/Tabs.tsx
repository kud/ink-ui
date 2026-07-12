import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

export type TabItem<T extends string = string> = {
  value: T
  label: string
  count?: number
}

type TabsProps<T extends string> = {
  active: T
  items: TabItem<T>[]
}

// The active tab is marked by an underline (border-bottom) under it, in the
// accent colour; inactive tabs get none. The underline's presence — not its
// hue — is what distinguishes the active tab, so it reads correctly in
// greyscale and for colourblind users. Two rows (labels, then underlines) keep
// the `─` runs aligned under each label since both share the same cell widths
// and gap.
export const Tabs = <T extends string>({ active, items }: TabsProps<T>) => {
  const cells = items.map((item) => ({
    key: item.value,
    text:
      item.count !== undefined ? `${item.label} (${item.count})` : item.label,
    isActive: item.value === active,
  }))

  return (
    <Box flexDirection="column">
      <Box gap={2}>
        {cells.map((cell) => (
          <Text
            key={cell.key}
            bold={cell.isActive}
            color={cell.isActive ? colors.accent : undefined}
            dimColor={!cell.isActive}
          >
            {cell.text}
          </Text>
        ))}
      </Box>
      <Box gap={2}>
        {cells.map((cell) => (
          <Text key={cell.key} color={colors.accent}>
            {cell.isActive
              ? "─".repeat(cell.text.length)
              : " ".repeat(cell.text.length)}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
