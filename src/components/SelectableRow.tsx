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
    <Text color={colors.info}>{active ? `  ${marker} ` : "    "}</Text>
    {isTextValue(children) ? <Text bold={active}>{children}</Text> : children}
  </Box>
)
