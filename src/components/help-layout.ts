import stringWidth from "string-width"
import { colors as glyphColors } from "@kud/glyphs"

// The shared CLI help layout: one input shape, one line model, two renderers
// — `renderHelp` encodes the lines as a string for a non-Ink CLI (and for
// commander), `<Help>` draws the same lines as Ink text. A zsh twin renders the
// same input to the same bytes, so every rule below is written to be portable:
// no locale-dependent casing, no width guessing beyond string-width, and one
// escape sequence per styled run.

/** A row of COMMANDS, ARGUMENTS, OPTIONS or ENVIRONMENT. */
export type HelpRow = {
  /** `add <file>`, `-p, --port <n>`, `NO_COLOR` — placeholders are picked out by shape. */
  name: string
  description?: string
  /** Shown after the description as `(default: …)`. */
  default?: string
}

export type HelpExample = {
  /** Drawn as `# comment` on the line above the command. */
  comment?: string
  /** Drawn after `$ `. */
  command: string
}

export type HelpSpec = {
  name: string
  version?: string
  /** One line under the header. */
  description?: string
  /** One or more usage lines, without the tool's `$`. */
  usage?: string | string[]
  /** A short paragraph after the usage lines. */
  usageNote?: string
  commands?: HelpRow[]
  arguments?: HelpRow[]
  options?: HelpRow[]
  examples?: HelpExample[]
  environment?: HelpRow[]
  /** Links or man-page references, drawn in the link colour, underlined. */
  seeAlso?: string[]
}

/** The colour tokens the help layout spends — nothing else carries colour. */
export type HelpColor = "accent" | "secondary" | "link"

export type HelpStyle = {
  bold?: boolean
  underline?: boolean
  color?: HelpColor
}

/** A run of text with one style; an unstyled run is the normal foreground. */
export type HelpSegment = { text: string; style?: HelpStyle }

export type HelpLine = HelpSegment[]

/**
 * How the string renderer encodes style. `plain` has no escapes at all (not a
 * TTY); `monochrome` keeps bold and underline but drops colour (`NO_COLOR`);
 * the three colour depths pick `@kud/glyphs`' hex, ansi256 or ansi16 layer.
 */
export type HelpColorMode = "plain" | "monochrome" | "ansi16" | "ansi256" | "truecolor"

/** Descriptions start at this column: indent 2 plus a 24-wide name field. */
export const HELP_DESCRIPTION_COLUMN = 26
const INDENT = 2
/** The longest name that still shares its line with the description. */
const NAME_FIT = HELP_DESCRIPTION_COLUMN - INDENT - 2
const MAX_WIDTH = 80
/** Below this width, descriptions drop under their name. */
export const HELP_NARROW_WIDTH = 60
const NARROW_INDENT = 6
/** Long options without a short form shift by `-x, ` so the `--` align. */
const SHORT_SHIFT = 4

const SECONDARY: HelpStyle = { color: "secondary" }
const NAME: HelpStyle = { bold: true }
const HEADING: HelpStyle = { bold: true, color: "accent" }
const LINK: HelpStyle = { underline: true, color: "link" }

export const helpWidth = (columns: number | undefined): number =>
  Math.min(columns && columns > 0 ? columns : MAX_WIDTH, MAX_WIDTH)

const spaces = (n: number): HelpSegment => ({ text: " ".repeat(Math.max(0, n)) })

const lineWidth = (line: HelpLine): number =>
  line.reduce((sum, seg) => sum + stringWidth(seg.text), 0)

/** Words of a free-text field: runs of whitespace collapse to one space. */
const words = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean)

/**
 * Capital first letter, no final full stop — enforced here so every CLI reads
 * the same whatever its authors typed. Only ASCII a–z is lifted, so the rule is
 * byte-for-byte reproducible outside JavaScript; an ellipsis is left alone.
 */
export const normaliseDescription = (text: string): string => {
  let out = words(text).join(" ")
  if (/^[a-z]/.test(out)) out = out[0]!.toUpperCase() + out.slice(1)
  if (out.endsWith(".") && !out.endsWith("..")) out = out.slice(0, -1)
  return out
}

const PLACEHOLDER = /<[^>]*>|\[[^\]]*\]/g

