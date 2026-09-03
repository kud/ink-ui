import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, afterEach } from "vitest"
import { glyphs } from "@kud/glyphs"
import { Pill, pillWidth, inkFor } from "./Pill.js"

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

  // The escape hatch exists for a caller mirroring an external palette, so the
  // fill it asks for has to be the fill it gets — a variant quietly winning
  // would repaint GitHub's merged purple as a theme colour.
  it("takes an explicit fill over the variant", () => {
    process.env["NO_COLOR"] = "1"
    const frame = frameOf(
      <Pill variant="success" color="#A371F7">
        MERGED
      </Pill>,
    )
    expect(frame).toContain("[MERGED]")
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

// A caller passing a fill cannot also be asked to pass a legible ink for it: the
// pairing is measurable, and getting it wrong renders the word invisible — which
// for a component whose whole contract is "the word carries the meaning" is the
// one failure that must not be reachable from outside. Asserted here rather than
// through a rendered frame, which carries no escape codes under the test runner.
describe("inkFor", () => {
  it.each(["#3FB950", "#8B949E", "#FF8700", "#A371F7"])(
    "inks the light fill %s black",
    (fill) => {
      expect(inkFor(fill)).toBe("black")
    },
  )

  it.each(["#1F2328", "#0D1117", "#000000"])(
    "inks the dark fill %s white",
    (fill) => {
      expect(inkFor(fill)).toBe("white")
    },
  )

  // A named ANSI colour has no luminance to measure — the value is whatever the
  // user's theme says — so it takes the ink that reads against a dark terminal
  // rather than a guess dressed up as a calculation. Same for anything that is
  // not a six-digit hex at all.
  it.each(["magenta", "#fff", "rgb(1,2,3)", ""])(
    "inks the unmeasurable %s white",
    (fill) => {
      expect(inkFor(fill)).toBe("white")
    },
  )
})
