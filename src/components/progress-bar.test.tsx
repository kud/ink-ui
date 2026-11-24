import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import {
  ProgressBar,
  barCells,
  formatEta,
  indeterminateOffset,
} from "./progress-bar.js"

// Filled and track share one character, distinguished only by colour — and
// the test renderer strips colour entirely. These assertions therefore cover
// geometry and flatness; that the two colours differ is a visual property,
// checked in the demo gallery.
const cells = (frame: string): number =>
  (frame.match(/[█▏▎▍▌▋▊▉]/g) ?? []).length

describe("barCells", () => {
  it("resolves the edge to eighths of a cell", () => {
    expect(barCells(0.5, 10)).toEqual({ full: 5, partial: 0, empty: 5 })
    // 0.25 × 10 cells = 2.5 cells = 2 full + 4/8.
    expect(barCells(0.25, 10)).toEqual({ full: 2, partial: 4, empty: 7 })
    // 1/80 of a 10-cell bar is exactly one eighth.
    expect(barCells(1 / 80, 10)).toEqual({ full: 0, partial: 1, empty: 9 })
    // 0.33 × 20 × 8 = 52.8 → 53 eighths = 6 full + 5/8.
    expect(barCells(0.33, 20)).toEqual({ full: 6, partial: 5, empty: 13 })
  })

  it("always adds up to the width and clamps out-of-range input", () => {
    for (const f of [-1, 0, 0.001, 0.37, 0.999, 1, 2, Number.NaN]) {
      const { full, partial, empty } = barCells(f, 13)
      expect(full + (partial ? 1 : 0) + empty).toBe(13)
    }
    expect(barCells(2, 4)).toEqual({ full: 4, partial: 0, empty: 0 })
    expect(barCells(-1, 4)).toEqual({ full: 0, partial: 0, empty: 4 })
  })
})

describe("indeterminateOffset", () => {
  it("walks to the end and back", () => {
    const at = [0, 1, 2, 3, 4, 5, 6].map((f) => indeterminateOffset(5, 2, f))
    expect(at).toEqual([0, 1, 2, 3, 2, 1, 0])
  })

  it("rests in the middle when frozen", () => {
    expect(indeterminateOffset(20, 5)).toBe(7)
  })
})

describe("formatEta", () => {
  it("formats seconds, minutes and hours", () => {
    expect(formatEta(42)).toBe("42s")
    expect(formatEta(185)).toBe("3m 05s")
    expect(formatEta(3720)).toBe("1h 02m")
    expect(formatEta(-1)).toBe("")
  })
})

describe("ProgressBar", () => {
  it("renders exactly `width` cells regardless of value", () => {
    for (const value of [0, 25, 33, 50, 100]) {
      const { lastFrame } = render(<ProgressBar value={value} width={10} />)
      expect(cells(lastFrame() ?? "")).toBe(10)
    }
  })

  it("draws the partial edge glyph", () => {
    const { lastFrame } = render(<ProgressBar value={25} width={10} />)
    expect(lastFrame()).toBe("██▌███████")
  })

  it("clamps out-of-range values instead of over- or under-drawing", () => {
    const over = render(<ProgressBar value={150} width={8} />)
    const under = render(<ProgressBar value={-20} width={8} />)
    expect(cells(over.lastFrame() ?? "")).toBe(8)
    expect(cells(under.lastFrame() ?? "")).toBe(8)
  })

  it("is flat — no shade characters", () => {
    const { lastFrame } = render(<ProgressBar value={40} width={10} />)
    expect(lastFrame() ?? "").not.toMatch(/[░▒▓]/)
  })

  it("adds a label, the percentage and an ETA around the bar", () => {
    const { lastFrame } = render(
      <ProgressBar value={42} width={10} label="Uploading" showValue eta={185} />,
    )
    expect(lastFrame()).toMatch(/^Uploading [█▏▎▍▌▋▊▉]{10}  42% eta 3m 05s$/)
  })

  it("draws a still indeterminate band when output is not a TTY", () => {
    const { lastFrame } = render(<ProgressBar indeterminate width={12} showValue />)
    expect(cells(lastFrame() ?? "")).toBe(12)
    expect(lastFrame()).not.toMatch(/%/)
  })
})
