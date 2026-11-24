// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Box, Text } from "ink"
import { statusVariant, type StatusVariant } from "./status-variants.js"
import { useTheme } from "../theme/theme-provider.js"

type StatusMessageProps = {
  variant?: StatusVariant
  children: React.ReactNode
}

export const StatusMessage = ({
  variant = "info",
  children,
}: StatusMessageProps) => {
  const theme = useTheme()
  const { icon, color } = statusVariant(theme, variant)
  return (
    <Box gap={1}>
      {/* A screen reader says the word the mark stands for. */}
      <Text color={color} aria-label={`${variant}:`}>
        {icon}
      </Text>
      <Text>{children}</Text>
    </Box>
  )
}
