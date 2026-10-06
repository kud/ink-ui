import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import stringWidth from "string-width"
import { glyph } from "@kud/glyphs"
import {
  Tabs,
  shouldFoldTabs,
  tabLabelStyle,
  tabCountStyle,
  tabCountChipFill,
} from "./tabs.js"
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

afterEach(() => {
  delete process.env["NO_COLOR"]
})

const items = [
  { value: "open", label: "Open", count: 3 },
  { value: "done", label: "Done" },
]

const CAP_L = glyph("plCapLeft")
const CAP_R = glyph("plCapRight")
const chip = (content: string) => `${CAP_L}${content}${CAP_R}`

describe("Tabs", () => {
  it("renders every tab label", () => {
    const { lastFrame } = render(<Tabs active="open" items={items} />)
    expect(lastFrame()).toContain("Open")
    expect(lastFrame()).toContain("Done")
  })

  it("draws the count as a chip, not parentheses", () => {
    const { lastFrame } = render(<Tabs active="open" items={items} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain(`Open ${chip("3")}`)
    expect(frame).not.toContain("(")
    expect(frame).not.toContain(")")
  })

  /*
   * Two caps stand in for two parens, so a tab prices exactly as before: label
   * plus one space plus two caps plus digits. A bar that moves when the chip
   * lands is a bar you have to re-find.
   */
  it("keeps the strip width-neutral: two caps replace two parens", () => {
    const frame =
      render(
        <Tabs
          active="open"
          items={[{ value: "open", label: "Open", count: 3 }]}
        />,
      ).lastFrame() ?? ""
    expect(frame).toBe(`Open ${chip("3")}\n────`)
    expect(stringWidth(`Open ${chip("3")}`)).toBe("Open (3)".length)
    expect(stringWidth(`Issues ${chip("20/97")}`)).toBe(
      "Issues (20/97)".length,
    )
  })

  /*
   * One number means the tab is whole; two mean you are looking at a sample.
   * The rule has to hold in BOTH directions or it teaches nothing — a reader who
   * sees a slash on some tabs and a bare count on others cannot tell whether the
   * bare one means "complete" or "nobody passed a total".
   */
  it("draws a fraction in one chip when the count is a window onto something larger", () => {
    const { lastFrame } = render(
      <Tabs
        active="issues"
        items={[{ value: "issues", label: "Issues", count: 20, total: 97 }]}
      />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain(`Issues ${chip("20/97")}`)
    expect(frame).not.toContain("(")
    const runs = textCalls()
    expect(
      runs.filter(
        (p) => typeof p.children === "string" && p.children.includes("/"),
      ),
    ).toHaveLength(1)
  })

  it("keeps a bare count when nothing is hidden", () => {
    const { lastFrame } = render(
      <Tabs
        active="mine"
        items={[{ value: "mine", label: "Mine", count: 8 }]}
      />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain(`Mine ${chip("8")}`)
    expect(frame).not.toContain("/")
  })

  it("stops the underline under the label, never under the chip", () => {
    // The chip says how much the tab holds — a second answer — so the rule
    // ends under the label. A notation change the width maths did not hear
    // about surfaces here as a long underline.
    const { lastFrame } = render(
      <Tabs
        active="issues"
        items={[{ value: "issues", label: "Issues", count: 20, total: 97 }]}
      />,
    )
    const frame = lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(rules).toBe("─".repeat("Issues".length))
    expect(labels!.indexOf("Issues")).toBe(rules!.indexOf("─"))
  })

  it("underlines the active label only", () => {
    const { lastFrame } = render(<Tabs active="open" items={items} />)
    // The active label "Open" is 4 chars; the chip beside it is not underlined.
    const [labels, rules] = (lastFrame() ?? "").split("\n")
    expect(rules).toBe("─".repeat("Open".length))
    expect(labels!.indexOf("Open")).toBe(rules!.indexOf("─"))
  })

  it("underlines only the active tab, not the others", () => {
    // With "Done" (4 chars) active, the only underline run is 4 dashes; the
    // absence of any other run proves "Open" plus its chip is not underlined.
    const { lastFrame } = render(<Tabs active="done" items={items} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("─".repeat("Done".length))
    expect(frame).not.toContain("─".repeat("Open".length + 1))
  })

  it("keeps later tabs lined up past the active chip", () => {
    // `x` advances past the whole cell — label, chip, gap — so the second tab
    // sits exactly where it would beside a chipless first.
    const lineOf = (frame: string) =>
      frame.split("\n").find((l) => l.includes("Done")) ?? ""
    const withChip = lineOf(
      render(<Tabs active="open" items={items} />).lastFrame() ?? "",
    )
    const withoutChip = lineOf(
      render(
        <Tabs
          active="open"
          items={[
            { value: "open", label: "Open" },
            { value: "done", label: "Done" },
          ]}
        />,
      ).lastFrame() ?? "",
    )
    expect(withChip.indexOf("Done")).toBe(
      withoutChip.indexOf("Done") + stringWidth(` ${chip("3")}`),
    )
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
    expect(frame).toContain(`● Open ${chip("3")}`)
  })

  // The rule goes under the LABEL, and the marker sits in a gutter outside it.
  // A rule spanning both reaches past the word on the left and stops flush on the
  // right, which reads as lopsided rather than as generous — and the two answer
  // different questions, so a rule that swallows the marker claims the marker as
  // part of its own answer.
  it("underlines the label and neither the marker nor the chip", () => {
    const frame =
      render(<Tabs active="open" items={marked} />).lastFrame() ?? ""
    const [labels, rules] = frame.split("\n")
    expect(rules!.trim()).toBe("─".repeat("Open".length))
    expect(labels!.indexOf("Open")).toBe(rules!.indexOf("─"))
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
    expect(frame.split("\n")[1]).toBe("─".repeat("Open".length))
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
   * The chip holds it padded to a two-digit count's width so the next tab does
   * not move when the numbers land — and exactly one space sits between the
   * label and the chip.
   */
  it("draws an unknown count as a padded dash chip one space off the label", () => {
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
    expect(row(null)).toContain(`Open ${chip(" –")}`)
    expect(row(null)).not.toContain("Open  ")
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
    expect(frame).toContain(`QA ${chip("22")}`)
    expect(frame).toContain(`Off board ${chip("4")}`)
    expect(frame).toContain(`My PRs ${chip("3")}`)
  })

  it("draws the divider with exactly GAP spaces on each side (via Box gap)", () => {
    const frame = render(<Tabs active="qa" items={grouped} />).lastFrame() ?? ""
    // First line: "QA <chip>  Off board <chip>  │  My PRs <chip>"
    const firstLine = frame.split("\n")[0] ?? ""
    expect(firstLine).toContain(
      `QA ${chip("22")}  Off board ${chip("4")}  │  My PRs ${chip("3")}`,
    )
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
      { value: "d", label: "Delta", group: "two" },
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
    // "My PRs" label should align with its underline, chip or no chip.
    expect(labels!.indexOf("My PRs")).toBe(rules!.indexOf("─"))
    expect(rules!.trim()).toBe("─".repeat("My PRs".length))
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
 * beside an icon still moves nothing. The chip stays outside the rule.
 */
describe("Tabs icons", () => {
  const iconItems = [
    { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
    { value: "bravo", label: "Bravo", count: 3, icon: "▲" },
    { value: "charlie", label: "Charlie", icon: "●" },
  ]

  it("leaves no-icon output byte-identical, underline row included", () => {
    expect(render(<Tabs active="open" items={items} />).lastFrame()).toBe(
      `Open ${chip("3")}  Done\n────`,
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
    ).toBe(`● Open ${chip("3")}    Done\n  ────`)
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
    expect(frame).toContain(`● ◆ Alpha ${chip("12")}`)
  })

  it("draws the icon one space before the label when there is no marker", () => {
    const frame =
      render(
        <Tabs active="alpha" items={iconItems} width={80} />,
      ).lastFrame() ?? ""
    expect(frame).toContain(`◆ Alpha ${chip("12")}`)
    expect(frame).toContain(`▲ Bravo ${chip("3")}`)
    expect(frame).toContain("● Charlie")
  })

  it("spans the active underline across icon, space and label — not the chip", () => {
    const frame =
      render(
        <Tabs active="alpha" items={iconItems} width={80} />,
      ).lastFrame() ?? ""
    // The whole first line, so a gutter leak or a long rule fails here, not
    // three tests away.
    expect(frame).toBe(
      `◆ Alpha ${chip("12")}  ▲ Bravo ${chip("3")}  ● Charlie\n` +
        "─".repeat(stringWidth("◆ Alpha")),
    )
    const [labels, rules] = frame.split("\n")
    expect(labels!.indexOf("◆")).toBe(rules!.indexOf("─"))
  })

  it("underlines only the active icon tab", () => {
    const frame =
      render(
        <Tabs active="bravo" items={iconItems} width={80} />,
      ).lastFrame() ?? ""
    expect(frame.split("\n")[1]!.trim()).toBe(
      "─".repeat(stringWidth("▲ Bravo")),
    )
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
 * The count sits in its own chip so it can be darker than the label: bold on a
 * muted orange fill on the active tab, its own grey beside an inactive one, and
 * never dimmed into the furniture. Colour is unobservable through the frame, so
 * the mapping is asserted here instead, as `Pill` does with its ink picker —
 * and the split itself on the `Text` props the probe records, since the frame
 * reads the runs as one string by design.
 */
describe("Tabs count chip", () => {
  it("inks the number on its chip fill, never dimmed", () => {
    expect(tabCountStyle(true)).toEqual({
      bold: true,
      color: "#E0913A",
      backgroundColor: "#5A3816",
    })
    expect(tabCountStyle(false)).toEqual({
      bold: false,
      color: "#7A7B85",
      backgroundColor: "#262735",
    })
    expect("dimColor" in tabCountStyle(true)).toBe(false)
    expect("dimColor" in tabCountStyle(false)).toBe(false)
  })

  it("fills the chip per state", () => {
    expect(tabCountChipFill(true)).toBe("#5A3816")
    expect(tabCountChipFill(false)).toBe("#262735")
  })

  it("renders the chip as caps around the number run", () => {
    const frame =
      render(<Tabs active="open" items={items} />).lastFrame() ?? ""
    expect(frame).toBe(`Open ${chip("3")}  Done\n────`)
    const runs = textCalls()
    expect(
      runs.filter(
        (p) => typeof p.children === "string" && p.children.includes("Open"),
      ),
    ).toHaveLength(1)
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: "Open",
        bold: true,
        color: colors.accent,
        dimColor: false,
      }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({ children: CAP_L, color: "#5A3816" }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: "3",
        bold: true,
        color: "#E0913A",
        backgroundColor: "#5A3816",
      }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({ children: CAP_R, color: "#5A3816" }),
    )
    expect(
      runs.filter(
        (p) => p.color === "#5A3816" && p.children === "",
      ),
    ).toHaveLength(0)
  })

  it("gives an inactive chip its own fill with no dim", () => {
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
        children: "3",
        bold: false,
        color: "#7A7B85",
        backgroundColor: "#262735",
      }),
    )
    expect(
      runs
        .filter((p) => p.children === "3")
        .every((p) => !("dimColor" in p)),
    ).toBe(true)
  })

  it("keeps the folded chip in the chip runs", () => {
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
    expect(frame).toBe(`◆ Alpha ${chip("12")}  ▲ ${chip("3")}  ●\n───────`)
    const runs = textCalls()
    expect(
      runs.filter(
        (p) =>
          typeof p.children === "string" && p.children.includes("Bravo"),
      ),
    ).toHaveLength(0)
    expect(runs).toContainEqual(
      expect.objectContaining({ children: "◆ Alpha" }),
    )
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: "12",
        color: "#E0913A",
        backgroundColor: "#5A3816",
      }),
    )
    expect(runs).toContainEqual(expect.objectContaining({ children: "▲" }))
    expect(runs).toContainEqual(
      expect.objectContaining({
        children: "3",
        color: "#7A7B85",
        backgroundColor: "#262735",
      }),
    )
  })

  it("keeps the pending dash and the fraction inside the chip runs", () => {
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
    expect(pending.split("\n")[0]).toContain(`Open ${chip(" –")}`)
    expect(textCalls()).toContainEqual(
      expect.objectContaining({ children: " –" }),
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
      expect.objectContaining({ children: "20/97" }),
    )
  })
})

describe("Tabs NO_COLOR", () => {
  // Like `Pill`: with the fill stripped the caps would be drawing the outline
  // of a chip that is not there, so the parenthesised form is the honest shape
  // rather than a lesser one. Read at render time, never module load, so a test
  // can toggle it per render.
  it("falls back to (n) with no caps", () => {
    process.env["NO_COLOR"] = "1"
    const frame =
      render(<Tabs active="open" items={items} />).lastFrame() ?? ""
    expect(frame).toContain("Open (3)")
    expect(frame).not.toContain(CAP_L)
    expect(frame).not.toContain(CAP_R)
  })

  it("falls back to (n/total) with no caps", () => {
    process.env["NO_COLOR"] = "1"
    const frame =
      render(
        <Tabs
          active="issues"
          items={[{ value: "issues", label: "Issues", count: 20, total: 97 }]}
        />,
      ).lastFrame() ?? ""
    expect(frame).toContain("Issues (20/97)")
    expect(frame).not.toContain(CAP_L)
  })

  it("falls back to (–) with no caps, one space off the label", () => {
    process.env["NO_COLOR"] = "1"
    const frame =
      render(
        <Tabs
          active="open"
          items={[
            { value: "open", label: "Open", count: null },
            { value: "done", label: "Done" },
          ]}
        />,
      ).lastFrame() ?? ""
    expect(frame).toContain("Open (–)")
    expect(frame).not.toContain("Open  ")
    expect(frame).not.toContain(CAP_L)
  })

  it("measures the fallback form, so the fold decision agrees with it", () => {
    process.env["NO_COLOR"] = "1"
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
    expect(frame).toBe("◆ Alpha (12)  ▲ 3  ●\n───────")
  })
})

/*
 * A strip that does not fit its width folds every inactive icon tab at once —
 * label gone, `icon` plus its chip left — measured against its own width, never
 * a breakpoint. The active tab always keeps its full form, tabs without an icon
 * never fold, and the rule still lands under the active label.
 */
describe("Tabs narrow fold", () => {
  const foldItems = [
    { value: "alpha", label: "Alpha", count: 12, icon: "◆" },
    { value: "bravo", label: "Bravo", count: 3, icon: "▲" },
    { value: "charlie", label: "Charlie", icon: "●" },
  ]
  // Full strip: 12 + 11 + 9 cells with two 2-column gaps = 36 — two caps for
  // two parens, so the full form prices exactly as before.

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
    expect(frame).toContain(`◆ Alpha ${chip("12")}`)
    expect(frame).toContain(`▲ Bravo ${chip("3")}`)
    expect(frame).toContain("● Charlie")
  })

  it("folds every inactive icon tab at once when one column short", () => {
    // No progressive collapse: one column over folds both inactive tabs, not
    // just enough to fit.
    const frame =
      render(
        <Tabs active="alpha" items={foldItems} width={35} />,
      ).lastFrame() ?? ""
    expect(frame).toBe(`◆ Alpha ${chip("12")}  ▲ ${chip("3")}  ●\n───────`)
  })

  it("never folds the active tab", () => {
    const frame =
      render(
        <Tabs active="bravo" items={foldItems} width={35} />,
      ).lastFrame() ?? ""
    expect(frame).toContain(`▲ Bravo ${chip("3")}`)
    expect(frame).toContain(`◆ ${chip("12")}`)
    expect(frame).not.toContain("Alpha")
  })

  it("never folds a tab without an icon", () => {
    const frame =
      render(<Tabs active="open" items={items} width={5} />).lastFrame() ?? ""
    expect(frame).toContain(`Open ${chip("3")}`)
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
    expect(frame).toContain(`◆ ${chip("12")}`)
    expect(frame).toContain(`Plain ${chip("3")}`)
    expect(frame).not.toContain("Alpha")
  })

  it("keeps the chip folded, one space off the icon", () => {
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
    expect(frame).toContain(`◉ ${chip("20/97")}`)
    expect(frame).not.toContain("(20/97)")
    expect(frame).toContain(`▲ ${chip(" –")}`)
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
    expect(frame).toContain(`▲ ${chip("3")}`)
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
