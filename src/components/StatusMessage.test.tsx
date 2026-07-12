import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { StatusMessage } from "./StatusMessage.js"

describe("StatusMessage", () => {
  it("renders the message with the success glyph", () => {
    const { lastFrame } = render(
      <StatusMessage variant="success">Saved</StatusMessage>,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("✓")
    expect(frame).toContain("Saved")
  })

  it("uses a distinct glyph per variant", () => {
    expect(
      render(<StatusMessage variant="error">x</StatusMessage>).lastFrame(),
    ).toContain("✗")
    expect(
      render(<StatusMessage variant="warning">x</StatusMessage>).lastFrame(),
    ).toContain("⚠")
    expect(
      render(<StatusMessage variant="info">x</StatusMessage>).lastFrame(),
    ).toContain("ℹ")
  })
})
