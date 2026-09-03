import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Tabs, between, nearestTo } from "./Tabs.js"

const items = [
  { value: "open", label: "Open", count: 3 },
  { value: "done", label: "Done" },
]

describe("Tabs", () => {
  it("renders every tab label", () => {
    const { lastFrame } = render(<Tabs active="open" items={items} />)
    expect(lastFrame()).toContain("Open")
    expect(lastFrame()).toContain("Done")
  })

  it("shows the count when provided", () => {
    const { lastFrame } = render(<Tabs active="open" items={items} />)
    expect(lastFrame()).toContain("Open (3)")
  })

  it("underlines the active tab", () => {
    const { lastFrame } = render(<Tabs active="open" items={items} />)
    // The active label "Open (3)" is 8 chars, so its underline is 8 dashes.
    expect(lastFrame()).toContain("─".repeat("Open (3)".length))
  })

  it("underlines only the active tab, not the others", () => {
    // With "Done" (4 chars) active, the only underline run is 4 dashes; the
    // absence of any 8-dash run proves "Open (3)" is not underlined.
    const { lastFrame } = render(<Tabs active="done" items={items} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("─".repeat("Done".length))
    expect(frame).not.toContain("─".repeat("Open (3)".length))
  })
})

/*
 * A marker exists so a caller can say something about a tab without moving the
 * bar. Prepending a glyph to `label` cannot do that — the tab it marks grows,
 * every tab after it slides, and a bar that shifts when news arrives is a bar
 * you have to re-find. So the marker gets its own cell, its own colour, and its
 * width counted into the rule beneath.
 */
describe("Tabs markers", () => {
  const marked = [
    {
      value: "open",
      label: "Open",
      count: 3,
      marker: "● ",
      markerColor: "red",
    },
    { value: "done", label: "Done", marker: "  " },
  ]

  it("draws the marker before its label", () => {
    const frame =
      render(<Tabs active="open" items={marked} />).lastFrame() ?? ""
    expect(frame).toContain("● Open (3)")
  })

  // The rule goes under the LABEL, and the marker sits in a gutter outside it.
  // A rule spanning both reaches past the word on the left and stops flush on the
  // right, which reads as lopsided rather than as generous — and the two answer
  // different questions, so a rule that swallows the marker claims the marker as
  // part of its own answer.
  it("underlines the label and not the marker", () => {
    const frame =
      render(<Tabs active="open" items={marked} />).lastFrame() ?? ""
    expect(frame).toContain("─".repeat("Open (3)".length))
    expect(frame).not.toContain("─".repeat("● Open (3)".length))
  })

  // The gutter is still measured — spent as blanks on the rule row — so both rows
  // stay the same width and each run sits under its own label however the markers
  // change.
  it("keeps the rule aligned under its label", () => {
    const frame =
      render(<Tabs active="open" items={marked} />).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("Open")).toBe(rules!.indexOf("─"))
  })

  it("leaves the underline alone on a tab with no marker", () => {
    const frame = render(<Tabs active="open" items={items} />).lastFrame() ?? ""
    expect(frame).toContain("─".repeat("Open (3)".length))
  })

  // The invariant the whole field exists for: an unmarked tab reserving a blank
  // of the same width sits in exactly the column it would without any markers.
  it("keeps a tab in the same column whether or not it is the marked one", () => {
    const lineOf = (frame: string) =>
      frame.split("\n").find((l) => l.includes("Done")) ?? ""
    const asMarked = lineOf(
      render(<Tabs active="open" items={marked} />).lastFrame() ?? "",
    )
    const asUnmarked = lineOf(
      render(
        <Tabs
          active="open"
          items={[
            { ...marked[0]!, marker: "  " },
            { ...marked[1]!, marker: "● ", markerColor: "red" },
          ]}
        />,
      ).lastFrame() ?? "",
    )
    expect(asMarked.indexOf("Done")).toBe(asUnmarked.indexOf("Done"))
  })
})

/*
 * The rule TRAVELS between tabs rather than blinking from one to the next.
 *
 * It is drawn as one positioned string rather than a run per cell, which is what
 * makes that possible at all: a per-cell run can only be present or absent, so it
 * could only ever appear in the new place and vanish from the old. Positioned, it
 * can sit between two tabs for a few frames on the way across.
 *
 * The interpolation is asserted DIRECTLY rather than by catching the component
 * mid-flight. A spec that renders, waits 40ms and reads the frame is racing Ink's
 * render loop against a wall clock — the same flakiness the hold specs in gh-ink
 * own their clock to avoid — and a racy animation spec fails on a loaded machine
 * while saying nothing about the animation. What the component owes is that it
 * ARRIVES; what the maths owes is that it passes through the middle.
 */
