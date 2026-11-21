import stringWidth from "string-width"
import { colors, spacing } from "../tokens.js"
import { statusVariant } from "../components/status-variants.js"
import type { OutputBlock, OutputDocument } from "./model.js"

/**
 * Where the output is going. `styled` is a terminal a person reads; `plain` is
 * a pipe, a file or a snapshot — the same layout and glyphs with no escape
 * codes; `json` is the model itself, for another program.
 */
export type OutputTarget = "styled" | "plain" | "json"

export type RenderOptions = {
  target: OutputTarget
  /** Styled only: `false` keeps bold and faint but drops every hue (`NO_COLOR`). */
  color?: boolean
  /** Columns to wrap to. Defaults to 80, so piped output is the same on every machine. */
  width?: number
}

type Paint = {
  title: (s: string) => string
  heading: (s: string) => string
  strong: (s: string) => string
  secondary: (s: string) => string
  muted: (s: string) => string
  hue: (hex: string, s: string) => string
}

const same = (s: string) => s

const sgr = (open: string, close: string) => (s: string) => `\x1b[${open}m${s}\x1b[${close}m`

const fg = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}`
}

const PLAIN: Paint = {
  title: same,
  heading: same,
  strong: same,
  secondary: same,
  muted: same,
  hue: (_hex, s) => s,
}

const paintFor = (target: OutputTarget, color: boolean): Paint => {
  if (target !== "styled") return PLAIN
  const bold = sgr("1", "22")
  if (!color) {
    // Without hue the tiers survive as weight: bold for the answer's frame,
    // faint for furniture. Secondary falls to the default foreground.
    return { ...PLAIN, title: bold, heading: bold, strong: same, muted: sgr("2", "22") }
  }
  const hue = (hex: string, s: string) => sgr(fg(hex), "39")(s)
  return {
    title: (s) => bold(hue(colors.accent, s)),
    heading: bold,
    strong: same,
    secondary: (s) => hue(colors.secondary, s),
    muted: (s) => hue(colors.muted, s),
    hue,
  }
}

/** Greedy word wrap on display width. A word longer than the line keeps its own line unbroken — a URL survives. */
export const wrap = (value: string, width: number): string[] => {
  const out: string[] = []
  for (const paragraph of value.split("\n")) {
    let line = ""
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line === "") line = word
      else if (stringWidth(line) + 1 + stringWidth(word) <= width) line += ` ${word}`
      else {
        out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

/** The narrowest a wrapped column is allowed to get before a layout gives up its side-by-side form. */
const MIN_COLUMN = 20
const MIN_WRAP = 10

const isSection = (block: OutputBlock) => block.kind === "section"

const layoutPairs = (
  pairs: [string, string][],
  indent: string,
  width: number,
  label: (s: string) => string,
  value: (s: string) => string,
): string[] => {
  const labelWidth = Math.max(0, ...pairs.map(([l]) => stringWidth(l))) + spacing.sm
  const valueWidth = width - indent.length - labelWidth
  const lines: string[] = []
  for (const [l, v] of pairs) {
    if (valueWidth < MIN_COLUMN) {
      // Too narrow to sit side by side: the label takes its own line and the
      // value hangs beneath it, so neither is squeezed into a sliver.
      lines.push(indent + label(l))
      const under = indent + " ".repeat(spacing.sm)
      for (const w of wrap(v, Math.max(MIN_WRAP, width - under.length))) lines.push(under + value(w))
      continue
    }
    const [first = "", ...rest] = wrap(v, valueWidth)
    lines.push(indent + label(l) + " ".repeat(labelWidth - stringWidth(l)) + value(first))
    for (const w of rest) lines.push(indent + " ".repeat(labelWidth) + value(w))
  }
  return lines
}

const hanging = (marker: string, body: string, indent: string, width: number, ink: (s: string) => string) => {
  const gap = " ".repeat(stringWidth(marker) + 1)
  return wrap(body, Math.max(MIN_WRAP, width - indent.length - gap.length)).map((w, i) =>
    i === 0 ? `${indent}${marker} ${ink(w)}` : `${indent}${gap}${ink(w)}`,
  )
}

const layoutBlock = (block: OutputBlock, depth: number, width: number, paint: Paint): string[] => {
  const indent = " ".repeat(depth * spacing.sm)
  const room = Math.max(MIN_WRAP, width - indent.length)
  switch (block.kind) {
    case "section":
      return [indent + paint.heading(block.title), ...layoutBlocks(block.blocks, depth + 1, width, paint)]
    case "text":
      return (block.wrap ? wrap(block.text, room) : block.text.split("\n")).map((w) => indent + w)
    case "note":
      return wrap(block.text, room).map((w) => indent + paint.muted(w))
    case "keyValue":
      return layoutPairs(block.pairs, indent, width, paint.muted, same)
    case "definitions":
      return layoutPairs(block.pairs, indent, width, paint.strong, paint.secondary)
    case "list": {
      const numberWidth = String(block.items.length).length + 1
      return block.items.flatMap((item, i) =>
        hanging(block.ordered ? `${i + 1}.`.padStart(numberWidth) : paint.muted("●"), item, indent, width, same),
      )
    }
    case "status": {
      const { icon, color } = statusVariant(block.variant)
      return hanging(paint.hue(color, icon), block.text, indent, width, same)
    }
    case "empty": {
      const lines = hanging(paint.muted("◌"), block.text, indent, width, same)
      if (block.hint !== undefined) lines.push(...hanging(" ", block.hint, indent, width, paint.muted))
      return lines
    }
  }
}

/** Blocks stack directly; a section takes a blank line either side, so groups read as groups. */
const layoutBlocks = (blocks: OutputBlock[], depth: number, width: number, paint: Paint): string[] => {
  const lines: string[] = []
  blocks.forEach((block, i) => {
    if (i > 0 && (isSection(block) || isSection(blocks[i - 1]!))) lines.push("")
    lines.push(...layoutBlock(block, depth, width, paint))
  })
  return lines
}

/**
 * Renders a document to the string a command prints. Deterministic: the same
 * document, target and width always give the same bytes, with no trailing
 * whitespace and one closing newline — fit for a snapshot test.
 */
export const renderOutput = (doc: OutputDocument, { target, color = true, width = 80 }: RenderOptions): string => {
  if (target === "json") return `${JSON.stringify(doc, null, 2)}\n`
  const paint = paintFor(target, color)
  const lines: string[] = []
  if (doc.title !== undefined) {
    lines.push(paint.title(doc.title))
    if (doc.blocks.length > 0) lines.push("")
  }
  lines.push(...layoutBlocks(doc.blocks, 0, width, paint))
  return `${lines.map((l) => l.trimEnd()).join("\n")}\n`
}

type Stream = { isTTY?: boolean; columns?: number; write: (chunk: string) => unknown }

export type OutputContext = {
  /** The command's own `--json` flag. The parser is the caller's; only the answer comes here. */
  json?: boolean
  stream?: Stream
  env?: Record<string, string | undefined>
}

/**
 * Picks the target from where the output goes: `--json` wins; a stream that
 * is not a terminal gets plain text; a terminal gets styled output, without
 * hue when `NO_COLOR` is set to anything but the empty string.
 */
export const resolveOutput = ({
  json = false,
  stream = process.stdout,
  env = process.env,
}: OutputContext = {}): Required<Pick<RenderOptions, "target" | "color">> & { width: number } => {
  const width = stream.isTTY && stream.columns ? stream.columns : 80
  if (json) return { target: "json", color: false, width }
  if (!stream.isTTY) return { target: "plain", color: false, width }
  const noColor = env.NO_COLOR !== undefined && env.NO_COLOR !== ""
  return { target: "styled", color: !noColor, width }
}

/** Resolves the target for the stream and writes the document to it. */
export const writeOutput = (doc: OutputDocument, context: OutputContext = {}): void => {
  const stream = context.stream ?? process.stdout
  stream.write(renderOutput(doc, resolveOutput({ ...context, stream })))
}
