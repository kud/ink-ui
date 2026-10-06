import React from "react"
import { Box, Text, useStdout } from "ink"
import stringWidth from "string-width"
import { colors } from "../tokens.js"

export type TabItem<T extends string = string> = {
  value: T
  label: string
  /**
   * A single glyph drawn between the `marker` gutter and the label, one space
   * before the label — a Nerd Font char, a geometric shape, whatever names the
   * tab at a glance.
   *
   * It is part of the label, not a second gutter: it takes the label's own
   * style (bold in the accent when active, dim when not) and the active rule
   * spans icon, space and label together. The marker keeps its own cell and its
   * own colour, so a pulse appearing beside an icon still moves nothing.
   * Measured with `string-width` rather than counted, so a wide glyph prices
   * its own columns.
   *
   * It is also what a narrow terminal folds to: when the strip does not fit its
   * `width`, an inactive tab with an icon drops its label and renders `icon
   * count`. Omit it and the tab never folds.
   */
  icon?: string
  /**
   * How many things the tab holds. `null` means "not known yet" and draws as
   * `(–)`, padded in front to the width of a two-digit count, so the bar does
   * not shift when the real numbers land. Omit it for a tab with no count.
   */
  count?: number | null
  /**
   * A marker drawn immediately before the label, in its own colour.
   *
   * Give every tab one of the SAME WIDTH, or none at all. A marker that appears
   * on one tab alone pushes every tab after it sideways — which is the whole
   * reason this is a field rather than something a caller prepends to `label`:
   * a bar that shifts when news arrives is a bar you have to re-find. A blank of
   * the right width is how you say "not this one".
   *
   * Its own `Text` because the label's colour answers "is this tab active" and a
   * marker usually answers something else; folded together, the marker would
   * have to borrow the answer to the wrong question.
   *
   * Animating one costs nothing: the cell is already reserved, so a caller
   * cycling the glyph or the colour per frame moves no layout at all.
   */
  marker?: string
  markerColor?: string
  /**
   * The true size of what `count` is a window onto, drawn as `(count/total)`.
   *
   * A field rather than something a caller folds into `label`, for the same
   * reason `marker` is one — and this one was learned the hard way. A caller
   * with no channel for "there are more than these" smuggled it into the label
   * as `Issues +129 (20)`, and `+` is an operator: it tells the reader to add,
   * with nothing on screen to add it to. The arithmetic even works, which is
   * what makes it vicious — a reader who obeys gets a real number for a question
   * nobody asked, with no signal they have misread anything.
   *
   * A fraction is part-of-whole, the most over-learned notation there is: page 3
   * of 12. Nobody computes with a slash. The distinction rides on a glyph rather
   * than a hue, so it survives dimming, greyscale and colourblindness — and the
   * magnitude survives with it, which is the half that matters most. `(30/37)`
   * and `(20/149)` say very different things about how far a tab can be trusted,
   * where a bare truncation flag says only "incomplete".
   *
   * Omit it when the count IS the whole, so one number keeps meaning "complete"
   * and two always mean "you are looking at a sample".
   */
  total?: number
  /**
   * Optional group name. A divider is drawn between tabs whose group value
   * changes. Tabs with no group, or the same group as their neighbour, render
   * without a divider.
   */
  group?: string
}

type TabsProps<T extends string> = {
  active: T
  items: TabItem<T>[]
  /**
   * The width the strip may spend. Defaults to the terminal's columns; when
   * that is unknown — piped output, a captured stdout — the strip never folds,
   * because a fold is a judgement about a visible edge.
   *
   * Folding is all-or-nothing and measured, never a breakpoint: when the full
   * strip (every marker gutter, icon, label, count, gap and divider) does not
   * fit, each inactive tab WITH an icon drops its label and renders `icon
   * count`. The active tab always keeps its full form, tabs without an icon
   * never fold, and dividers stay where they were.
   */
  width?: number
}

/** Columns between one tab and the next, on both rows. They must agree. */
const GAP = 2

