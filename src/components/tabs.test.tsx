import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, beforeEach, vi } from "vitest"
import stringWidth from "string-width"
import { Tabs, shouldFoldTabs, tabLabelStyle, tabCountStyle } from "./tabs.js"
import { colors } from "../tokens.js"

/*
 * The runner is not a TTY, so the frame carries no escape codes and two runs
 * in different colours read as one string — which is the point (the string is
 * byte-identical), but leaves the split itself unassertable on the frame. The
 * probe records every `Text`'s props while rendering the real component, so the
 * split is asserted on props and the frames stay what the user sees.
 */
vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>()
  const React = await import("react")
  const store = globalThis as unknown as { __inkTextCalls: unknown[] }
  store.__inkTextCalls = []
  return {
    ...actual,
    Text: (props: any) => {
      store.__inkTextCalls.push(props)
      return React.createElement(actual.Text, props)
    },
  }
})

type TextCall = Record<string, any>

const textCalls = () =>
  (globalThis as unknown as { __inkTextCalls: TextCall[] }).__inkTextCalls

beforeEach(() => {
  textCalls().length = 0
})

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

  /*
   * A count that has not loaded yet is a dash, not a zero: zero is a real answer.
   * It holds a two-digit count's width so the next tab does not move when the
   * numbers land.
   */
  it("draws an unknown count as (–) at the width of a two-digit count", () => {
    const row = (count: number | null) =>
      (
        render(
          <Tabs
            active="open"
            items={[
              { value: "open", label: "Open", count },
              { value: "done", label: "Done" },
            ]}
          />,
        ).lastFrame() ?? ""
      ).split("\n")[0] ?? ""
    expect(row(null)).toContain("Open  (–)")
    expect(row(null)).not.toContain("0")
    expect(row(null).indexOf("Done")).toBe(row(12).indexOf("Done"))
  })
})

describe("Tabs groups", () => {
  const grouped = [
    { value: "qa", label: "QA", count: 22, group: "board" },
    { value: "off", label: "Off board", count: 4, group: "board" },
    { value: "prs", label: "My PRs", count: 3, group: "github" },
  ]

  it("draws a divider when group changes between neighbouring tabs", () => {
    const frame = render(<Tabs active="qa" items={grouped} />).lastFrame() ?? ""
    expect(frame).toContain("│")
    expect(frame).toContain("QA (22)")
    expect(frame).toContain("Off board (4)")
    expect(frame).toContain("My PRs (3)")
  })

  it("draws the divider with exactly GAP spaces on each side (via Box gap)", () => {
    const frame = render(<Tabs active="qa" items={grouped} />).lastFrame() ?? ""
    // First line: "QA (22)  Off board (4)  │  My PRs (3)"
    const firstLine = frame.split("\n")[0] ?? ""
    expect(firstLine).toContain("QA (22)  Off board (4)  │  My PRs (3)")
  })

  it("draws no divider when all tabs share the same group", () => {
    const sameGroup = [
      { value: "qa", label: "QA", count: 22, group: "board" },
      { value: "off", label: "Off board", count: 4, group: "board" },
    ]
    const frame =
      render(<Tabs active="qa" items={sameGroup} />).lastFrame() ?? ""
    expect(frame).not.toContain("│")
  })

  it("draws no divider when no tabs have a group", () => {
    const frame = render(<Tabs active="open" items={items} />).lastFrame() ?? ""
    expect(frame).not.toContain("│")
  })

  it("draws a divider when transitioning from no group to a group", () => {
    const mixed = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Bravo", group: "one" },
    ]
    const frame = render(<Tabs active="a" items={mixed} />).lastFrame() ?? ""
    expect(frame).toContain("│")
  })

  it("draws a divider when transitioning from a group to no group", () => {
    const mixed = [
      { value: "a", label: "Alpha", group: "one" },
      { value: "b", label: "Bravo" },
    ]
    const frame = render(<Tabs active="a" items={mixed} />).lastFrame() ?? ""
    expect(frame).toContain("│")
  })

  it("draws multiple dividers for several group changes", () => {
    const manyGroups = [
      { value: "a", label: "Alpha", group: "one" },
      { value: "b", label: "Bravo", group: "one" },
      { value: "c", label: "Charlie", group: "two" },
      { value: "d", label: "Delta", group: "three" },
      { value: "e", label: "Echo", group: "three" },
    ]
    const frame =
      render(<Tabs active="a" items={manyGroups} />).lastFrame() ?? ""
    const dividers = frame.split("│").length - 1
    expect(dividers).toBe(2)
  })

  it("keeps the underline aligned under the active label across dividers", () => {
    const frame =
      render(<Tabs active="prs" items={grouped} />).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    // "My PRs (3)" label should align with its underline
    expect(labels!.indexOf("My PRs")).toBe(rules!.indexOf("─"))
  })

  it("keeps the underline aligned when the active tab is before a divider", () => {
    const frame = render(<Tabs active="qa" items={grouped} />).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("QA")).toBe(rules!.indexOf("─"))
  })

  it("keeps the underline aligned when the active tab is after a divider", () => {
    const frame =
      render(<Tabs active="off" items={grouped} />).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("Off board")).toBe(rules!.indexOf("─"))
  })

  it("overflow: many grouped tabs wider than 80 cols, active tab last and in middle; underline still aligned", () => {
    const overflowItems = [
      { value: "a", label: "Alpha", group: "one" },
      { value: "b", label: "Bravo", group: "one" },
      { value: "c", label: "Charlie", group: "two" },
      { value: "d", label: "Delta", group: "two" },
      { value: "e", label: "Echo", group: "three" },
      { value: "f", label: "Foxtrot", group: "three" },
      { value: "g", label: "Golf", group: "four" },
      { value: "h", label: "Hotel", group: "four" },
    ]
    // Total width with dividers > 80. Active is "Echo" (in group three, middle group).
    const frame =
      render(<Tabs active="e" items={overflowItems} />).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("Echo")).toBe(rules!.indexOf("─"))
  })
})

