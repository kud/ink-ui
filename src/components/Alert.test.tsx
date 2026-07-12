import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Alert } from "./Alert.js"

describe("Alert", () => {
  it("renders the title, body, and variant glyph", () => {
    const { lastFrame } = render(
      <Alert variant="error" title="Failed">
        Something went wrong
      </Alert>,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("✗")
    expect(frame).toContain("Failed")
    expect(frame).toContain("Something went wrong")
  })

  it("renders without a title", () => {
    const { lastFrame } = render(<Alert variant="info">Heads up</Alert>)
    expect(lastFrame()).toContain("Heads up")
  })
})
