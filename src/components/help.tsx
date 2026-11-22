import React from "react"
import { Box, Text, useStdout } from "ink"
import { colors as glyphColors } from "@kud/glyphs"
import { layoutHelp } from "./help-layout.js"
import type { HelpSpec } from "./help-layout.js"

export type HelpProps = HelpSpec & {
  /** Layout width; clamped to 80. Defaults to the terminal's columns. */
  columns?: number
}

/**
 * The shared CLI help layout inside an Ink tree — the same lines `renderHelp`
 * prints, drawn as `<Text>` so Ink owns the escapes. Presentational: no keys.
 */
export const Help = ({ columns, ...spec }: HelpProps) => {
  const { stdout } = useStdout()
  const lines = layoutHelp(spec, columns ?? stdout?.columns)
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} wrap="truncate">
          {line.length === 0
            ? " "
            : line.map((seg, j) =>
                seg.style ? (
                  <Text
                    key={j}
                    bold={seg.style.bold}
                    underline={seg.style.underline}
                    color={seg.style.color ? (glyphColors[seg.style.color].hex ?? undefined) : undefined}
                  >
                    {seg.text}
                  </Text>
                ) : (
                  seg.text
                ),
              )}
        </Text>
      ))}
    </Box>
  )
}
