import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { ProgressBar } from "./ProgressBar.js"

// Filled and track share one character now, distinguished only by colour — and
// the test renderer strips colour entirely, so the frame is a run of identical
// blocks. These assertions therefore cover geometry and flatness; that the two
// colours differ is a visual property, checked in the demo gallery.
const blocks = (frame: string): number => (frame.match(/█/g) ?? []).length

describe("ProgressBar", () => {
  it("renders exactly `width` cells regardless of value", () => {
    for (const value of [0, 25, 50, 100]) {
      const { lastFrame } = render(<ProgressBar value={value} width={10} />)
      expect(blocks(lastFrame() ?? "")).toBe(10)
    }
  })

  it("clamps out-of-range values instead of over- or under-drawing", () => {
    const over = render(<ProgressBar value={150} width={8} />)
    const under = render(<ProgressBar value={-20} width={8} />)
    expect(blocks(over.lastFrame() ?? "")).toBe(8)
    expect(blocks(under.lastFrame() ?? "")).toBe(8)
  })

  it("is flat — no shade characters", () => {
    const { lastFrame } = render(<ProgressBar value={40} width={10} />)
    expect(lastFrame() ?? "").not.toMatch(/[░▒▓]/)
  })
})
