import React, { useEffect, useRef, useState } from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

export type TabItem<T extends string = string> = {
  value: T
  label: string
  count?: number
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
}

type TabsProps<T extends string> = {
  active: T
  items: TabItem<T>[]
}

/** Columns between one tab and the next, on both rows. They must agree. */
const GAP = 2

/**
 * How long the rule takes to travel, and in how many steps.
 *
 * Short on purpose. The rule is not the news — it is confirmation of a key you
 * just pressed, and a confirmation that outlasts your certainty about having
 * pressed it has stopped confirming anything. Six steps over ~150ms is enough to
 * read as movement rather than as a jump, and short enough that holding ← or →
 * to cross four tabs feels like one gesture instead of four animations queueing.
 */
const SLIDE_STEPS = 6
const SLIDE_MS = 25

type Rule = { start: number; width: number }

/**
 * The rule's position this frame: where it is going, or somewhere between where
 * it was and where it is going.
 *
 * Both ENDS are interpolated rather than the left edge alone, which is what makes
 * it read as one object moving instead of a bar being retyped: crossing to a
 * wider tab, the far edge arrives first and the near edge catches up, so the rule
 * stretches and settles the way a physical thing would.
 */
export const between = (from: Rule, to: Rule, t: number): Rule => {
  const ease = 1 - Math.pow(1 - t, 3)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * ease)
  const left = lerp(from.start, to.start)
  const right = lerp(from.start + from.width, to.start + to.width)
  return { start: left, width: Math.max(1, right - left) }
}

const useSlide = (rules: Rule[], active: number): Rule | null => {
  const target = rules[active] ?? null
  const [step, setStep] = useState(SLIDE_STEPS)
  const from = useRef<Rule | null>(target)
  const last = useRef(active)

  useEffect(() => {
    if (last.current === active) return
    // Where it was when the tab changed — the interpolated position, not the old
    // tab's resting place, so interrupting a slide half-way carries on from where
    // the rule actually is rather than snapping back to start again.
    from.current =
      step >= SLIDE_STEPS
        ? (rules[last.current] ?? target)
        : between(
            from.current ?? target!,
            rules[last.current] ?? target!,
            step / SLIDE_STEPS,
          )
    last.current = active
    setStep(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    if (step >= SLIDE_STEPS) return
    const id = setTimeout(() => setStep((s) => s + 1), SLIDE_MS)
    return () => clearTimeout(id)
  }, [step])

  if (!target) return null
  if (step >= SLIDE_STEPS || !from.current) return target
  return between(from.current, target, step / SLIDE_STEPS)
}

// The active tab is marked by an underline (border-bottom) under it, in the
// accent colour; inactive tabs get none. The underline's presence — not its
// hue — is what distinguishes the active tab, so it reads correctly in
// greyscale and for colourblind users. Two rows (labels, then underlines) keep
// the `─` runs aligned under each label since both share the same cell widths
// and gap.
export const Tabs = <T extends string>({ active, items }: TabsProps<T>) => {
  const cells = items.map((item) => ({
    key: item.value,
    marker: item.marker ?? "",
    markerColor: item.markerColor,
    text:
      item.count !== undefined ? `${item.label} (${item.count})` : item.label,
    isActive: item.value === active,
  }))

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
  // The gutter is still measured, and spent as leading blanks on the rule row, so
  // both rows stay the same width and the runs line up under their labels
  // whatever the markers are doing.
  const gutterOf = (cell: (typeof cells)[number]) => [...cell.marker].length
  const labelOf = (cell: (typeof cells)[number]) => [...cell.text].length

  // Where each tab's rule would sit if it were drawn: the column its label starts
  // in, and how wide that label is. Accumulated left to right, charging the same
  // GAP the label row's own `gap` puts between cells — the two rows have to agree
  // to the column or the rule drifts off its word.
  const rules: { start: number; width: number }[] = []
  let x = 0
  for (const cell of cells) {
    rules.push({ start: x + gutterOf(cell), width: labelOf(cell) })
    x += gutterOf(cell) + labelOf(cell) + GAP
  }
  const activeIndex = cells.findIndex((c) => c.isActive)
  const rule = useSlide(rules, activeIndex) ?? { start: 0, width: 0 }

  return (
    <Box flexDirection="column">
      <Box gap={GAP}>
        {cells.map((cell) => (
          <Box key={cell.key}>
            {cell.marker ? (
              <Text color={cell.markerColor}>{cell.marker}</Text>
            ) : null}
            <Text
              bold={cell.isActive}
              color={cell.isActive ? colors.accent : undefined}
              dimColor={!cell.isActive}
            >
              {cell.text}
            </Text>
          </Box>
        ))}
      </Box>
      {/* One string rather than a run per cell, which is what lets the rule
          TRAVEL: a per-cell run can only be present or absent, so switching tabs
          could only ever blink it out of one and into another. Positioned
          absolutely along the row, it can sit between two tabs for a few frames
          on the way across. */}
      <Box>
        <Text color={colors.accent}>
          {" ".repeat(rule.start) + "─".repeat(rule.width)}
        </Text>
      </Box>
    </Box>
  )
}
