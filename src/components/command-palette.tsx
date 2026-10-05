import React, { useEffect, type ReactNode } from "react"
import { Box, Text } from "ink"
import stringWidth from "string-width"
import { TextInput } from "./text-input.js"
import { type Hint } from "./footer-hints.js"
import { useListCursor } from "./use-list-cursor.js"
import { colors } from "../tokens.js"

export type PaletteItem = {
  id: string
  /** What is matched and, absent `label`, what is drawn. */
  title: string
  /**
   * What is drawn instead of `title` when a row needs more than one ink — a
   * ticket key in the accent beside a destination word in `info`. Matching
   * still reads `title`, so a host that draws rich rows keeps them findable.
   */
  label?: ReactNode
  /** Rows sharing a group are drawn under one header while the query is empty. */
  group?: string
  /** Dim trailing text: a description, a path, what the row will do. */
  hint?: string
  keywords?: string[]
  /**
   * One cell, drawn before the title. Every row in a list carries a marker of
   * the same width or none — the cell is reserved for all rows the moment one
   * row has one, so a marker arriving never shifts its neighbours.
   */
  marker?: string
  markerColor?: string
}

type CommandPaletteProps = {
  /** The rows to draw, in order. The palette never filters them. */
  items: PaletteItem[]
  query: string
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
  /** `esc`. The value is the host's, so nothing here clears it. */
  onClose?: () => void
  /**
   * One muted line drawn where the rows would be, when there are none: what
   * the query did not find, or what is not configured. Enter is a no-op while
   * it shows. Never a row, so the cursor cannot land on it.
   */
  message?: string
  /**
   * One muted line drawn where the rows would be while the palette is still
   * waiting for its first query: `items` is empty and the query is too, e.g.
   * "type a ticket key". Loses to `message`, and never shows beside rows —
   * once the host has rows (grouped or flat) they are drawn instead.
   */
  emptyHint?: string
  placeholder?: string
  width?: number
  /** Visual lines the row area may spend before it scrolls. */
  maxRows?: number
  hints?: Hint[]
  isActive?: boolean
}

type Row = { header: string } | { item: PaletteItem; index: number }

const isItemRow = (row: Row): row is { item: PaletteItem; index: number } =>
  "item" in row

/*
 * Grouped while idle, flat while typing. A header is worth drawing when the
 * reader has not said what they want yet and the list is the whole menu; once
 * a query narrows it the groups are noise between the hits, and the flat list
 * is what every launcher shows. Groups keep first-seen order — the host sorted
 * the items, and re-sorting its groups alphabetically would undo that.
 */
const rowsOf = (items: PaletteItem[], query: string): Row[] => {
  const grouped = query.trim() === "" && items.some((item) => item.group)
  if (!grouped) return items.map((item, index) => ({ item, index }))
  const rows: Row[] = []
  const seen: string[] = []
  for (const group of items.map((item) => item.group ?? "")) {
    if (!seen.includes(group)) seen.push(group)
  }
  for (const group of seen) {
    if (group) rows.push({ header: group })
    items.forEach((item, index) => {
      if ((item.group ?? "") === group) rows.push({ item, index })
    })
  }
  return rows
}

const DEFAULT_HINTS: Hint[] = [
  ["↑↓", "move"],
  ["⏎", "select"],
  ["esc", "close"],
]

// Ink only paints the cells a line writes, so an overlay that leaves a cell
// empty leaves whatever was underneath showing through. Every line below is
// therefore exactly the inner width: literal leading spaces instead of Box
// padding, literal separators instead of flex gaps, and trailing spaces out
// to the border — measured with string-width, never padEnd, so wide glyphs
// price correctly.
const spaces = (count: number) => " ".repeat(Math.max(0, count))
const padEndWidth = (value: string, width: number) =>
  value + spaces(width - stringWidth(value))

/**
 * A launcher: a query line over a list of rows, one cursor, Enter runs the row
 * under it. Dumb by design — it holds no query state of its own and does no
 * filtering, so the same component serves a host that narrows a fixed command
 * tree (hand `fuzzyFilter` to `onQueryChange`) and a host that DERIVES rows from
 * the query, where `ACC-1234` becomes two verbs. Uncontrolled in the keyboard
 * sense: the query field owns typing, `↑↓` move the cursor, `⏎` selects, `esc`
 * calls `onClose`. Mount it as the topmost layer and let the app's `useAppKeys`
 * stand down while it is up, or `esc` will close it and go back a level too.
 */