/** An unknown count, as wide as `(12)`: the blank goes in front, as `Page` pads its count. */
const PENDING_COUNT = " (–)"

/** Divider rendered between groups: a single pipe. The Box gap={GAP} adds 2 spaces on each side. */
const DIVIDER = "│"
const DIVIDER_WIDTH = 1

/** A count not yet known, folded: the dash alone, without the pending width. */
const FOLDED_PENDING_COUNT = "–"

/**
 * Whether a strip priced at `fullWidth` folds itself into `availableWidth`.
 *
 * The strip is measured whole and the fold is all-or-nothing: when it does not
 * fit, every inactive icon tab folds at once — no progressive collapsing one
 * tab at a time, which would make the bar reflow under the reader's eye. An
 * unknown width never folds; exact fit is a fit.
 *
 * Exported for its own test and nothing else — `src/index.ts` does not
 * re-export it, which is this package's definition of internal. The frame a
 * test renders carries no escape codes (the runner is not a TTY), so a width
 * decision is only assertable here, as `Pill` does with its ink picker.
 */
export const shouldFoldTabs = (
  fullWidth: number,
  availableWidth: number | undefined,
): boolean => availableWidth !== undefined && fullWidth > availableWidth

/**
 * The label run's style for `isActive`: bold in the accent when on, dim when
 * off. One function because the icon shares the label's `Text` — same run,
 * same treatment, nothing to drift. Exported for its own test and nothing
 * else, for the same reason as `shouldFoldTabs`: the runner never sees a hue.
 */
export const tabLabelStyle = (isActive: boolean) => ({
  bold: isActive,
  color: isActive ? colors.accent : undefined,
  dimColor: !isActive,
})

// The full text of a tab: its label, its count, and — when given — its icon,
// one space after the icon. The icon lives in the label's own run, not in a
// second gutter beside the marker: it answers "which tab is this", the same
// question the label answers, so it takes the label's style and the active rule
// spans it. A Nerd Font glyph is one cell but a caller could pass anything, so
// its width is measured at render time, never counted.
const fullTextOf = <T extends string>(item: TabItem<T>): string => {
  const base =
    item.count === undefined
      ? item.label
      : item.count === null
        ? `${item.label} ${PENDING_COUNT}`
        : item.total === undefined
          ? `${item.label} (${item.count})`
          : `${item.label} (${item.count}/${item.total})`
  return item.icon === undefined ? base : `${item.icon} ${base}`
}

// An inactive icon tab with nowhere to sit: the label goes, the icon and the
// count stay. The count drops its parentheses — with the label gone there is no
// phrase for them to attach to — and a tab with no count at all is its icon
// alone. Only ever read for a tab with an icon: those are the only ones that
// fold.
const foldedTextOf = <T extends string>(item: TabItem<T>): string => {
  const icon = item.icon ?? ""
  if (item.count === undefined) return icon
  if (item.count === null) return `${icon} ${FOLDED_PENDING_COUNT}`
  return item.total === undefined
    ? `${icon} ${item.count}`
    : `${icon} ${item.count}/${item.total}`
}

