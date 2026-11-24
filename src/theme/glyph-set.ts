import { glyph } from "@kud/glyphs"
import cliSpinners from "cli-spinners"

/**
 * The glyphs components draw for structure and state, in three sets.
 *
 * `unicode` is the default and what every component drew before themes
 * existed. `nerd` swaps the four status marks for their Nerd Font forms from
 * `@kud/glyphs` and keeps the rest. `ascii` mirrors shui's `ascii` icon set
 * (`src/icons/ascii.zsh`): 7-bit only, safe under any locale, chosen
 * automatically when the locale is not UTF-8 — a terminal that cannot decode
 * `✓` draws a replacement box or worse, and a state drawn as a box is a state
 * nobody can read. Where shui names the same idea the value is shui's
 * (`+ x ! i`, `>` for the pointer, `*`/`o` for a filled/empty circle);
 * the structural pieces shui has no token for (rules, bars, borders) take
 * the nearest 7-bit shape.
 */
export type GlyphSet = {
  success: string
  error: string
  warning: string
  info: string
  pending: string
  /** The selected row's pointer in a list. */
  pointer: string
  /** A filled dot — a focused panel, a toggle that is on. */
  dot: string
  /** An empty dot — a toggle that is off. */
  dotEmpty: string
  bullet: string
  /** Above-normal / below-normal priority. */
  up: string
  down: string
  ellipsis: string
  /** The horizontal rule under an active tab and around a section. */
  rule: string
  /** The dotted rule that absorbs the title row's spare width. */
  ruleDotted: string
  /** The vertical divider between tab groups. */
  divider: string
  /** A filled cell of a bar (progress, skeleton). */
  bar: string
  /** An unfilled cell of a bar when colour cannot tell the two apart. */
  barEmpty: string
  /** Ink border style: rounded box drawing, or `classic` (`+-|`) for ASCII. */
  border: "round" | "classic"
  /** Spinner frames. */
  spinner: readonly string[]
}

export type GlyphSetName = "unicode" | "nerd" | "ascii"

const UNICODE: GlyphSet = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  pending: "◌",
  pointer: "❯",
  dot: "●",
  dotEmpty: "○",
  bullet: "•",
  up: "▲",
  down: "▼",
  ellipsis: "…",
  rule: "─",
  ruleDotted: "╌",
  divider: "│",
  bar: "█",
  barEmpty: "░",
  border: "round",
  spinner: cliSpinners.dots.frames,
}

const NERD: GlyphSet = {
  ...UNICODE,
  success: glyph("check"),
  error: glyph("cross"),
  warning: glyph("warning"),
  info: glyph("info"),
}

const ASCII: GlyphSet = {
  success: "+",
  error: "x",
  warning: "!",
  info: "i",
  pending: "o",
  pointer: ">",
  dot: "*",
  dotEmpty: "o",
  bullet: "-",
  up: "^",
  down: "v",
  ellipsis: "...",
  rule: "-",
  ruleDotted: ".",
  divider: "|",
  bar: "#",
  barEmpty: ".",
  border: "classic",
  spinner: ["-", "\\", "|", "/"],
}

export const glyphSets: Record<GlyphSetName, GlyphSet> = {
  unicode: UNICODE,
  nerd: NERD,
  ascii: ASCII,
}
