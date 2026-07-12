import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Tabs } from "./Tabs.js"

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
