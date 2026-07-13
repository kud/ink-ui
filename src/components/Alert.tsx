// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Box, Text } from "ink"
import { statusVariant, type StatusVariant } from "./status-variants.js"

type AlertProps = {
  variant?: StatusVariant
  title?: string
  children: React.ReactNode
}

export const Alert = ({ variant = "info", title, children }: AlertProps) => {
  const { icon, color } = statusVariant(variant)
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      flexDirection="column"
    >
      <Box gap={1}>
        <Text color={color}>{icon}</Text>
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
