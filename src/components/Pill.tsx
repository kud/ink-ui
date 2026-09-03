import React from "react"
import { Text } from "ink"
import { glyphs } from "@kud/glyphs"
import { colors } from "../tokens.js"

export type PillVariant =
  "success" | "error" | "warning" | "info" | "accent" | "muted"

type PillProps = {
  children: string
  variant?: PillVariant
}

const FILL: Record<PillVariant, string> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
  accent: colors.accent,
  muted: colors.muted,
}

// Chosen against each fill rather than derived, because a terminal's idea of
// "green" is the user's theme and there is nothing to measure at render time.
// The pairs match shui's pill, which is the same component one layer down — a
// label that reads in one and not the other is the kind of drift nobody notices
// until the two sit side by side in a screenshot.
const INK: Record<PillVariant, string> = {
  success: "black",
  error: "white",
  warning: "black",
  info: "black",
  accent: "black",
  muted: "white",
}

/**
 * A filled, rounded label — a category the thing belongs to, not a status it is
 * in.
 *
 * Reach for it when the word IS the information (`epic`, `draft`, `blocked`) and
 * you want it to read as one object rather than as more prose. For a reference
 * the reader is meant to follow — a ticket key, a repo — leave the text dim: a
 * fill gives a breadcrumb a weight it has not earned, and once everything is a
 * pill none of them is.
 *
 * The WORD carries the meaning and the colour only reinforces it, so a pill
 * survives being read in monochrome, piped, or by someone who cannot separate
 * the hues.
 *
 * Powerline half-circles, like `ToggleSwitch` and for the same reason: they are
 * the only way to get a genuinely rounded end out of a terminal cell, and a font
 * without them renders blanks, which degrades to a square pill rather than
 * breaking the layout. Not gated on `getIconMode` — that switch chooses between
 * two glyph SETS, and this is one glyph with a graceful absence.
 *
 * `NO_COLOR` is the one case that does fall back to brackets: with the fill
 * stripped, the caps would be drawing the outline of a pill that is not there.
 */
export const Pill = ({ children, variant = "muted" }: PillProps) => {
  const fill = FILL[variant]
  if (process.env["NO_COLOR"]) return <Text color={fill}>[{children}]</Text>
  return (
    <Text>
      <Text color={fill}>{glyphs.plCapLeft}</Text>
      <Text backgroundColor={fill} color={INK[variant]}>
        {children}
      </Text>
      <Text color={fill}>{glyphs.plCapRight}</Text>
    </Text>
  )
}

/**
 * How many columns `<Pill>` occupies for `text` — the label plus its two caps.
 *
 * Exported because a caller laying out a fixed-width row has to price the pill
 * BEFORE rendering it, and measuring the rendered output is not available at
 * that point. A row that budgets for the label alone overflows by exactly two
 * columns, which in a frame sized to fill the terminal scrolls the whole panel
 * instead of clipping.
 */
export const pillWidth = (text: string): number => text.length + 2
