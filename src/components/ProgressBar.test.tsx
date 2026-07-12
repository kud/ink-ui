import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { ProgressBar } from "./ProgressBar.js"

describe("ProgressBar", () => {
  it("fills proportionally to the value", () => {
    const { lastFrame } = render(<ProgressBar value={50} width={10} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("█".repeat(5))
    expect(frame).toContain("░".repeat(5))
  })

  it("clamps values above 100 to full", () => {
    const { lastFrame } = render(<ProgressBar value={150} width={8} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("█".repeat(8))
    expect(frame).not.toContain("░")
  })

  it("clamps values below 0 to empty", () => {
    const { lastFrame } = render(<ProgressBar value={-20} width={8} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("░".repeat(8))
    expect(frame).not.toContain("█")
  })
})
