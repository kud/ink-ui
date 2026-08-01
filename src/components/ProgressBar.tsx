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
  // The filled portion.
  color?: string
  // The unfilled remainder. Keep it clearly darker than `color`: the two are
  // told apart by lightness, which survives any colour vision deficiency.
  trackColor?: string
}

// Solid blocks throughout, filled and unfilled alike. The previous version drew
// the remainder with a shade character (░), which dithers into a visibly
// textured, faintly three-dimensional strip beside the flat blocks around it.
// One block character in two weights of the same family sits flat instead.
//
// That trades a *shape* difference (█ vs ░) for a *lightness* one, so a truly
// monochrome terminal loses the distinction where it previously kept it — the
// reason to accept that is that lightness still separates for colourblind
// readers, which is the case that actually occurs.
export const ProgressBar = ({
  value,
  width = 20,
  color = colors.accent,
  trackColor = "#2b323d",
}: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(100, value))
  const filled = Math.round((clamped / 100) * width)
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color={trackColor}>{"█".repeat(width - filled)}</Text>
    </Text>
  )
}
