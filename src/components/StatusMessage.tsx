// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Box, Text } from "ink"
import { statusVariant, type StatusVariant } from "./status-variants.js"

type StatusMessageProps = {
  variant?: StatusVariant
  children: React.ReactNode
}

export const StatusMessage = ({
  variant = "info",
  children,
}: StatusMessageProps) => {
  const { icon, color } = statusVariant(variant)
  return (
    <Box gap={1}>
      <Text color={color}>{icon}</Text>
      <Text>{children}</Text>
    </Box>
  )
}
