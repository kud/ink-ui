import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Text } from "ink"
import { Page } from "./Page.js"

describe("Page", () => {
  it("draws the title row, the body and the tail inside a round border", () => {
    const { lastFrame } = render(
      <Page icon="🎫" title="Jira" facts="12 items · @you" hints={[["↑↓", "move"]]}>
        <Text>body</Text>
      </Page>,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toMatch(/[╭╮╰╯]/)
    expect(frame).toContain("🎫 Jira   12 items · @you")
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
    const lines = (r: typeof without) => (r.lastFrame() ?? "").split("\n").length
    expect(withTabs.lastFrame()).toContain("TABS")
    expect(lines(withTabs) - lines(without)).toBe(2)
  })

  it("right-aligns the counter above the hints", () => {
    const { lastFrame } = render(
      <Page title="A" width={30} counter="3 of 12" hints={[]}>
        <Text>x</Text>
      </Page>,
    )
    const line = (lastFrame() ?? "").split("\n").find((l) => l.includes("3 of 12")) ?? ""
    expect(line).toMatch(/3 of 12 │$/)
  })
})
