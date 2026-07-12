import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { Toast } from "./Toast.js"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("Toast", () => {
  it("shows the message with its variant glyph", () => {
    const { lastFrame } = render(
      <Toast message="Saved" variant="success" duration={1000} />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("✓")
    expect(frame).toContain("Saved")
  })

  it("auto-dismisses and calls onDone after the duration", async () => {
    const onDone = vi.fn()
    const { lastFrame } = render(
      <Toast message="Saved" duration={40} onDone={onDone} />,
    )
    expect(lastFrame()).toContain("Saved")
    await delay(90)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(lastFrame()).not.toContain("Saved")
  })
})
