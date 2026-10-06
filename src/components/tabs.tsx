import React from "react"
import { Box, Text, useStdout } from "ink"
import stringWidth from "string-width"
import { glyph } from "@kud/glyphs"
import { colors } from "../tokens.js"
import { Pill, pillStyle } from "./pill.js"

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
   * How many things the tab holds, drawn as a soft chip beside the label — no
   * parentheses. `null` means "not known yet" and draws a chip holding `–`,
   * padded in front to the width of a two-digit count, so the bar does not
   * shift when the real numbers land. Omit it for a tab with no count. With
   * `NO_COLOR` the chip falls back to the parenthesised `(–)` form.
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
   * The true size of what `count` is a window onto, drawn inside the count's
   * own chip as `count/total` — one chip, never two.
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
   * magnitude survives with it, which is the half that matters most. `30/37`
   * and `20/149` say very different things about how far a tab can be trusted,
   * where a bare truncation flag says only "incomplete".
   *
   * With `NO_COLOR` the chip falls back to the parenthesised `(count/total)`
   * form.
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
   * strip (every marker gutter, icon, label, chip, gap and divider) does not
   * fit, each inactive tab WITH an icon drops its label and renders `icon` plus
   * its chip. The active tab always keeps its full form, tabs without an icon
   * never fold, and dividers stay where they were.
   */
  width?: number
}

/** Columns between one tab and the next, on both rows. They must agree. */
const GAP = 2

/** A count not yet known, folded under NO_COLOR: the dash alone, without the pending width. */
const FOLDED_PENDING_COUNT = "–"

/** Divider rendered between groups: a single pipe. The Box gap={GAP} adds 2 spaces on each side. */
const DIVIDER = "│"
const DIVIDER_WIDTH = 1

/**
 * The count chip's fill for `isActive` — the tonal pill's own fill, rest
 * beside an inactive label (a step above the ground, never dimmed into it),
 * strong beside the active one. Exported for its own test and nothing else,
 * for the same reason as `shouldFoldTabs`: the runner never sees a hue.
 */
export const tabCountChipFill = (isActive: boolean): string =>
  pillStyle(isActive ? "accent" : "muted", "tonal", isActive).fill

/**
 * The count run's style for `isActive`: the number inked on its chip fill —
 * bold on the active tab, and never `dimColor` in either state (a number
 * filed with the ages reads as skippable). Exported for its own test and
 * nothing else, for the same reason as `shouldFoldTabs`: the runner never
 * sees a hue.
 */
export const tabCountStyle = (isActive: boolean) => {
  const style = pillStyle(isActive ? "accent" : "muted", "tonal", isActive)
  return {
    bold: style.bold,
    color: style.ink,
    backgroundColor: style.fill,
  }
}

// The number (or fraction, or pending dash) drawn inside the count chip —
// without caps, parens or the separating space. A fraction stays ONE chip:
// `count/total` never splits into two. An unknown count is a dash padded in
// front to the width of a two-digit count, as `Page` pads its own count, so the
// bar does not shift when the real numbers land; under NO_COLOR the padding is
// the parens' own, and the dash stands alone.
const countContentOf = <T extends string>(
  item: TabItem<T>,
): string | undefined => {
  if (item.count === undefined) return undefined
  if (item.count === null)
    return process.env["NO_COLOR"] ? FOLDED_PENDING_COUNT : " –"
  if (item.total === undefined) return String(item.count)
  return `${item.count}/${item.total}`
}

// The tail drawn after the label, separating space included: a soft chip —
// left cap, content, right cap — exactly the way `Pill` draws one, the two caps
// standing in for the two parens so a tab prices exactly as before. Under
// NO_COLOR the caps would be drawing the outline of a fill that is not there,
// so the tail falls back to the parenthesised form it replaces, as plain runs.
const chipTailOf = (content: string): string =>
  ` ${glyph("plCapLeft")}${content}${glyph("plCapRight")}`

// The full text of a tab, split for its runs: the label part (icon included)
// and the count tail. The icon lives in the label part, not in a second gutter
// beside the marker: it answers "which tab is this", the same question the
// label answers, so it takes the label's style and the active rule spans it.
// The separating space goes with the tail, so the label run never carries a
// trailing blank. A Nerd Font glyph is one cell but a caller could pass
// anything, so widths are measured at render time, never counted.
const fullPartsOf = <T extends string>(item: TabItem<T>): [string, string] => {
  const head =
    item.icon === undefined ? item.label : `${item.icon} ${item.label}`
  const content = countContentOf(item)
  if (content === undefined) return [head, ""]
  if (process.env["NO_COLOR"]) return [head, ` (${content})`]
  return [head, chipTailOf(content)]
}

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