/**
 * Split a name or usage line into runs: `<x>`, `[x]` and `<x…>` take
 * `secondary`, every other word takes `rest`, and the spaces between them are
 * unstyled so no escape ever wraps a gap.
 */
export const termSegments = (term: string, rest: HelpStyle | undefined): HelpLine => {
  const out: HelpLine = []
  const pushText = (text: string) => {
    for (const part of text.split(/( +)/)) {
      if (!part) continue
      out.push(part.trim() === "" ? { text: part } : rest ? { text: part, style: rest } : { text: part })
    }
  }
  let last = 0
  for (const match of term.matchAll(PLACEHOLDER)) {
    pushText(term.slice(last, match.index))
    out.push({ text: match[0], style: SECONDARY })
    last = match.index! + match[0].length
  }
  pushText(term.slice(last))
  return out
}

type Word = HelpSegment

/** Greedy word wrap; a word wider than the space left sits alone and overflows. */
const wrap = (items: Word[], available: number): Word[][] => {
  const lines: Word[][] = []
  let current: Word[] = []
  let used = 0
  for (const word of items) {
    const w = stringWidth(word.text)
    if (current.length && used + 1 + w > available) {
      lines.push(current)
      current = []
      used = 0
    }
    used += (current.length ? 1 : 0) + w
    current.push(word)
  }
  if (current.length) lines.push(current)
  return lines
}

const joinWords = (ws: Word[]): HelpLine => {
  const out: HelpLine = []
  ws.forEach((w, i) => {
    if (i) out.push({ text: " " })
    out.push(w)
  })
  return out
}

const paragraph = (text: string, indent: number, width: number): HelpLine[] =>
  wrap(
    words(text).map((t) => ({ text: t })),
    width - indent,
  ).map((ws) => (indent ? [spaces(indent), ...joinWords(ws)] : joinWords(ws)))

const descriptionWords = (row: HelpRow): Word[] => {
  const ws: Word[] = row.description
    ? words(normaliseDescription(row.description)).map((t) => ({ text: t }))
    : []
  if (row.default !== undefined) {
    // One unbreakable run: a default split across lines reads as two facts.
    ws.push({ text: `(default: ${words(row.default).join(" ")})`, style: SECONDARY })
  }
  return ws
}

const hasShortForm = (name: string) => /^-[^-\s]/.test(name.trim())
const isLongOnly = (name: string) => name.trim().startsWith("--")

const rows = (items: HelpRow[], width: number, shiftLongOnly: boolean): HelpLine[] => {
  // Below the narrow width descriptions sit at column 6 — exactly where a
  // shifted `--` would land — so the shift only applies to the wide layout.
  const shift = shiftLongOnly && width >= HELP_NARROW_WIDTH && items.some((r) => hasShortForm(r.name))
  const out: HelpLine[] = []
  for (const row of items) {
    const lead = shift && isLongOnly(row.name) ? INDENT + SHORT_SHIFT : INDENT
    const name = row.name.trim()
    const nameLine: HelpLine = [spaces(lead), ...termSegments(name, NAME)]
    const desc = descriptionWords(row)
    if (!desc.length) {
      out.push(nameLine)
      continue
    }
    if (width < HELP_NARROW_WIDTH) {
      out.push(nameLine)
      for (const ws of wrap(desc, width - NARROW_INDENT)) {
        out.push([spaces(NARROW_INDENT), ...joinWords(ws)])
      }
      continue
    }
    const wrapped = wrap(desc, width - HELP_DESCRIPTION_COLUMN)
    const nameWidth = lineWidth(nameLine) - INDENT
    let first = 0
    if (nameWidth <= NAME_FIT) {
      out.push([...nameLine, spaces(HELP_DESCRIPTION_COLUMN - lineWidth(nameLine)), ...joinWords(wrapped[0]!)])
      first = 1
    } else {
      out.push(nameLine)
    }
    for (const ws of wrapped.slice(first)) {
      out.push([spaces(HELP_DESCRIPTION_COLUMN), ...joinWords(ws)])
    }
  }
  return out
}

const section = (title: string, body: HelpLine[]): HelpLine[] =>
  body.length ? [[], [{ text: title, style: HEADING }], ...body] : []

