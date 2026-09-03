import React from "react"
import { Text } from "ink"
import { glyphs } from "@kud/glyphs"
import { colors } from "../tokens.js"

export type PillVariant =
  "success" | "error" | "warning" | "info" | "accent" | "muted"

type PillProps = {
  children: string
  variant?: PillVariant
  /**
   * An explicit fill, for a caller that owns a palette of its own — one
   * mirroring an external system whose colours ARE the vocabulary (GitHub's
   * merged purple, a CI provider's result colours). Overrides `variant`.
   *
   * Not a way round the token rule. A colour picked because it looks nice is
   * still wrong here; the test is whether the hue is a fact about the thing
   * being labelled rather than a preference about the label.
   */
  color?: string
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
 * Which ink a `#rrggbb` fill can carry, by perceived luminance.
 *
 * Only reachable through `color`, and only for a hex — a named ANSI colour has
 * no measurable luminance, the value being whatever the user's theme says it
 * is, which is exactly why `INK` above is a hand-written table rather than a
 * calculation. An unparseable value takes the same `white` a named colour
 * would, so a caller cannot land an invisible label by passing something odd.
 *
 * WCAG relative luminance and a contrast ratio against each candidate, rather
 * than a brightness threshold: a threshold has to be tuned, and the number that
 * needs tuning is exactly the one nobody revisits. GitHub's green `#3FB950`
 * lands under the conventional 128 while black is the more legible ink on it by
 * a factor of three, which is the whole argument for measuring the pair instead
 * of the fill.
 *
 * Exported for its own test and nothing else — `src/index.ts` does not re-export
 * it, which is this package's definition of internal. The frame a test renders
 * carries no escape codes (the runner is not a TTY), so the choice is
 * unobservable through the component and has to be asserted here or not at all.
 */
export const inkFor = (fill: string): string => {
  const hex = /^#([0-9a-f]{6})$/i.exec(fill)?.[1]
  if (!hex) return "white"
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "black"
    : "white"
}

/**
 * A filled, rounded label — a category the thing belongs to, or an event that
 * has just happened to it.
 *
 * Reach for it when the word IS the information (`epic`, `draft`, `blocked`,
 * `NEW`) and you want it to read as one object rather than as more prose. For a
 * reference the reader is meant to follow — a ticket key, a repo — leave the
 * text dim: a fill gives a breadcrumb a weight it has not earned, and once
 * everything is a pill none of them is.
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
export const Pill = ({ children, variant = "muted", color }: PillProps) => {
  const fill = color ?? FILL[variant]
  const ink = color ? inkFor(color) : INK[variant]
  if (process.env["NO_COLOR"]) return <Text color={fill}>[{children}]</Text>
  return (
    <Text>
      <Text color={fill}>{glyphs.plCapLeft}</Text>
      <Text backgroundColor={fill} color={ink}>
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
