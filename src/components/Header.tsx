import React from "react"
import { Box, Text } from "ink"

type HeaderProps = {
  children: string
  subtitle?: string
}

export const Header = ({ children, subtitle }: HeaderProps) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>
      {children}
    </Text>
    {subtitle && <Text dimColor>{subtitle}</Text>}
  </Box>
)
