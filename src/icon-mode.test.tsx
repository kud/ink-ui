import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, afterEach } from "vitest"
import { glyphs } from "@kud/glyphs"
import { StatusMessage } from "./components/StatusMessage.js"
import { setIconMode, getIconMode } from "./icon-mode.js"

afterEach(() => setIconMode("text"))

describe("icon mode", () => {
  it("defaults to text (unicode) glyphs", () => {
    expect(getIconMode()).toBe("text")
    const { lastFrame } = render(
      <StatusMessage variant="success">ok</StatusMessage>,
    )
    expect(lastFrame()).toContain("✓")
  })

  it("swaps in Nerd glyphs when set to nerd mode", () => {
    setIconMode("nerd")
    const { lastFrame } = render(
      <StatusMessage variant="success">ok</StatusMessage>,
    )
    expect(lastFrame()).toContain(glyphs.check)
    expect(lastFrame()).not.toContain("✓")
  })
})
