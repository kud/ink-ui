// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import { paint } from "../theme/theme.js"

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
// readers, which is the case that actually occurs. Where the theme draws no
// colour at all there is no lightness either, so the remainder takes the
// shape back (`░`, or `.` in ASCII) and the bar still says how far it got.
export const ProgressBar = ({
  value,
  width = 20,
  color,
  trackColor,
}: ProgressBarProps) => {
  const theme = useTheme()
  const clamped = Math.max(0, Math.min(100, value))
  const filled = Math.round((clamped / 100) * width)
  const rest = theme.policy.color ? theme.glyphs.bar : theme.glyphs.barEmpty
  return (
    <Text aria-label={`${Math.round(clamped)}%`}>
        <Text color={paint(theme, color) ?? theme.colors.accent}>
          {theme.glyphs.bar.repeat(filled)}
        </Text>
        <Text color={paint(theme, trackColor) ?? theme.colors.track}>
          {rest.repeat(width - filled)}
        </Text>
    </Text>
  )
}
