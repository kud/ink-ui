import React from "react"
import { Box } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { FooterHints, type Hint } from "./FooterHints.js"

const hints: Hint[] = [
  ["↑↓", "nav"],
  ["↵", "open"],
  ["r", "refresh"],
  ["q", "quit"],
]

describe("FooterHints", () => {
  it("renders each key with its label", () => {
    const { lastFrame } = render(<FooterHints hints={hints} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("↑↓ nav")
    expect(frame).toContain("q quit")
  })

  it("lays hints out on one row when they fit", () => {
    const { lastFrame } = render(<FooterHints hints={hints} />)
    const lines = (lastFrame() ?? "").split("\n").filter((l) => l.trim())
    expect(lines).toHaveLength(1)
  })

  it("wraps without inserting blank rows between hint lines", () => {
    // Regression: the component used `gap={2}`, which sets *both* axes — so once
    // the hints wrapped, the horizontal spacing became 2 blank rows of vertical
    // spacing too, shoving whatever sat below the footer out of place.
    const { lastFrame } = render(
      <Box width={20}>
        <FooterHints hints={hints} />
      </Box>,
    )
    const lines = (lastFrame() ?? "").split("\n")
    // It must wrap at this width — otherwise the test isn't exercising anything.
    expect(lines.length).toBeGreaterThan(1)
    // No blank line may sit between the first and last non-empty rows.
    const firstContent = lines.findIndex((l) => l.trim())
    const lastContent =
      lines.length - 1 - [...lines].reverse().findIndex((l) => l.trim())
    const between = lines.slice(firstContent, lastContent + 1)
    expect(between.every((l) => l.trim())).toBe(true)
  })
})
