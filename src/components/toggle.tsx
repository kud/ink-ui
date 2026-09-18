import React from "react"
import { Text } from "ink"
import { colors } from "../tokens.js"

type ToggleProps = {
  label: string
  on: boolean
  color?: string
}

// A single on/off boolean rendered as a label with a trailing dot:
// `label ●` (on) / `label ○` (off). Presentational — the caller owns the
// keypress that flips `on`.
export const Toggle = ({ label, on, color = colors.accent }: ToggleProps) => (
  <Text color={on ? color : undefined} dimColor={!on}>
    {label} {on ? "●" : "○"}
  </Text>
)
