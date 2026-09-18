import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

type SelectableRowProps = {
  active?: boolean
  marker?: string
  children: React.ReactNode
}

const isTextValue = (value: React.ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number"

export const SelectableRow = ({
  active = false,
  marker = "❯",
  children,
}: SelectableRowProps) => (
  <Box>
    {/* The gutter must never shrink. A row whose content overflows its
        container compresses every flexible child, and this one is four
        characters wide — losing a single column to that shifts the whole row
        left and breaks alignment with its neighbours, but only for rows long
        enough to overflow, which is why it survives short test fixtures. */}
    <Box flexShrink={0}>
      <Text color={colors.info}>{active ? `  ${marker} ` : "    "}</Text>
    </Box>
    {isTextValue(children) ? <Text bold={active}>{children}</Text> : children}
  </Box>
)
