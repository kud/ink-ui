import React from "react"
import { Box, Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"

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

// The key symbols every footer uses, spelled out for a terminal that cannot
// draw them. A hint the reader cannot decode is a key they cannot find.
const ASCII_KEYS: Record<string, string> = {
  "⌫": "bksp",
  "⏎": "enter",
  "↵": "enter",
  "⇥": "tab",
  "↑↓": "up/down",
  "←→": "left/right",
  "↑": "up",
  "↓": "down",
  "←": "left",
  "→": "right",
}

/**
 * A key as this terminal can draw it: the symbol, or its spelling under the
 * ASCII glyph set. A compound key (`esc ⌫`) is spelled part by part.
 */
export const keyLabel = (name: string, ascii: boolean): string =>
  !ascii
    ? name
    : (ASCII_KEYS[name] ??
      name
        .split(" ")
        .map((part) => ASCII_KEYS[part] ?? part)
        .join(" "))

// Its own component so `FooterHints` stays a hook-free function of its props:
// only the key's spelling depends on the theme.
const KeyName = ({ name }: { name: string }) => {
  const ascii = useTheme().icons === "ascii"
  return <>{keyLabel(name, ascii)}</>
}

// columnGap, not gap: `gap` sets both axes, so once the hints wrap — which they
// do in any narrow terminal, or inside a border — the 2 meant as spacing between
// hints also became 2 blank rows between hint lines, shoving the footer around.
export const FooterHints = ({ hints, page, help = true }: FooterHintsProps) => {
  const all = page ? [...hints, ...tailHints(page, help)] : hints
  return (
    <Box columnGap={2} rowGap={0} flexWrap="wrap">
      {all.map(([key, label]) => (
        <Box key={key}>
          <Text>
            <KeyName name={key} />
          </Text>
          <Text dimColor>{" " + label}</Text>
        </Box>
      ))}
    </Box>
  )
}
