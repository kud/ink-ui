import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Toggle } from "./Toggle.js"

describe("Toggle", () => {
  it("shows a filled dot when on", () => {
    const { lastFrame } = render(<Toggle label="work" on={true} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("work ●")
    expect(frame).not.toContain("○")
  })

  it("shows a hollow dot when off", () => {
    const { lastFrame } = render(<Toggle label="work" on={false} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("work ○")
    expect(frame).not.toContain("●")
  })
})
