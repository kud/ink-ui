import React from "react"
import { Text } from "ink"
import { colors } from "../tokens.js"

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
  color = colors.accent,
}: SwitchProps) => {
  const leftActive = value === "left"
  return (
    <Text>
      <Text
        color={leftActive ? color : undefined}
        bold={leftActive}
        dimColor={!leftActive}
      >
        {left}
      </Text>
      <Text> </Text>
      <Text color={leftActive ? color : colors.muted}>
        {leftActive ? "●" : "○"}
      </Text>
      <Text color={colors.muted}>─</Text>
      <Text color={!leftActive ? color : colors.muted}>
        {!leftActive ? "●" : "○"}
      </Text>
      <Text> </Text>
      <Text
        color={!leftActive ? color : undefined}
        bold={!leftActive}
        dimColor={leftActive}
      >
        {right}
      </Text>
    </Text>
  )
}
