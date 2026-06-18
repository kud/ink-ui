import React from "react"
import { Box, Text } from "ink"

export type Hint = [key: string, label: string]

type FooterHintsProps = {
  hints: Hint[]
}

export const FooterHints = ({ hints }: FooterHintsProps) => (
  <Box gap={2} flexWrap="wrap">
    {hints.map(([key, label]) => (
      <Box key={key}>
        <Text color="white">{key}</Text>
        <Text dimColor>{" " + label}</Text>
      </Box>
    ))}
  </Box>
)
