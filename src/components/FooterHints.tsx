import React from "react"
import { Box, Text } from "ink"

export type Hint = [key: string, label: string]

type FooterHintsProps = {
  hints: Hint[]
}

// columnGap, not gap: `gap` sets both axes, so once the hints wrap — which they
// do in any narrow terminal, or inside a border — the 2 meant as spacing between
// hints also became 2 blank rows between hint lines, shoving the footer around.
export const FooterHints = ({ hints }: FooterHintsProps) => (
  <Box columnGap={2} rowGap={0} flexWrap="wrap">
    {hints.map(([key, label]) => (
      <Box key={key}>
        <Text color="white">{key}</Text>
        <Text dimColor>{" " + label}</Text>
      </Box>
    ))}
  </Box>
)
