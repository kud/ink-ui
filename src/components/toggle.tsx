import React from "react"
import { Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import { paint } from "../theme/theme.js"

type ToggleProps = {
  label: string
  on: boolean
  color?: string
}

// A single on/off boolean rendered as a label with a trailing dot:
// `label ●` (on) / `label ○` (off). Presentational — the caller owns the
// keypress that flips `on`.
export const Toggle = ({ label, on, color }: ToggleProps) => {
  const theme = useTheme()
  const tint = paint(theme, color) ?? theme.colors.accent
  return (
    // A Text root, as it always was, so a Toggle still nests inside a line
    // of text; the screen reader hears the state as a word.
    <Text
      color={on ? tint : undefined}
      dimColor={!on}
      aria-label={`${label}: ${on ? "on" : "off"}`}
    >
      {label} {on ? theme.glyphs.dot : theme.glyphs.dotEmpty}
    </Text>
  )
}
