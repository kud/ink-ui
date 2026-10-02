import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Text, useWindowSize } from "ink"
import stringWidth from "string-width"
import { Page } from "./page.js"

describe("Page", () => {
  it("draws the title row, the body and the tail inside a round border", () => {
    const { lastFrame } = render(
      <Page
        icon="🎫"
        title="Jira"
        count={12}
        user="you"
        status={{ text: "updated 2m ago", tone: "quiet" }}
        hints={[["↑↓", "move"]]}
      >
        <Text>body</Text>
      </Page>,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toMatch(/[╭╮╰╯]/)
    expect(frame).toContain("🎫 Jira   12 items  ·  @you  updated 2m ago  ╌╌╌╌")
    expect(frame).toContain("body")
    expect(frame).toMatch(/↑↓ move.*\? help.*q quit/)
    expect(frame).not.toContain("back")
  })

  it("adds ⌫ back before the tail on a nested page", () => {
    const { lastFrame } = render(
      <Page title="Jira" page="nested" hints={[["o", "browser"]]}>
        <Text>x</Text>
      </Page>,
    )
    expect(lastFrame() ?? "").toMatch(/o browser.*⌫ back.*\? help.*q quit/)
  })

  it("drops the tab band entirely when no tabs are given", () => {
    const withTabs = render(
      <Page title="A" tabs={<Text>TABS</Text>}>
        <Text>x</Text>
      </Page>,
    )
    const without = render(
      <Page title="A">
        <Text>x</Text>
      </Page>,
    )
    const lines = (r: typeof without) =>
      (r.lastFrame() ?? "").split("\n").length
    expect(withTabs.lastFrame()).toContain("TABS")
    expect(lines(withTabs) - lines(without)).toBe(2)
  })

  it("keeps the count's width stable and pads in front of the digits", () => {
    const one = render(
      <Page title="A" count={7} user="me">
        <Text>x</Text>
      </Page>,
    )
    const many = render(
      <Page title="A" count={127} user="me">
        <Text>x</Text>
      </Page>,
    )
    expect(one.lastFrame()).toContain("A    7 items  ·  @me")
    expect(many.lastFrame()).toContain("A  127 items  ·  @me")
    expect(
      render(
        <Page title="A" count={1}>
          <Text>x</Text>
        </Page>,
      ).lastFrame(),
    ).toContain("1 item  ·")
  })

  it("draws news bold in the accent and fills the rest with a rule", () => {
    const { lastFrame } = render(
      <Page
        title="Cockpit"
        width={60}
        count={5}
        user="kud"
        status={{ text: "● 2 new · r apply", tone: "news" }}
      >
        <Text>x</Text>
      </Page>,
    )
    const line = (lastFrame() ?? "").split("\n")[1] ?? ""
    expect(line).toContain("● 2 new · r apply  ╌╌╌╌")
    expect(line).toMatch(/╌+ *│$/)
  })

  it("right-aligns the counter above the hints", () => {
    const { lastFrame } = render(
      <Page title="A" width={30} counter="3 of 12" hints={[]}>
        <Text>x</Text>
      </Page>,
    )
    const line =
      (lastFrame() ?? "").split("\n").find((l) => l.includes("3 of 12")) ?? ""
    expect(line).toMatch(/3 of 12 │$/)
  })
  it("stays content-sized by default: as tall as its body, not the terminal", () => {
    const { lastFrame } = render(
      <Page title="A">
        <Text>x</Text>
      </Page>,
    )
    // Border, title row, the blank under it, the body, border.
    expect((lastFrame() ?? "").split("\n")).toHaveLength(5)
  })

  /*
   * `fill` takes the window's size, and the dotted rule is priced off that
   * size, so it still runs to the right border rather than stopping at 80.
   */
  it("fills the terminal with `fill`, and the rule reaches the real edge", () => {
    let size = { columns: 0, rows: 0 }
    const Probe = () => {
      size = useWindowSize()
      return null
    }
    const { lastFrame } = render(
      <>
        <Probe />
        <Page title="A" fill>
          <Text>x</Text>
        </Page>
      </>,
    )
    const lines = (lastFrame() ?? "").split("\n")
    expect(lines).toHaveLength(size.rows)
    expect(stringWidth(lines[0] ?? "")).toBe(size.columns)
    expect(lines[1]).toMatch(/╌ │$/)
    expect(stringWidth(lines[1] ?? "")).toBe(size.columns)
  })

  it("lets an explicit width or height win over `fill`", () => {
    const { lastFrame } = render(
      <Page title="A" fill width={50} height={8}>
        <Text>x</Text>
      </Page>,
    )
    const lines = (lastFrame() ?? "").split("\n")
    expect(lines).toHaveLength(8)
    expect(stringWidth(lines[1] ?? "")).toBe(50)
    expect(lines[1]).toMatch(/╌ │$/)
  })

  /*
   * The filter takes band two's blank rather than adding a row, so opening or
   * closing one never shifts the list under the cursor.
   */
  it("draws a filter in band two without moving the body", () => {
    const bodyRow = (filter?: React.ReactNode) =>
      (
        render(
          <Page title="Jira" filter={filter}>
            <Text>body</Text>
          </Page>,
        ).lastFrame() ?? ""
      )
        .split("\n")
        .findIndex((l) => l.includes("body"))
    const frame =
      render(
        <Page title="Jira" filter={<Text>/ acme</Text>}>
          <Text>body</Text>
        </Page>,
      ).lastFrame() ?? ""
    expect(frame).toContain("/ acme")
    expect(bodyRow(<Text>/ acme</Text>)).toBe(bodyRow())
  })
})
