import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { SPINNERS, Spinner, spinnerFrame, type SpinnerType } from "./spinner.js"
import { motionAllowed } from "./motion.js"

const TYPES: SpinnerType[] = ["dots", "line", "arc", "pulse", "bounce"]

describe("spinnerFrame", () => {
  it("steps through each style's frames and wraps", () => {
    expect([0, 1, 2, 3, 4].map((f) => spinnerFrame("line", f))).toEqual(["-", "\\", "|", "/", "-"])
    expect(spinnerFrame("arc", 6)).toBe("◜")
    expect(spinnerFrame("pulse", 2)).toBe("●")
    expect(spinnerFrame("bounce", 5)).toBe("⠂")
    expect(spinnerFrame("dots", 23)).toBe(SPINNERS.dots.frames[3])
  })

  it("returns the still frame when there is no clock", () => {
    expect(spinnerFrame("dots")).toBe("⠋")
    expect(spinnerFrame("pulse")).toBe("●")
  })

  it("keeps every style one cell wide", () => {
    for (const type of TYPES)
      for (const glyph of SPINNERS[type].frames) expect([...glyph]).toHaveLength(1)
  })
})

describe("motionAllowed", () => {
  it("needs a TTY, the caller's consent and no opt-out", () => {
    expect(motionAllowed(true, true, {})).toBe(true)
    expect(motionAllowed(true, false, {})).toBe(false)
    expect(motionAllowed(false, true, {})).toBe(false)
    expect(motionAllowed(true, true, { NO_MOTION: "1" })).toBe(false)
    expect(motionAllowed(true, true, { REDUCE_MOTION: "1" })).toBe(false)
  })
})

describe("Spinner", () => {
  it("holds its still frame when output is not a TTY", async () => {
    const { lastFrame } = render(<Spinner type="arc" label="Working…" />)
    await new Promise((r) => setTimeout(r, 250))
    expect(lastFrame()).toBe("◜ Working…")
  })

  it("defaults to dots", () => {
    const { lastFrame } = render(<Spinner />)
    expect(lastFrame()).toBe("⠋")
  })
})
