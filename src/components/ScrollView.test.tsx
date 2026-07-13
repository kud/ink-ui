import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { ScrollView } from "./ScrollView.js"

const DOWN = String.fromCharCode(27) + "[B" // down arrow escape sequence
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))
const lines = ["L1", "L2", "L3", "L4", "L5"].map((text) => ({ text }))

describe("ScrollView", () => {
  it("scrolls on arrow keys when active", async () => {
    const { stdin, lastFrame } = render(<ScrollView lines={lines} />)
    expect(lastFrame()).toContain("L1")
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("L2")
  })

  it("ignores scroll keys when isActive is false", async () => {
    const { stdin, lastFrame } = render(
      <ScrollView lines={lines} isActive={false} />,
    )
    expect(lastFrame()).toContain("L1")
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("L1")
    expect(lastFrame()).not.toContain("L2")
  })
})
