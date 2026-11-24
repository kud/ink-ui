import React from "react"
import { Text } from "ink"
import { glyph } from "@kud/glyphs"
import { ambientTheme, useTheme } from "../theme/theme-provider.js"
import { paint, type Theme } from "../theme/theme.js"
import { isHex } from "../theme/color-math.js"

export type PillVariant =
  "success" | "error" | "warning" | "info" | "accent" | "muted" | "group"

export type PillTone = "solid" | "soft" | "outline" | "tonal"

type PillProps = {
  children: string
  variant?: PillVariant
  /**
   * Solid is an EVENT — something happened to the thing (`merged`, `NEW`,
   * `GONE`). Soft is a CLASSIFICATION — what the thing is (`epic`, `bug`): a
   * quiet permanent fill from `softColors`, built to sit on every row of a
   * dark ground without out-shouting the row's news. Outline is the same
   * classification drawn as a hue-only ring, for a ground where a fill of any
   * weight is too much. Tonal is CHROME — a count, a slot label — a tint of
   * the hue over the ground from `tonalColors`, inked in the hue: the
   * quietest filled form, for what the frame says about itself rather than
   * row data. The default stays solid so nothing already rendered moves.
 */
  tone?: PillTone
  /**
   * Tonal only: the thing you are ON takes the stronger tint from
   * `tonalStrongColors` and bolds its label. Ignored by every other tone.
   */
  strong?: boolean
  /**
   * An explicit fill, for a state the external system INVENTED — GitHub's
   * merged purple, a CI provider's result colours. The hue is that system's
   * vocabulary for something that happened, and repainting it as a token would
   * mislabel the event. Overrides `variant`.
   *
   * Never for that system's SKIN. Jira colours its issue types, but an issue
   * type is a classification, and a classification takes a `variant` chosen by
   * meaning, not the colour Jira happens to paint it. The test is whether the
   * hue names a state the reader already knows from the source system, or
   * merely decorates a category the tokens can already say.
   */
  color?: string
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
  group: "white",
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
 * Which fill and ink a variant takes in a tone — and whether the label bolds —
 * under a theme. Tonal reads its pair from the theme's tonal families (strong
 * also bolds); solid and outline read the variant's hue, soft its measured
 * fill. The ink is measured against a hex fill and read from the hand-written
 * table against a named or 256-colour one, except on a light ground, where
 * every solid hue is dark enough to carry white. Outline has no ink to pick,
 * so it reports its fill as both: it draws a hue-only ring. A `fill` of
 * `undefined` means the theme draws no fill at all — `plain`, or a tonal chip
 * on sixteen colours — and the pill falls back to brackets.
 *
 * Exported for its own test and nothing else — `src/index.ts` does not
 * re-export it, which is this package's definition of internal. The frame a
 * test renders carries no escape codes (the runner is not a TTY), so the
 * choice is unobservable through the component and has to be asserted here
 * or not at all, as `inkFor` already is.
 */
export const pillStyle = (
  variant: PillVariant,
  tone: PillTone,
  strong = false,
  theme: Theme = ambientTheme(),
): { fill: string | undefined; ink: string | undefined; bold: boolean } => {
  if (tone === "tonal") {
    const pair = strong
      ? theme.tonalStrongColors[variant]
      : theme.tonalColors[variant]
    return { fill: pair.fill, ink: pair.ink, bold: strong }
  }
  const hue = theme.colors[variant]
  if (tone === "outline") return { fill: hue, ink: hue, bold: false }
  if (tone === "soft") {
    const fill = theme.softColors[variant]
    const ink =
      fill === undefined
        ? undefined
        : isHex(fill)
          ? inkFor(fill)
          : theme.name === "minimal" || theme.colorLevel === "ansi16"
            ? INK[variant]
            : theme.background === "light"
              ? "black"
              : "white"
    return { fill, ink, bold: false }
  }
  const ink =
    hue === undefined
      ? undefined
      : theme.background === "light" && theme.name === "default"
        ? "white"
        : INK[variant]
  return { fill: hue, ink, bold: false }
}

