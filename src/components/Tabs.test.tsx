import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Tabs, between } from "./Tabs.js"

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
 * The rule leads; the text follows on arrival.
 *
 * Three attempts at this, and the first two were both "one more thing moving".
 * Switching the label the instant `active` changed left the destination bold
 * while the rule was still crossing towards it. Handing the highlight over
 * mid-flight was better and still wrong: a highlight that moves while nothing
 * has arrived anywhere competes with the rule for the eye, when the whole point
 * of the animation is that exactly ONE thing moves and you can follow it.
 *
 * So the tab you came FROM keeps its highlight for the whole slide, and the
 * destination takes it at the moment the rule lands.
 *
 * Asserted through the rendered frame rather than a pure function, because that
 * is where the timing lives — but only on the two RESTING states, never by
 * catching a specific mid-flight frame, which would race Ink's render loop
 * against a wall clock and fail on a loaded machine.
 */
describe("Tabs highlight timing", () => {
  const wide = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "A much longer second tab" },
  ]
  // Bold is an escape code and the runner is not a TTY, so the codes are
  // stripped — the rule's own position is the observable proxy for "arrived".
  const ruleStart = (frame: string) => (frame.split("\n")[1] ?? "").indexOf("─")

  /*
   * What is NOT asserted here, and why, so nobody adds it back believing it was
   * an oversight: that the highlight stays put mid-slide.
   *
   * Boldness is an escape code, the runner is not a TTY, and the codes are
   * stripped before a spec can read them — so the one thing this change is about
   * is invisible from here. The nearest proxy would be to catch the rule at some
   * chosen millisecond and infer the rest, which races Ink render loop against a
   * wall clock and fails on a loaded machine while proving nothing. It is also
   * not a pure function to test instead: it holds a ref across renders on purpose,
   * so that switching tabs twice quickly leaves the highlight where it started.
   *
   * What IS pinned: the rule arrives where it was sent, from either direction.
   */
  it("arrives under the tab that asked for it", async () => {
    const { rerender, lastFrame } = render(<Tabs active="a" items={wide} />)
    rerender(<Tabs active="b" items={wide} />)
    await new Promise((r) => setTimeout(r, 700))
    const labels = (lastFrame() ?? "").split("\n")[0] ?? ""
    expect(ruleStart(lastFrame() ?? "")).toBe(labels.indexOf("A much longer"))
  })

  it("settles with the rule under the tab that asked for it", async () => {
    const { rerender, lastFrame } = render(<Tabs active="b" items={wide} />)
    rerender(<Tabs active="a" items={wide} />)
    await new Promise((r) => setTimeout(r, 700))
    const labels = (lastFrame() ?? "").split("\n")[0] ?? ""
    expect(ruleStart(lastFrame() ?? "")).toBe(labels.indexOf("Alpha"))
  })
})
