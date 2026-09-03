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
 * Six steps at 25ms was the first attempt and it read as a jump rather than a
 * slide, for two reasons that both had to go. At 25ms the steps land faster than
 * the terminal repaints, so several coalesce and you see three positions where
 * the maths computed six. And an ease-OUT spends most of its travel in the first
 * of those, so the opening frame arrived nearly there and everything after it was
 * a settle: jump, then bubble.
 *
 * Twelve steps at 28ms is roughly one step per repaint, and about a third of a
 * second end to end — long enough to read as a thing moving rather than as a
 * redraw, short enough that holding an arrow across four tabs stays one gesture
 * instead of four animations queueing.
 */
const SLIDE_STEPS = 12
const SLIDE_MS = 28

type Rule = { start: number; width: number }

/**
 * The rule's position this frame: where it is going, or somewhere between where
 * it was and where it is going.
 *
 * Both ENDS are interpolated rather than the left edge alone, which is what makes
 * it read as one object moving instead of a bar being retyped: crossing to a
 * wider tab, the far edge arrives first and the near edge catches up, so the rule
 * stretches and settles the way a physical thing would.
 *
 * Eased in AND out, not merely out. An ease-out starts at full speed, which is
 * right for something entering the screen and wrong for something crossing it: a
 * rule already on screen that leaps on its first frame reads as having been
 * redrawn elsewhere rather than as having travelled. Slow at both ends and quick
 * through the middle is how a physical thing crosses a gap, and it is the shape
 * an eye can follow.
 */
export const between = (from: Rule, to: Rule, t: number): Rule => {
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * ease)
  // Start and WIDTH, never the two edges independently.
  //
  // Interpolating left and right separately is the same maths before rounding —
  // lerp is linear, so lerp(start) + lerp(width) IS lerp(right) — but the two
  // Math.rounds land independently, and mid-travel they disagree: the rule
  // twitches a column wider and back on alternate frames while it moves. It
  // reads as a jump in something that is otherwise sliding smoothly, and it was
  // invisible until the positions were dumped frame by frame. Rounding the width
  // once makes it step from one length to the other exactly once.
  return {
    start: lerp(from.start, to.start),
    width: Math.max(1, lerp(from.width, to.width)),
  }
}

/**
 * Where the rule is this frame, and which tab is LIT.
 *
 * The two are deliberately not the same answer. The rule moves first and the
 * highlight lands when it arrives — so throughout the slide the tab you came
 * FROM stays lit, and the destination takes the highlight at the moment the rule
 * reaches it. The underline leads, the text follows.
 *
 * Switching the label the instant `active` changed was the first attempt, and it
 * read as a jump: the destination was already bold while the rule was still
 * crossing towards it. Handing the highlight over mid-flight was the second — an
 * improvement, still wrong, because a highlight that moves while nothing has
 * arrived anywhere is one more thing in motion, when the whole point is that
 * exactly one thing moves and the eye can follow it.
 */
const useSlide = (
  rules: Rule[],
  active: number,
): { rule: Rule | null; lit: number } => {
  const target = rules[active] ?? null;
  const [step, setStep] = useState(SLIDE_STEPS);
  const from = useRef<Rule | null>(target);
  const last = useRef(active);
  // The tab keeping its highlight until the rule lands. Held across an
  // interrupted slide rather than updated: switch twice quickly and the highlight
  // stays where it started, because it still has not arrived anywhere.
  const litIndex = useRef(active);

  useEffect(() => {
    if (last.current === active) return;
    const settled = step >= SLIDE_STEPS;
    // Where it was when the tab changed — the interpolated position, not the old
    // tab's resting place, so interrupting a slide half-way carries on from where
    // the rule actually is rather than snapping back to start again.
    from.current = settled
      ? (rules[last.current] ?? target)
      : between(
          from.current ?? target!,
          rules[last.current] ?? target!,
          step / SLIDE_STEPS,
        );
    if (settled) litIndex.current = last.current;
    last.current = active;
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (step >= SLIDE_STEPS) return;
    const id = setTimeout(() => setStep((s) => s + 1), SLIDE_MS);
    return () => clearTimeout(id);
  }, [step]);

  const arrived = step >= SLIDE_STEPS;
  if (arrived) litIndex.current = active;
  if (!target) return { rule: null, lit: litIndex.current };
  if (arrived || !from.current) return { rule: target, lit: active };
  return {
    rule: between(from.current, target, step / SLIDE_STEPS),
    lit: litIndex.current,
  };
};
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
  const slide = useSlide(rules, activeIndex)
  const rule = slide.rule ?? { start: 0, width: 0 }
  const litIndex = slide.lit

  /*
   * Which label is LIT follows the rule, not the prop.
   *
   * Switching the label the instant `active` changes leaves the two signals
   * disagreeing for the length of the slide: the new tab is already bold and
   * orange while the rule is still crossing the bar towards it. One says "you are
   * here", the other says "on my way", and the eye reads the mismatch as a jump
   * in something that is otherwise moving smoothly.
   *
   * Nearest BY CENTRE rather than "does the rule overlap this label", because the
   * rule spends part of its journey in the gap between two tabs — an overlap test
   * lights nothing at all for those frames, which is a flicker rather than a fix.
   * Nearest always names exactly one, and hands the highlight over as the rule
   * passes the midpoint between them.
   */

  return (
    <Box flexDirection="column">
      <Box gap={GAP}>
        {cells.map((cell, i) => (
          <Box key={cell.key}>
            {cell.marker ? (
              <Text color={cell.markerColor}>{cell.marker}</Text>
            ) : null}
            <Text
              bold={i === litIndex}
              color={i === litIndex ? colors.accent : undefined}
              dimColor={i !== litIndex}
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
