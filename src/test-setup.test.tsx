import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { Toast } from "./components/Toast.js"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Guards the global `afterEach(cleanup)` in test-setup.ts. The first test leaves a
// Toast mounted with a 40ms timer and deliberately never unmounts it; Toast clears
// that timer when it unmounts, so `onDone` can only fire if the instance survived
// the test that created it. The second test is the assertion, and fails without the
// global cleanup. The pair only means anything in this order — do not reorder, and
// do not unmount in the first.
describe("cleanup between tests", () => {
  const onDone = vi.fn()

  it("leaves a timer-driven component mounted", () => {
    const { lastFrame } = render(
      <Toast message="Lingering" duration={40} onDone={onDone} />,
    )
    expect(lastFrame()).toContain("Lingering")
    expect(onDone).not.toHaveBeenCalled()
  })

  it("unmounted the previous test's component before its timer could fire", async () => {
    await delay(90)
    expect(onDone).not.toHaveBeenCalled()
  })
})
