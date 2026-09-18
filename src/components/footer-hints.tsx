import React from "react"
import { Box, Text } from "ink"

export type Hint = [key: string, label: string]

type FooterHintsProps = {
  hints: Hint[]
  /**
   * Where this page sits, so the footer can end the same way on every page
   * of every app: `⌫ back` on a nested page, then `? help`, then `q quit`,
   * always last. A host passes only its own hints — navigation, actions,
   * modes — and never these three. Omit it to draw the hints as given.
   */
  page?: "root" | "nested"
  /** Drop `? help` from the tail for an app with no legend. */
  help?: boolean
}

/** The cells every page ends with, in the order the eye learns once. */
export const tailHints = (
  page: "root" | "nested",
  help = true,
): Hint[] => [
  ...(page === "nested" ? ([["⌫", "back"]] as Hint[]) : []),
  ...(help ? ([["?", "help"]] as Hint[]) : []),
  ["q", "quit"],
]

// columnGap, not gap: `gap` sets both axes, so once the hints wrap — which they
// do in any narrow terminal, or inside a border — the 2 meant as spacing between
// hints also became 2 blank rows between hint lines, shoving the footer around.
export const FooterHints = ({ hints, page, help = true }: FooterHintsProps) => {
  const all = page ? [...hints, ...tailHints(page, help)] : hints
  return (
    <Box columnGap={2} rowGap={0} flexWrap="wrap">
      {all.map(([key, label]) => (
        <Box key={key}>
          <Text color="white">{key}</Text>
          <Text dimColor>{" " + label}</Text>
        </Box>
      ))}
    </Box>
  )
}