// The active tab is marked by an underline (border-bottom) under it, in the
// accent colour; inactive tabs get none. The underline's presence — not its
// hue — is what distinguishes the active tab, so it reads correctly in
// greyscale and for colourblind users. Two rows (labels, then underlines) keep
// the `─` runs aligned under each label since both share the same cell widths
// and gap.
export const Tabs = <T extends string>({
  active,
  items,
  width,
}: TabsProps<T>) => {
  const { stdout } = useStdout()
  const availableWidth = width ?? stdout?.columns

  const cells = items.map((item) => ({
    key: item.value,
    marker: item.marker ?? "",
    markerColor: item.markerColor,
    fullText: fullTextOf(item),
    foldedText: foldedTextOf(item),
    hasIcon: item.icon !== undefined,
    isActive: item.value === active,
    group: item.group,
  }))

  // Build a flat render list: tabs and dividers between groups.
  // A divider is inserted BEFORE a tab whose group differs from the previous tab.
  type RenderItem =
    { type: "tab"; cell: (typeof cells)[number] } | { type: "divider" }

  const renderItems: RenderItem[] = []
  for (let i = 0; i < cells.length; i++) {
    const prevGroup = i > 0 ? cells[i - 1].group : undefined
    const currGroup = cells[i].group
    if (i > 0 && currGroup !== prevGroup) {
      renderItems.push({ type: "divider" })
    }
    renderItems.push({ type: "tab", cell: cells[i] })
  }

  // Price the whole strip as drawn whole — marker gutters, icons, labels,
  // counts, gaps and dividers — and fold every inactive icon tab at once when
  // it does not fit its width. No fixed breakpoint: the strip folds exactly
  // when its own measured width says it must.
  const cellWidth = (marker: string, text: string) =>
    stringWidth(marker) + stringWidth(text)
  const fullWidth =
    renderItems.reduce(
      (sum, item) =>
        sum +
        (item.type === "divider"
          ? DIVIDER_WIDTH
          : cellWidth(item.cell.marker, item.cell.fullText)),
      0,
    ) +
    GAP * Math.max(0, renderItems.length - 1)

  const folded = shouldFoldTabs(fullWidth, availableWidth)
  const textOf = (cell: (typeof cells)[number]) =>
    folded && !cell.isActive && cell.hasIcon ? cell.foldedText : cell.fullText

  // The rule goes under the LABEL, and the marker sits in a gutter outside it.
  //
  // It used to span both, on the reasoning that a short underline reads as a
  // rendering fault. Seen on a real bar that is exactly backwards: the rule
  // reaches two columns past the word on the left and stops flush on the right,
  // which reads as lopsided rather than as generous. And the two answer different
  // questions — the rule says which tab you are ON, the marker says which tab has
  // news — so a rule that swallows the marker is claiming the marker as part of
  // the answer to its own question.
  //
  // The icon is not a gutter: it sits inside the label's run, so the rule spans
  // icon, space and label together.
  //
  // The gutter is still measured, and spent as leading blanks on the rule row, so
  // both rows stay the same width and the runs line up under their labels
  // whatever the markers are doing.
  const gutterOf = (cell: (typeof cells)[number]) => stringWidth(cell.marker)
  const labelOf = (cell: (typeof cells)[number]) => stringWidth(textOf(cell))

  // Where the rule sits: the column the active label starts in, and how wide that
  // label is. Accumulated left to right, charging the same GAP the label row's own
  // `gap` puts between cells — the two rows have to agree to the column or the
  // rule drifts off its word. Dividers are also items in the Box gap, so they
  // consume their width plus GAP like any other item.
  let x = 0
  let rule = { start: 0, width: 0 }
  for (const item of renderItems) {
    if (item.type === "tab") {
      if (item.cell.isActive)
        rule = { start: x + gutterOf(item.cell), width: labelOf(item.cell) }
      x += gutterOf(item.cell) + labelOf(item.cell) + GAP
    } else {
      x += DIVIDER_WIDTH + GAP
    }
  }

  return (
    <Box flexDirection="column">
      <Box gap={GAP}>
        {renderItems.map((item, idx) => {
          if (item.type === "divider") {
            return (
              <Box key={`divider-${idx}`}>
                <Text color={colors.muted} dimColor>
                  {DIVIDER}
                </Text>
              </Box>
            )
          }
          const cell = item.cell
          return (
            <Box key={cell.key}>
              {cell.marker ? (
                <Text color={cell.markerColor}>{cell.marker}</Text>
              ) : null}
              <Text {...tabLabelStyle(cell.isActive)}>{textOf(cell)}</Text>
            </Box>
          )
        })}
      </Box>
      {/* One positioned string rather than a run per cell, so the leading blanks
          carry the markers' gutters and every run lands under its own label. It
          is also what a travelling rule would need — that work is unfinished and
          parked on feat/tabs-underline-animation. */}
      <Box>
        <Text color={colors.accent}>
          {" ".repeat(rule.start) + "─".repeat(rule.width)}
        </Text>
      </Box>
    </Box>
  )
}
