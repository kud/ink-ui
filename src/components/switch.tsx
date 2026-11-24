import React from "react"
import { Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import { paint } from "../theme/theme.js"

export type SwitchValue = "left" | "right"

type SwitchProps = {
  left: string
  right: string
  value: SwitchValue
  color?: string
}

// A two-mode selector rendered as a dot slider: the filled dot sits on the
// active side. `left ●─○ right` (left active) / `left ○─● right` (right active).
// Presentational — the caller owns the keypress that flips `value`.
export const Switch = ({
  left,
  right,
  value,
  color,
}: SwitchProps) => {
  const theme = useTheme()
  const colors = theme.colors
  const tint = paint(theme, color) ?? colors.accent
  const { dot, dotEmpty, rule } = theme.glyphs
  const leftActive = value === "left"
  return (
    <Text aria-label={`${left} / ${right}: ${leftActive ? left : right}`}>
      <Text
        color={leftActive ? tint : undefined}
        bold={leftActive}
        dimColor={!leftActive}
      >
        {left}
      </Text>
      <Text> </Text>
      <Text color={leftActive ? tint : colors.muted}>
        {leftActive ? dot : dotEmpty}
      </Text>
      <Text color={colors.muted}>{rule}</Text>
      <Text color={!leftActive ? tint : colors.muted}>
        {!leftActive ? dot : dotEmpty}
      </Text>
      <Text> </Text>
      <Text
        color={!leftActive ? tint : undefined}
        bold={!leftActive}
        dimColor={leftActive}
      >
        {right}
      </Text>
    </Text>
  )
}