describe("Tabs rule travel", () => {
  const from = { start: 0, width: 5 }
  const to = { start: 20, width: 23 }

  it("starts where it was and ends where it is going", () => {
    expect(between(from, to, 0)).toEqual(from)
    expect(between(from, to, 1)).toEqual(to)
  })

  it("passes through the middle rather than jumping", () => {
    const mid = between(from, to, 0.5)
    expect(mid.start).toBeGreaterThan(from.start)
    expect(mid.start).toBeLessThan(to.start)
  })

  // Both ends move, so the rule stretches on its way to a wider tab instead of
  // sliding at its old length and snapping longer on arrival.
  it("stretches as well as travels", () => {
    const mid = between(from, to, 0.5)
    expect(mid.width).toBeGreaterThan(from.width)
    expect(mid.width).toBeLessThan(to.width)
  })

  /*
   * Slow at both ends, quick through the middle.
   *
   * It used to ease OUT only, which starts at full speed — right for something
   * entering the screen, wrong for something crossing it. A rule already on
   * screen that leaps on its first frame reads as having been redrawn somewhere
   * else rather than as having travelled, which is how it looked: a jump and
   * then a settle.
   *
   * Asserted as accelerate-then-decelerate rather than against this curve's
   * numbers, so swapping cubic for another ease of the same SHAPE does not fail
   * it. The shape is the requirement; the polynomial is an implementation of it.
   */
  it("accelerates out of the old tab and decelerates into the new", () => {
    const at = (t: number) => between(from, to, t).start
    expect(at(0.5) - at(0.25)).toBeGreaterThan(at(0.25) - at(0))
    expect(at(0.75) - at(0.5)).toBeGreaterThan(at(1) - at(0.75))
  })

  it("never collapses to nothing mid-flight", () => {
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1])
      expect(between(to, from, t).width).toBeGreaterThan(0)
  })

  it("lands under the new tab once it has arrived", async () => {
    const tabs = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "A much longer second tab" },
    ]
    const { rerender, lastFrame } = render(<Tabs active="a" items={tabs} />)
    rerender(<Tabs active="b" items={tabs} />)
    // Comfortably past SLIDE_STEPS x SLIDE_MS, so this asserts where the rule
    // SETTLES rather than racing the animation it is waiting out.
    await new Promise((r) => setTimeout(r, 700))
    const frame = lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(rules!.indexOf("─")).toBe(labels!.indexOf("A much longer"))
    expect((rules!.match(/─/g) ?? []).length).toBe(
      "A much longer second tab".length,
    )
  })
})

/*
 * The lit label follows the RULE, not the `active` prop.
 *
 * Switching the label the instant `active` changes leaves the two signals
 * disagreeing for the length of the slide: the destination tab is already bold
 * and orange while the rule is still crossing the bar towards it. One says "you
 * are here", the other "on my way", and the mismatch reads as a jump in
 * something otherwise moving smoothly.
 *
 * Asserted as a function because it cannot be asserted through a frame: boldness
 * is an escape code, the runner is not a TTY, and the codes are stripped before
 * anything here can read them.
 */
describe("Tabs highlight handover", () => {
  // Three tabs laid out as the cockpit lays them out.
  const bar = [
    { start: 2, width: 15 },
    { start: 21, width: 10 },
    { start: 35, width: 14 },
  ]

  it("lights the tab the rule is resting on", () => {
    expect(nearestTo(bar, bar[0]!, 0)).toBe(0)
    expect(nearestTo(bar, bar[1]!, 0)).toBe(1)
    expect(nearestTo(bar, bar[2]!, 0)).toBe(2)
  })

  // The frames that matter: the rule is in the gap between two tabs, overlapping
  // neither. An overlap test would light nothing at all here, which is a flicker
  // rather than a fix — so nearest-by-centre always names exactly one.
  it("always lights exactly one tab, even mid-gap", () => {
    for (let start = 2; start <= 35; start += 1) {
      const lit = nearestTo(bar, { start, width: 14 }, 0)
      expect(lit).toBeGreaterThanOrEqual(0)
      expect(lit).toBeLessThan(bar.length)
    }
  })

  // It hands over once, on the way past — not at the start, and not on arrival.
  it("hands the highlight over as the rule crosses between them", () => {
    const lit = (start: number) => nearestTo(bar, { start, width: 14 }, 0)
    expect(lit(2)).toBe(0)
    expect(lit(35)).toBe(2)
    const handovers = []
    for (let s = 3; s <= 35; s += 1) if (lit(s) !== lit(s - 1)) handovers.push(s)
    expect(handovers).toHaveLength(2)
  })

  it("falls back when there is nothing to be near", () => {
    expect(nearestTo([], { start: 0, width: 0 }, 3)).toBe(3)
  })
})