/*
 * An icon names its tab at a glance and is part of the label, not a second
 * gutter: it takes the label's style and the active rule spans icon, space and
 * label together, while the marker keeps its own cell — so a pulse appearing
 * beside an icon still moves nothing.
 */
describe("Tabs icons", () => {
  const iconItems = [
    { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
    { value: "bravo", label: "Bravo", count: 3, icon: "▲" },
    { value: "charlie", label: "Charlie", icon: "●" },
  ]

  it("leaves no-icon output byte-identical, underline row included", () => {
    expect(render(<Tabs active="open" items={items} />).lastFrame()).toBe(
      "Open (3)  Done\n────────",
    )
    expect(
      render(
        <Tabs
          active="open"
          items={[
            {
              value: "open",
              label: "Open",
              count: 3,
              marker: "● ",
              markerColor: "red",
            },
            { value: "done", label: "Done", marker: "  " },
          ]}
        />,
      ).lastFrame(),
    ).toBe("● Open (3)    Done\n  ────────")
  })

  it("draws the icon between the marker gutter and the label", () => {
    const frame =
      render(
        <Tabs
          active="alpha"
          items={[
            {
              value: "alpha",
              label: "Alpha",
              count: 12,
              icon: "◆",
              marker: "● ",
              markerColor: "red",
            },
            {
              value: "bravo",
              label: "Bravo",
              count: 3,
              icon: "▲",
              marker: "  ",
            },
          ]}
        />,
      ).lastFrame() ?? ""
    expect(frame).toContain("● ◆ Alpha (12)")
  })

  it("draws the icon one space before the label when there is no marker", () => {
    const frame =
      render(
        <Tabs active="alpha" items={iconItems} width={80} />,
      ).lastFrame() ?? ""
    expect(frame).toContain("◆ Alpha (12)")
    expect(frame).toContain("▲ Bravo (3)")
    expect(frame).toContain("● Charlie")
  })

  it("spans the active underline across icon, space and label", () => {
    const frame =
      render(
        <Tabs active="alpha" items={iconItems} width={80} />,
      ).lastFrame() ?? ""
    // The whole first line, so a gutter leak or a short rule fails here, not
    // three tests away.
    expect(frame).toBe(
      "◆ Alpha (12)  ▲ Bravo (3)  ● Charlie\n" +
        "─".repeat(stringWidth("◆ Alpha (12)")),
    )
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("◆")).toBe(rules!.indexOf("─"))
  })

  it("underlines only the active icon tab", () => {
    const frame =
      render(
        <Tabs active="bravo" items={iconItems} width={80} />,
      ).lastFrame() ?? ""
    expect(frame).toContain("─".repeat(stringWidth("▲ Bravo (3)")))
    expect(frame).not.toContain("─".repeat(stringWidth("◆ Alpha (12)")))
  })

  // The marker contract holds with icons on the bar: an unmarked tab reserving
  // a blank of the same width sits in exactly the column it would without any
  // markers — the icon is inside the label run, so it moves with the label.
  it("keeps a tab in the same column whether or not it is the marked one", () => {
    const lineOf = (frame: string) =>
      frame.split("\n").find((l) => l.includes("Charlie")) ?? ""
    const marked = [
      {
        value: "alpha",
        label: "Alpha",
        count: 12,
        icon: "◆",
        marker: "● ",
        markerColor: "red",
      },
      { value: "bravo", label: "Bravo", count: 3, icon: "▲", marker: "  " },
      { value: "charlie", label: "Charlie", icon: "●", marker: "  " },
    ]
    const asMarked = lineOf(
      render(<Tabs active="alpha" items={marked} />).lastFrame() ?? "",
    )
    const asUnmarked = lineOf(
      render(
        <Tabs
          active="alpha"
          items={[
            { ...marked[0]!, marker: "  " },
            { ...marked[1]!, marker: "● ", markerColor: "red" },
            marked[2]!,
          ]}
        />,
      ).lastFrame() ?? "",
    )
    expect(asMarked.indexOf("Charlie")).toBe(asUnmarked.indexOf("Charlie"))
  })

  /*
   * Bold, accent and dim are unobservable through the component: the runner is
   * not a TTY, so a bold accent run renders as its bare text and the frame
   * carries no escape codes. The mapping is asserted here instead, as `Pill`
   * does with its ink picker — and the icon needs no mapping of its own,
   * because it shares the label's `Text`.
   */
  it("styles the icon run bold in the accent when active, dim when not", () => {
    expect(tabLabelStyle(true)).toEqual({
      bold: true,
      color: colors.accent,
      dimColor: false,
    })
    expect(tabLabelStyle(false)).toEqual({
      bold: false,
      color: undefined,
      dimColor: true,
    })
  })
})