export const CommandPalette = ({
  items,
  query,
  onQueryChange,
  onSelect,
  onClose,
  message,
  emptyHint,
  placeholder = "type to search",
  width = 60,
  maxRows = 10,
  hints = DEFAULT_HINTS,
  isActive = true,
}: CommandPaletteProps) => {
  const { cursor, setCursor } = useListCursor(items.length, {
    vimKeys: false,
    isActive,
  })
  // A new query is a new list: the cursor goes back to the first hit rather
  // than sitting on whatever index it held in the old one.
  useEffect(() => setCursor(0), [query, setCursor])
  const at = Math.min(cursor, Math.max(0, items.length - 1))

  const rows = rowsOf(items, query)
  const cursorRow = rows.findIndex((row) => isItemRow(row) && row.index === at)
  const budget = Math.max(1, maxRows)
  const start = Math.max(
    0,
    Math.min(cursorRow - Math.floor(budget / 2), rows.length - budget),
  )
  const visible = rows.slice(start, start + budget)
  const scrolls = rows.length > budget
  const hasMarkers = items.some((item) => item.marker)
  const inner = width - 2
  const headerTrail = (title: string) =>
    Math.max(2, inner - 5 - stringWidth(title))
  // Before the first keystroke there are no rows and no verdict yet: the
  // hint holds the slot so the box keeps its shape, padded like every line.
  const emptyLine = message ?? (query.trim() === "" ? emptyHint : undefined)
  const counter = `${at + 1} of ${items.length}`
  const hintsWidth =
    hints.reduce(
      (total, [key, label]) =>
        total + stringWidth(key) + 1 + stringWidth(label),
      0,
    ) +
    Math.max(0, hints.length - 1) * 2

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.info}
      backgroundColor={colors.track}
      width={width}
    >
      <Box width={inner}>
        <Text color={colors.info}>{" › "}</Text>
        <TextInput
          defaultValue={query}
          placeholder={placeholder}
          onChange={onQueryChange}
          onSubmit={() => {
            const item = items[at]
            if (item) onSelect(item.id)
          }}
          onCancel={onClose}
          isDisabled={!isActive}
        />
        {/* The filler takes whatever width the query leaves and its text
            stretches across it, so the cells after the query are spaces,
            not the host — whatever the query length or caret position. */}
        <Box flexGrow={1} flexDirection="column">
          <Text> </Text>
        </Box>
      </Box>
      <Text dimColor>{" " + "─".repeat(inner - 2) + " "}</Text>
      {items.length === 0 && emptyLine ? (
        <Text dimColor>{" " + padEndWidth(emptyLine, inner - 2) + " "}</Text>
      ) : null}
      {visible.map((row) => {
        if (!isItemRow(row)) {
          const title = row.header.toUpperCase()
          return (
            <Text key={`header:${row.header}`}>
              {" "}
              <Text dimColor>{"── "}</Text>
              <Text bold color={colors.group}>
                {title}
              </Text>
              <Text dimColor>{" " + "─".repeat(headerTrail(title))}</Text>
            </Text>
          )
        }
        const { item } = row
        const active = row.index === at
        return (
          <Box key={item.id} width={inner}>
            <Box flexShrink={0}>
              <Text color={colors.info}>{active ? " ❯ " : "   "}</Text>
            </Box>
            {hasMarkers ? (
              <Box flexShrink={0}>
                <Text color={item.markerColor}>
                  {(item.marker ?? " ") + " "}
                </Text>
              </Box>
            ) : null}
            {/* The title cell takes whatever width the row leaves and its
                text stretches across it, so a short row still paints every
                cell after its hint — this is what stops host text showing
                between the title and the border, whatever `label` draws. */}
            <Box flexGrow={1} flexDirection="column">
              <Text bold={active}>
                {item.label ?? item.title}
                {item.hint ? <Text dimColor>{"  " + item.hint}</Text> : null}
              </Text>
            </Box>
          </Box>
        )
      })}
      {scrolls ? (
        <Text dimColor>
          {" " + spaces(inner - 2 - stringWidth(counter)) + counter + " "}
        </Text>
      ) : null}
      <Text dimColor>{" " + "─".repeat(inner - 2) + " "}</Text>
      {/* Drawn inline rather than with FooterHints: its column gaps are
          unwritten cells, which is where the host showed through the footer. */}
      <Text>
        {" "}
        {hints.map(([key, label], index) => (
          <React.Fragment key={key}>
            {index > 0 ? "  " : null}
            <Text color="white">{key}</Text>
            <Text dimColor>{" " + label}</Text>
          </React.Fragment>
        ))}
        {spaces(inner - 1 - hintsWidth)}
      </Text>
    </Box>
  )
}
