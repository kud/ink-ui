import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, afterEach } from "vitest"
import { glyphs } from "@kud/glyphs"
import { Pill, pillWidth } from "./Pill.js"

const frameOf = (node: React.ReactElement) => render(node).lastFrame() ?? ""

describe("Pill", () => {
  afterEach(() => {
    delete process.env["NO_COLOR"]
  })

  it("renders its label between powerline caps", () => {
    const frame = frameOf(<Pill>epic</Pill>)
    expect(frame).toContain("epic")
    expect(frame).toContain(glyphs.plCapLeft)
    expect(frame).toContain(glyphs.plCapRight)
  })

  // The word is the signal and the colour only reinforces it, so the label has
  // to survive a reader who cannot see the hue — or a pipe that strips it.
  it("keeps the label legible with no colour at all", () => {
    process.env["NO_COLOR"] = "1"
    expect(frameOf(<Pill variant="error">blocked</Pill>)).toContain("blocked")
  })

  // Without the fill the caps are drawing the outline of a pill that is not
  // there, so the bracket form is the honest shape rather than a lesser one.
  it("falls back to brackets when colour is off", () => {
    process.env["NO_COLOR"] = "1"
    const frame = frameOf(<Pill>epic</Pill>)
    expect(frame).toContain("[epic]")
    expect(frame).not.toContain(glyphs.plCapLeft)
  })

  it("takes every variant without falling back", () => {
    for (const variant of [
      "success",
      "error",
      "warning",
      "info",
      "accent",
      "muted",
    ] as const)
      expect(frameOf(<Pill variant={variant}>x</Pill>)).toContain(
        glyphs.plCapLeft,
      )
  })
})

describe("pillWidth", () => {
  // A caller budgeting for the label alone overflows by exactly the two caps,
  // and in a frame sized to the terminal that scrolls the panel rather than
  // clipping the row.
  it("charges for the caps as well as the label", () => {
    expect(pillWidth("epic")).toBe(6)
  })

  it("agrees with what the component actually draws", () => {
    const drawn = frameOf(<Pill>epic</Pill>).split("\n")[0] ?? ""
    expect([...drawn].length).toBe(pillWidth("epic"))
  })
})