/*
 * The count sits in its own run so it can be darker than the label: bold in a
 * stepped-down orange on the active tab, its own grey beside an inactive one,
 * and never dimmed into the furniture. Colour is unobservable through the
 * frame, so the mapping is asserted here instead, as `Pill` does with its ink
 * picker — and the split itself on the `Text` props the probe records, since
 * the frame reads the two runs as one string by design.
 */
describe("Tabs count run", () => {
  it("styles the count darker than the label, never dimmed", () => {
    expect(tabCountStyle(true)).toEqual({ bold: true, color: "#A35F10" })
    expect(tabCountStyle(false)).toEqual({ bold: false, color: "#585961" })
    expect("dimColor" in tabCountStyle(true)).toBe(false)
    expect("dimColor" in tabCountStyle(false)).toBe(false)
  })

  it("renders the count in its own run with the count style", () => {
    const frame =
      render(<Tabs active="open" items={items} />).lastFrame() ?? ""
    expect(frame).toBe("Open (3)  Done\n────────")
    const runs = textCalls()
    expect(runs.filter((p) => p.children === "Open (3)")).toHaveLength(0)
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: "Open",
        bold: true,
        color: colors.accent,
        dimColor: false,
      }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: " (3)",
        bold: true,
        color: "#A35F10",
      }),
    )
    expect(
      runs.filter(
        (p) =>
          (p.color === "#A35F10" || p.color === "#585961") &&
          p.children === "",
      ),
    ).toHaveLength(0)
  })

  it("gives an inactive count its own grey run with no dim", () => {
    render(<Tabs active="done" items={items} />)
    const runs = textCalls()
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: "Open",
        bold: false,
        dimColor: true,
      }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: " (3)",
        bold: false,
        color: "#585961",
      }),
    )
    expect(
      runs
        .filter((p) => p.children === " (3)")
        .every((p) => !("dimColor" in p)),
    ).toBe(true)
  })

  it("keeps the folded count in the count run", () => {
    const frame =
      render(
        <Tabs
          active="alpha"
          items={[
            { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
            { value: "bravo", label: "Bravo", count: 3, icon: "▲" },
            { value: "charlie", label: "Charlie", icon: "●" },
          ]}
          width={35}
        />,
      ).lastFrame() ?? ""
    expect(frame).toBe("◆ Alpha (12)  ▲ 3  ●\n────────────")
    const runs = textCalls()
    expect(runs.filter((p) => p.children === "◆ Alpha (12)")).toHaveLength(0)
    expect(runs.filter((p) => p.children === "▲ Bravo (3)")).toHaveLength(0)
    expect(runs).toContainEqual(
      expect.objectContaining({ children: "◆ Alpha" }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({ children: " (12)", color: "#A35F10" }),
    )
    expect(runs).toContainEqual(expect.objectContaining({ children: "▲" }))
    expect(runs).toContainEqual(
      expect.objectContaining({ children: " 3", color: "#585961" }),
    )
  })

  it("keeps the pending count's padding and the fraction in the count run", () => {
    const pending =
      render(
        <Tabs
          active="open"
          items={[
            { value: "open", label: "Open", count: null },
            { value: "done", label: "Done" },
          ]}
        />,
      ).lastFrame() ?? ""
    expect(pending.split("\n")[0]).toContain("Open  (–)")
    expect(textCalls()).toContainEqual(
      expect.objectContaining({ children: "  (–)" }),
    )

    render(
      <Tabs
        active="issues"
        items={[{ value: "issues", label: "Issues", count: 20, total: 97 }]}
      />,
    )
    expect(textCalls()).toContainEqual(
      expect.objectContaining({ children: "Issues" }),
    )
    expect(textCalls()).toContainEqual(
      expect.objectContaining({ children: " (20/97)" }),
    )
  })
})

