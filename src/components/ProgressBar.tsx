// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Text } from "ink"
import { colors } from "../tokens.js"

type ProgressBarProps = {
  // 0–100.
  value: number
  // Total character width of the bar.
  width?: number
}

// Filled vs empty is a block/shade shape difference (█ vs ░), so progress reads
// in greyscale; the accent colour only reinforces.
export const ProgressBar = ({ value, width = 20 }: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(100, value))
  const filled = Math.round((clamped / 100) * width)
  return (
    <Text>
      <Text color={colors.accent}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(width - filled)}</Text>
    </Text>
  )
}