// The full text of a tab, for measuring the strip: the two parts joined, byte
// for byte what the runs draw. The caps are real glyphs of width one, so the
// measured width is the drawn width — two caps for two parens.
const fullTextOf = <T extends string>(item: TabItem<T>): string =>
  fullPartsOf(item).join("")

// An inactive icon tab with nowhere to sit, split the same way: the label
// goes, the icon and the chip stay — one space between icon and chip, the same
// tail as the full form. A tab with no count at all is its icon alone. Only
// ever read for a tab with an icon: those are the only ones that fold. Under
// NO_COLOR the tail is the plain form it replaces, parens included only where
// the full form has them.
const foldedPartsOf = <T extends string>(
  item: TabItem<T>,
): [string, string] => {
  const icon = item.icon ?? ""
  const content = countContentOf(item)
  if (content === undefined) return [icon, ""]
  if (process.env["NO_COLOR"])
    return [
      icon,
      item.count === null ? ` ${FOLDED_PENDING_COUNT}` : ` ${content}`,
    ]
  return [icon, chipTailOf(content)]
}

// The folded text, for measuring: the two parts joined.
const foldedTextOf = <T extends string>(item: TabItem<T>): string =>
  foldedPartsOf(item).join("")

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

  const cells = items.map((item) => {
    const [fullLabel, fullTail] = fullPartsOf(item)
    const [foldedLabel, foldedTail] = foldedPartsOf(item)
    return {
      key: item.value,
      marker: item.marker ?? "",
      markerColor: item.markerColor,
      fullText: fullTextOf(item),
      foldedText: foldedTextOf(item),
      fullLabel,
      fullTail,
      foldedLabel,
      foldedTail,
      countContent: countContentOf(item),
      hasIcon: item.icon !== undefined,
      isActive: item.value === active,
      group: item.group,
    }
  })

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

  // The rule goes under the LABEL — icon, space and label together — and the
  // marker sits in a gutter outside it, and the count chip outside that.
  //
  // It used to span both label and marker, on the reasoning that a short
  // underline reads as a rendering fault. Seen on a real bar that is exactly
  // backwards: the rule reaches two columns past the word on the left and stops
  // flush on the right, which reads as lopsided rather than as generous. And the
  // two answer different questions — the rule says which tab you are ON, the
  // marker says which tab has news — so a rule that swallows the marker is
  // claiming the marker as part of its own answer.
  //
  // The icon is not a gutter: it sits inside the label's run, so the rule spans
  // icon, space and label together. The chip is not the label either: it says
  // how much the tab holds, a second answer, so the rule ends under the label
  // and never reaches under the chip.
  //
  // The gutter AND the chip are still measured: `x` advances past the whole
  // cell — gutter, label, chip, gap — so the rule's start lands in the active
  // tab's own column even when earlier tabs carry chips of their own.
  const gutterOf = (cell: (typeof cells)[number]) => stringWidth(cell.marker)
  const labelOf = (cell: (typeof cells)[number]) =>
    stringWidth(
      folded && !cell.isActive && cell.hasIcon
        ? cell.foldedLabel
        : cell.fullLabel,
    )

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
      x += gutterOf(item.cell) + stringWidth(textOf(item.cell)) + GAP
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
          const isFolded = folded && !cell.isActive && cell.hasIcon
          const labelText = isFolded ? cell.foldedLabel : cell.fullLabel
          const tailText = isFolded ? cell.foldedTail : cell.fullTail
          return (
            <Box key={cell.key}>
              {cell.marker ? (
                <Text color={cell.markerColor}>{cell.marker}</Text>
              ) : null}
              <Text {...tabLabelStyle(cell.isActive)}>{labelText}</Text>
              {tailText ? (
                process.env["NO_COLOR"] ? (
                  <Text {...tabCountStyle(cell.isActive)}>{tailText}</Text>
                ) : (
                  // The separating space lives inside this run, not beside
                  // it: a bare string child of the row's `Box` blanks the
                  // whole strip, while a string inside a `Text` is just text.
                  <Text>
                    {" "}
                    <Pill
                      tone="tonal"
                      variant={cell.isActive ? "accent" : "muted"}
                      strong={cell.isActive}
                    >
                      {cell.countContent ?? ""}
                    </Pill>
                  </Text>
                )
              ) : null}
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