/**
 * A rounded label — a category the thing belongs to, or an event that has
 * just happened to it.
 *
 * The law, in one line: the column says where it sits, soft says what it is,
 * solid says something happened, tonal says where you are. A solid pill is an
 * event (`merged`, `NEW`, `GONE`) and earns its loud fill by being news; a
 * soft pill is a classification (`epic`, `bug`, `task`) and takes the quiet
 * fill from `softColors`, because a type is a fact about the row, not
 * something that happened to it — it has to be legible on every row without
 * competing with the one row that has news. Outline is the classification
 * with no fill at all, for a ground where even a soft block is too much.
 * Tonal is chrome on the frame — a count, a slot label — the quietest filled
 * form, with `strong` for the thing you are on. A screen where every pill is
 * solid has no way to say which pill is the news.
 *
 * Reach for it when the word IS the information and you want it to read as
 * one object rather than as more prose. For a reference the reader is meant
 * to follow — a ticket key, a repo — leave the text dim: a fill gives a
 * breadcrumb a weight it has not earned, and once everything is a pill none
 * of them is.
 *
 * The WORD carries the meaning and the colour only reinforces it, so a pill
 * survives being read in monochrome, piped, or by someone who cannot separate
 * the hues.
 *
 * Powerline half-circles, like `ToggleSwitch` and for the same reason: they are
 * the only way to get a genuinely rounded end out of a terminal cell, and a font
 * without them renders blanks, which degrades to a square pill rather than
 * breaking the layout. Not gated on `getIconMode` — that switch chooses between
 * two glyph SETS, and this is one glyph with a graceful absence. Solid and soft take
 * the filled caps, outline the thin ones from the same Powerline Extra block.
 *
 * No colour (`NO_COLOR`, the `plain` theme) sends solid, soft and tonal to
 * brackets — as does a tonal pill on sixteen colours, which has no tint: with the fill stripped,
 * the caps would be drawing the outline of a pill that is not there. Outline
 * keeps its caps — they ARE the outline, and there was never a fill for them
 * to be missing.
 */
export const Pill = ({
  children,
  variant = "muted",
  tone = "solid",
  strong = false,
  color,
}: PillProps) => {
  const theme = useTheme()
  const style = pillStyle(variant, tone, strong, theme)
  const explicit = paint(theme, color)
  // Powerline caps are Nerd Font glyphs, which a 7-bit terminal cannot
  // draw: there the pill is its word in brackets, the same two columns.
  const ascii = theme.icons === "ascii"
  if (tone === "outline") {
    const fill = explicit ?? style.fill
    if (ascii) return <Text color={fill}>({children})</Text>
    return (
      <Text color={fill}>
        {glyph("plCapLeftThin")}
        {children}
        {glyph("plCapRightThin")}
      </Text>
    )
  }
  // A caller mirroring an external palette may override the fill. On a tonal
  // pill the ink stays the variant's tonal ink either way — a tint is already
  // the quietest form, and measuring a second ink for it would invent a tier.
  const fill = explicit ?? style.fill
  const ink =
    explicit && tone !== "tonal" ? inkFor(explicit) : style.ink
  // Brackets carry no fill, so they take the variant's hue as ink — a soft
  // fill is too dark to read as text on the ground it was made to sit on.
  if (fill === undefined || ascii)
    return (
      <Text color={explicit ?? (tone === "tonal" ? style.ink : theme.colors[variant])}>
        [{children}]
      </Text>
    )
  return (
    <Text>
      <Text color={fill}>{glyph("plCapLeft")}</Text>
      <Text backgroundColor={fill} color={ink} bold={style.bold}>
        {children}
      </Text>
      <Text color={fill}>{glyph("plCapRight")}</Text>
    </Text>
  )
}

/**
 * How many columns `<Pill>` occupies for `text` — the label plus its two caps,
 * whichever tone draws them.
 *
 * Exported because a caller laying out a fixed-width row has to price the pill
 * BEFORE rendering it, and measuring the rendered output is not available at
 * that point. A row that budgets for the label alone overflows by exactly two
 * columns, which in a frame sized to fill the terminal scrolls the whole panel
 * instead of clipping.
 */
export const pillWidth = (text: string): number => text.length + 2
