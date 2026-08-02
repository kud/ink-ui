import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { Toast } from "./Toast.js"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("Toast", () => {
  // The unmount is load-bearing, not tidiness. `render` leaves a live Ink
  // instance behind, and this one holds a 1000ms timer that outlives the test.
  // Left mounted, its render loop starves the NEXT test's frame updates: the
  // dismissal test saw `onDone` fire but `lastFrame()` never advanced past the
  // pre-dismissal output, so it failed against a Toast that had dismissed
  // correctly. That test passes alone and fails in file order — always unmount.
  it("shows the message with its variant glyph", () => {
    const { lastFrame, unmount } = render(
      <Toast message="Saved" variant="success" duration={1000} />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("✓")
    expect(frame).toContain("Saved")
    unmount()
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