/*
 * A strip that does not fit its width folds every inactive icon tab at once —
 * label gone, `icon count` left — measured against its own width, never a
 * breakpoint. The active tab always keeps its full form, tabs without an icon
 * never fold, and the rule still lands under the active label.
 */
describe("Tabs narrow fold", () => {
  const foldItems = [
    { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
    { value: "bravo", label: "Bravo", count: 3, icon: "▲" },
    { value: "charlie", label: "Charlie", icon: "●" },
  ]
  // Full strip: 12 + 11 + 9 cells with two 2-column gaps = 36.

  it("decides the fold off the measured strip, never a breakpoint", () => {
    expect(shouldFoldTabs(36, 36)).toBe(false)
    expect(shouldFoldTabs(36, 80)).toBe(false)
    expect(shouldFoldTabs(37, 36)).toBe(true)
    expect(shouldFoldTabs(37, undefined)).toBe(false)
  })

  it("keeps every label when the strip fits exactly", () => {
    const frame =
      render(
        <Tabs active="alpha" items={foldItems} width={36} />,
      ).lastFrame() ?? ""
    expect(frame).toContain("◆ Alpha (12)")
    expect(frame).toContain("▲ Bravo (3)")
    expect(frame).toContain("● Charlie")
  })

  it("folds every inactive icon tab at once when one column short", () => {
    // No progressive collapse: one column over folds both inactive tabs, not
    // just enough to fit.
    const frame =
      render(
        <Tabs active="alpha" items={foldItems} width={35} />,
      ).lastFrame() ?? ""
    expect(frame).toBe("◆ Alpha (12)  ▲ 3  ●\n────────────")
  })

  it("never folds the active tab", () => {
    const frame =
      render(
        <Tabs active="bravo" items={foldItems} width={35} />,
      ).lastFrame() ?? ""
    expect(frame).toContain("▲ Bravo (3)")
    expect(frame).toContain("◆ 12")
    expect(frame).not.toContain("Alpha")
  })

  it("never folds a tab without an icon", () => {
    const frame =
      render(<Tabs active="open" items={items} width={5} />).lastFrame() ?? ""
    expect(frame).toContain("Open (3)")
    expect(frame).toContain("Done")
  })

  it("leaves an iconless tab full beside folded neighbours", () => {
    const frame =
      render(
        <Tabs
          active="plain"
          items={[
            { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
            { value: "plain", label: "Plain", count: 3 },
          ]}
          width={22}
        />,
      ).lastFrame() ?? ""
    expect(frame).toContain("◆ 12")
    expect(frame).toContain("Plain (3)")
    expect(frame).not.toContain("Alpha")
  })

  it("drops the count's parentheses when folded, and the pending dash keeps no width", () => {
    const frame =
      render(
        <Tabs
          active="alpha"
          items={[
            { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
            {
              value: "issues",
              label: "Issues",
              count: 20,
              total: 97,
              icon: "◉",
            },
            { value: "fresh", label: "Fresh", count: null, icon: "▲" },
          ]}
          width={10}
        />,
      ).lastFrame() ?? ""
    expect(frame).toContain("◉ 20/97")
    expect(frame).not.toContain("(20/97)")
    expect(frame).toContain("▲ –")
    expect(frame).not.toContain("(–)")
  })

  it("keeps the divider when folded", () => {
    const frame =
      render(
        <Tabs
          active="alpha"
          items={[
            {
              value: "alpha",
              label: "Alpha",
              count: 12,
              icon: "◆",
              group: "one",
            },
            {
              value: "bravo",
              label: "Bravo",
              count: 3,
              icon: "▲",
              group: "two",
            },
          ]}
          width={27}
        />,
      ).lastFrame() ?? ""
    expect(frame).toContain("│")
    expect(frame).toContain("▲ 3")
  })

  it("keeps the rule aligned under the active label after folding", () => {
    const frame =
      render(
        <Tabs active="bravo" items={foldItems} width={35} />,
      ).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("▲")).toBe(rules!.indexOf("─"))
  })
})
