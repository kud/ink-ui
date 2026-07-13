import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Switch } from "./Switch.js"

describe("Switch", () => {
  it("puts the filled dot on the left when left is active", () => {
    const { lastFrame } = render(
      <Switch left="work" right="home" value="left" />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("work")
    expect(frame).toContain("home")
    expect(frame).toContain("●─○")
  })

  it("puts the filled dot on the right when right is active", () => {
    const { lastFrame } = render(
      <Switch left="work" right="home" value="right" />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("○─●")
  })
})
