import React from "react"
import { Box, Text } from "ink"
import stringWidth from "string-width"
import { colors, spacing } from "../tokens.js"

export type DividerVariant = "light" | "heavy" | "double" | "dashed"
export type DividerAlign = "left" | "center" | "right"

/** One box-drawing character per weight; `dashed` is the title row's `╌`. */
export const DIVIDER_CHARS: Record<DividerVariant, string> = {
  light: "─",
  heavy: "━",
  double: "═",
  dashed: "╌",
}

// A left- or right-aligned label keeps this much rule on its near side, so it
// reads as a label on a rule rather than text with a line after it.
const NEAR = 2

/**
 * The rule as a string of exactly `width` cells, label included. Exported for
 * the fixed-width path and its tests; the fluid `Divider` draws the same
 * shape with flex boxes.
 */
export const dividerLine = (
  width: number,
  {
    label,
    variant = "light",
    align = "center",
  }: { label?: string; variant?: DividerVariant; align?: DividerAlign } = {},
): string => {
  const cells = Math.max(0, Math.floor(width))
  const ch = DIVIDER_CHARS[variant]
  if (!label) return ch.repeat(cells)
  const padded = ` ${label} `
  const room = cells - stringWidth(padded)
  if (room < 0) return ch.repeat(cells)
  const left =
    align === "left"
      ? Math.min(NEAR, room)
      : align === "right"
        ? Math.max(0, room - NEAR)
        : Math.floor(room / 2)
  return ch.repeat(left) + padded + ch.repeat(room - left)
}

type DividerProps = {
  /** Text set into the rule. */
  label?: string
  /** Line weight. Defaults to `light`. */
  variant?: DividerVariant
  /** Where the label sits. Defaults to `center`. */
  align?: DividerAlign
  /** Cells to span. Omit to fill the parent's width. */
  width?: number
  /** Rule colour. Defaults to `colors.dim` — a rule is furniture. */
  color?: string
}

const rule = (ch: string, color: string, grow: number | undefined, basis?: number) => (
  <Box
    flexGrow={grow}
    flexShrink={grow ? 1 : 0}
    flexBasis={basis}
    height={1}
    borderStyle={{
      top: ch,
      bottom: "",
      left: "",
      right: "",
      topLeft: "",
      topRight: "",
      bottomLeft: "",
      bottomRight: "",
    }}
    borderTop
    borderBottom={false}
    borderLeft={false}
    borderRight={false}
    borderColor={color}
  />
)

/**
 * A horizontal rule, optionally carrying a label: `──── Section ────`. The
 * rule is `dim` (furniture, rule 6 of the colour system) and the label
 * `muted`, so a divider separates without competing with the rows it
 * separates. Without `width` it fills its parent and follows it on resize.
 */
export const Divider = ({
  label,
  variant = "light",
  align = "center",
  width,
  color = colors.dim,
}: DividerProps) => {
  const ch = DIVIDER_CHARS[variant]
  if (width !== undefined) {
    const line = dividerLine(width, { label, variant, align })
    if (!label || !line.includes(` ${label} `))
      return <Text color={color}>{line}</Text>
    const at = line.indexOf(` ${label} `)
    return (
      <Text>
        <Text color={color}>{line.slice(0, at)}</Text>
        <Text color={colors.muted}>{` ${label} `}</Text>
        <Text color={color}>{line.slice(at + label.length + 2)}</Text>
      </Text>
    )
  }
  if (!label) return <Box width="100%">{rule(ch, color, 1)}</Box>
  return (
    <Box width="100%">
      {align === "left" ? rule(ch, color, undefined, NEAR) : rule(ch, color, 1)}
      <Box flexShrink={0}>
        <Text color={colors.muted}>{` ${label} `}</Text>
      </Box>
      {align === "right" ? rule(ch, color, undefined, NEAR) : rule(ch, color, 1)}
    </Box>
  )
}

type SpacerProps = {
  /**
   * A fixed gap, in cells or as a `spacing` token (`"sm"` is 2). Omit it and
   * the spacer grows to take the free space, exactly like Ink's own `Spacer`.
   */
  size?: number | keyof typeof spacing
  /**
   * Which way a fixed gap runs: `vertical` (rows, the default — blank lines
   * between blocks) or `horizontal` (cells between siblings in a row). Ignored
   * by the bare flexible spacer, which follows its parent's direction.
   */
  axis?: "vertical" | "horizontal"
}

/**
 * Space between siblings. Bare, it is Ink's flexible spacer — push the next
 * sibling to the far edge. With `size`, it is a fixed gap of that many rows
 * (or cells, with `axis="horizontal"`), drawn from the spacing scale so gaps
 * line up across screens.
 */
export const Spacer = ({ size, axis = "vertical" }: SpacerProps) => {
  if (size === undefined) return <Box flexGrow={1} flexShrink={1} />
  const cells =
    typeof size === "number" ? Math.max(0, Math.floor(size)) : spacing[size]
  return axis === "horizontal" ? (
    <Box flexShrink={0} width={cells} />
  ) : (
    <Box flexShrink={0} height={cells} />
  )
}
