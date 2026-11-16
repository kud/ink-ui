import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

export type CardStatus = {
  /** The glyph that leads the status, e.g. "●". */
  glyph: string
  /** The word that names the status, e.g. "outage". The word carries the meaning; colour only reinforces it. */
  word: string
  /** The status colour; it also paints the card's left edge. Defaults to colors.muted. */
  color?: string
}

export type CardProps = {
  /** The card's title, shown on the first content row. */
  title: string
  /** The status glyph, word and optional colour. */
  status: CardStatus
  /** Optional body text on the third row. */
  body?: string
  /** Optional footnote on the fifth row, left-aligned. */
  footnote?: string
  /** Optional meta text on the fifth row, right-aligned and dim. */
  meta?: string
  /** The card's fixed width in columns. */
  width: number
  /** When true the border becomes bold (━ ┃) instead of round (╭ ╮). Default false. */
  selected?: boolean
  /** When true the selected border uses the accent colour; when false it uses secondary. Only applies when selected is true. Default true. */
  focused?: boolean
}

// Border, title and status, a blank, body, footnote and meta, border: fixed,
// so a grid of cards lines up whatever each one has to say.
export const CARD_HEIGHT = 6

/**
 * A bordered card for one item with a state: a title with its status on the
 * right, a body line, and a footnote with an optional right-aligned meta.
 *
 * The left edge carries the status colour whether selected or not: the status
 * belongs to the card, the rest of the border to the cursor. Selection is the
 * bold border (━ ┃) rather than a colour, so it stays legible without one.
 * Title, body and footnote take the terminal's default foreground so they read
 * on a light theme as well as a dark one. Text starts two cells in from the
 * card's left edge (border and padding), the column a selection marker
 * gutter of two cells lines up with.
 */
export const Card = ({
  title,
  status,
  body,
  footnote,
  meta,
  width,
  selected = false,
  focused = true,
}: CardProps) => {
  const inner = width - 4
  // Reserve room for the title/footnote when a trailing label is unusually long.
  const trailingWidth = Math.max(1, inner - 6)
  const statusColour = status.color ?? colors.muted
  const borderColor = selected ? (focused ? colors.accent : colors.secondary) : colors.track

  return (
    <Box
      width={width}
      height={CARD_HEIGHT}
      flexShrink={0}
      flexDirection="column"
      overflow="hidden"
      borderStyle={selected ? "bold" : "round"}
      borderColor={borderColor}
      borderLeftColor={statusColour}
      paddingX={1}
    >
      <Box width={inner} gap={2}>
        <Box flexGrow={1} flexShrink={1}>
          <Text bold wrap="truncate-end">{title}</Text>
        </Box>
        <Box flexShrink={0} maxWidth={trailingWidth}>
          <Text color={statusColour} wrap="truncate-end">{`${status.glyph} ${status.word}`}</Text>
        </Box>
      </Box>
      <Text> </Text>
      <Text wrap="truncate-end">{body || " "}</Text>
      <Box width={inner} gap={2}>
        <Box flexGrow={1} flexShrink={1}>
          <Text wrap="truncate-end">{footnote || " "}</Text>
        </Box>
        {meta ? (
          <Box flexShrink={0} maxWidth={trailingWidth}>
            <Text color={colors.muted} wrap="truncate-end">{meta}</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
