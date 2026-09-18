import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Tabs } from "./tabs.js"

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

  /*
   * One number means the tab is whole; two mean you are looking at a sample.
   * The rule has to hold in BOTH directions or it teaches nothing — a reader who
   * sees a slash on some tabs and a bare count on others cannot tell whether the
   * bare one means "complete" or "nobody passed a total".
   */
  it("draws a fraction when the count is a window onto something larger", () => {
    const { lastFrame } = render(
      <Tabs
        active="issues"
        items={[{ value: "issues", label: "Issues", count: 20, total: 97 }]}
      />,
    )
    expect(lastFrame()).toContain("Issues (20/97)")
  })

  it("keeps a bare count when nothing is hidden", () => {
    const { lastFrame } = render(
      <Tabs
        active="mine"
        items={[{ value: "mine", label: "Mine", count: 8 }]}
      />,
    )
    expect(lastFrame()).toContain("Mine (8)")
    expect(lastFrame()).not.toContain("/")
  })

  it("underlines the whole fraction, not just the count", () => {
    // The rule is sized off the rendered label, so a notation change the width
    // maths did not hear about surfaces here as a short underline.
    const { lastFrame } = render(
      <Tabs
        active="issues"
        items={[{ value: "issues", label: "Issues", count: 20, total: 97 }]}
      />,
    )
    expect(lastFrame()).toContain("─".repeat("Issues (20/97)".length))
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