/**
 * The whole help screen as lines of styled runs. Pure: the width is the only
 * thing it reads from outside, and it is already clamped by `helpWidth`.
 */
export const layoutHelp = (spec: HelpSpec, columns?: number): HelpLine[] => {
  const width = helpWidth(columns)
  const header: HelpLine = [{ text: spec.name.trim(), style: NAME }]
  if (spec.version) header.push({ text: " " }, { text: spec.version.trim(), style: SECONDARY })
  const lines: HelpLine[] = [header]
  if (spec.description) lines.push(...paragraph(normaliseDescription(spec.description), 0, width))

  const usage = (Array.isArray(spec.usage) ? spec.usage : spec.usage ? [spec.usage] : [])
    .map((u) => u.trim())
    .filter(Boolean)
  const usageBody: HelpLine[] = usage.map((u) => [spaces(INDENT), ...termSegments(u, undefined)])
  if (usageBody.length && spec.usageNote) {
    usageBody.push([], ...paragraph(spec.usageNote, INDENT, width))
  }

  const examples: HelpLine[] = []
  for (const ex of spec.examples ?? []) {
    if (ex.comment) {
      examples.push([spaces(INDENT), { text: `# ${words(ex.comment).join(" ")}`, style: SECONDARY }])
    }
    examples.push([spaces(INDENT), { text: "$", style: SECONDARY }, { text: " " + ex.command.trim() }])
  }

  const seeAlso: HelpLine[] = (spec.seeAlso ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => [spaces(INDENT), { text: s, style: LINK }])

  lines.push(
    ...section("USAGE", usageBody),
    ...section("COMMANDS", rows(spec.commands ?? [], width, false)),
    ...section("ARGUMENTS", rows(spec.arguments ?? [], width, false)),
    ...section("OPTIONS", rows(spec.options ?? [], width, true)),
    ...section("EXAMPLES", examples),
    ...section("ENVIRONMENT", rows(spec.environment ?? [], width, false)),
    ...section("SEE ALSO", seeAlso),
  )
  return lines
}

// ── encoding ───────────────────────────────────────────────────────────

const ESC = "\u001b["

const rgb = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}`
}

const colorParam = (token: HelpColor, mode: HelpColorMode): string | undefined => {
  const value = glyphColors[token]
  if (mode === "truecolor" && value.hex) return `38;2;${rgb(value.hex)}`
  if (mode === "truecolor" || mode === "ansi256") return `38;5;${value.ansi256}`
  if (mode === "ansi16") return value.ansi16 < 8 ? `${30 + value.ansi16}` : `${90 + value.ansi16 - 8}`
  return undefined
}

/**
 * One SGR per styled run, parameters always in the order bold · underline ·
 * colour, closed by a full reset — the byte contract the zsh twin reproduces.
 */
export const encodeSegment = (seg: HelpSegment, mode: HelpColorMode): string => {
  if (mode === "plain" || !seg.style) return seg.text
  const params: string[] = []
  if (seg.style.bold) params.push("1")
  if (seg.style.underline) params.push("4")
  if (seg.style.color) {
    const c = colorParam(seg.style.color, mode)
    if (c) params.push(c)
  }
  return params.length ? `${ESC}${params.join(";")}m${seg.text}${ESC}0m` : seg.text
}

export const encodeLines = (lines: HelpLine[], mode: HelpColorMode): string =>
  lines.map((line) => line.map((seg) => encodeSegment(seg, mode)).join("")).join("\n") + "\n"

type ModeStream = { isTTY?: boolean }

/**
 * Not a TTY → `plain`. `NO_COLOR` set and non-empty → `monochrome`. Otherwise
 * the depth the terminal advertises: `COLORTERM` truecolor/24bit, then a
 * `TERM` naming 256 colours, then the 16-colour floor.
 */
export const detectHelpColorMode = (
  stream: ModeStream = process.stdout,
  env: Record<string, string | undefined> = process.env,
): HelpColorMode => {
  if (!stream.isTTY) return "plain"
  if (env.NO_COLOR) return "monochrome"
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM ?? "")) return "truecolor"
  if (/256/.test(env.TERM ?? "")) return "ansi256"
  return "ansi16"
}
