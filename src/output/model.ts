import type { StatusVariant } from "../components/status-variants.js"

/**
 * The semantic model for one-shot output: what a command *means* to say, with
 * no styling in it. A renderer decides how it looks — styled on a terminal,
 * plain when piped, JSON when asked — so a command never formats by hand and
 * the three never drift apart.
 *
 * Every node is plain data: serialisable as-is, which is what makes the JSON
 * target structured data rather than a dump of ANSI strings.
 */
export type OutputBlock =
  | { kind: "section"; title: string; blocks: OutputBlock[] }
  | { kind: "text"; text: string; wrap: boolean }
  | { kind: "note"; text: string }
  | { kind: "keyValue"; pairs: [label: string, value: string][] }
  | { kind: "definitions"; pairs: [term: string, description: string][] }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "status"; variant: StatusVariant; text: string }
  | { kind: "empty"; text: string; hint?: string }

export type OutputDocument = {
  title?: string
  blocks: OutputBlock[]
}

/** A whole result: an optional title over the blocks that make it up. */
export const result = ({ title, blocks }: { title?: string; blocks: OutputBlock[] }): OutputDocument =>
  title === undefined ? { blocks } : { title, blocks }

/** A titled group. Sections nest; each level indents its body one step. */
export const section = (title: string, blocks: OutputBlock[]): OutputBlock => ({
  kind: "section",
  title,
  blocks,
})

/** A paragraph, wrapped to the width. `wrap: false` keeps it verbatim — usage lines, commands. */
export const text = (value: string, { wrap = true }: { wrap?: boolean } = {}): OutputBlock => ({
  kind: "text",
  text: value,
  wrap,
})

/** Context the reader may skip: a hint, a caveat, a pointer elsewhere. Drawn muted. */
export const note = (value: string): OutputBlock => ({ kind: "note", text: value })

/** Label/value rows with the values aligned on one column. */
export const keyValue = (pairs: [string, string][] | Record<string, string>): OutputBlock => ({
  kind: "keyValue",
  pairs: Array.isArray(pairs) ? pairs : Object.entries(pairs),
})

/**
 * Terms and what they do — commands, arguments, options. Laid out like
 * `keyValue`, but the term is the thing the reader types, so it is drawn
 * bright and the description is the context beside it.
 */
export const definitions = (pairs: [string, string][]): OutputBlock => ({
  kind: "definitions",
  pairs,
})

/** A compact list: bullets, or numbers with `ordered`. */
export const list = (items: string[], { ordered = false }: { ordered?: boolean } = {}): OutputBlock => ({
  kind: "list",
  items,
  ordered,
})

/** A verdict, always led by its glyph — the shape carries the state, the hue only reinforces it. */
export const status = (variant: StatusVariant, value: string): OutputBlock => ({
  kind: "status",
  variant,
  text: value,
})

export const success = (value: string): OutputBlock => status("success", value)
export const info = (value: string): OutputBlock => status("info", value)
export const warning = (value: string): OutputBlock => status("warning", value)
export const error = (value: string): OutputBlock => status("error", value)

/** Nothing to show, said as a sentence rather than left as silence; `hint` says what to do about it. */
export const empty = (value: string, hint?: string): OutputBlock =>
  hint === undefined ? { kind: "empty", text: value } : { kind: "empty", text: value, hint }
