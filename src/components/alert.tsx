// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Box, Text } from "ink"
import { statusVariant, type StatusVariant } from "./status-variants.js"
import { useTheme } from "../theme/theme-provider.js"

type AlertProps = {
  variant?: StatusVariant
  title?: string
  children: React.ReactNode
}

export const Alert = ({ variant = "info", title, children }: AlertProps) => {
  const theme = useTheme()
  const { icon, color } = statusVariant(theme, variant)
  return (
    <Box
      borderStyle={theme.glyphs.border}
      borderColor={color}
      paddingX={1}
      flexDirection="column"
    >
      <Box gap={1}>
        <Text color={color} aria-label={`${variant}:`}>
          {icon}
        </Text>
        {title ? (
          <Text bold color={color}>
            {title}
          </Text>
        ) : null}
      </Box>
      <Text>{children}</Text>
    </Box>
  )
}
