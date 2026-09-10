import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, afterEach } from "vitest"
import { glyph } from "@kud/glyphs"
import { Pill, pillWidth, inkFor } from "./Pill.js"
import { softColors } from "../tokens.js"

const frameOf = (node: React.ReactElement) => render(node).lastFrame() ?? ""

describe("Pill", () => {
  afterEach(() => {
    delete process.env["NO_COLOR"]
  })

  it("renders its label between powerline caps", () => {
    const frame = frameOf(<Pill>epic</Pill>)
    expect(frame).toContain("epic")
    expect(frame).toContain(glyph("plCapLeft"))
    expect(frame).toContain(glyph("plCapRight"))
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
    expect(frame).not.toContain(glyph("plCapLeft"))
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

  // A classification carries the hue and nothing else: no fill means no ink to
  // pick, and no chance of a row of type pills reading as a row of events.
  it("draws an outline with no background", () => {
    const frame = frameOf(
      <Pill tone="outline" variant="accent">
        epic
      </Pill>,
    )
    expect(frame).toContain(glyph("plCapLeftThin") + "epic" + glyph("plCapRightThin"))
    expect(frame).not.toContain(glyph("plCapLeft"))
  })

  // The thin caps ARE the outline, so stripping colour leaves them exactly as
  // they were — the bracket fallback exists for a fill that is not there, and
  // an outline never had one.
  it("keeps its thin caps when colour is off", () => {
    process.env["NO_COLOR"] = "1"
    const frame = frameOf(<Pill tone="outline">task</Pill>)
    expect(frame).toContain(glyph("plCapLeftThin"))
    expect(frame).not.toContain("[task]")
  })

  // A classification lives on every row, so its fill is the measured quiet
  // one and the ink is whatever reads on it — white on all seven, by the same
  // measure the escape hatch uses, not a second hand-written table.
  it("fills a soft pill from softColors and inks it white", () => {
    const frame = frameOf(
      <Pill tone="soft" variant="group">
        epic
      </Pill>,
    )
    expect(frame).toContain(glyph("plCapLeft") + "epic" + glyph("plCapRight"))
    for (const fill of Object.values(softColors)) expect(inkFor(fill)).toBe("white")
  })

  it("renders soft in monochrome as brackets, like solid", () => {
    process.env["NO_COLOR"] = "1"
    expect(frameOf(<Pill tone="soft" variant="info">task</Pill>)).toContain("[task]")
  })

  // The container of the rows beneath it is a kind of its own, and a kind
  // that exists in one tone and not another is a hole a caller falls into.
  it("takes group in every tone", () => {
    for (const tone of ["solid", "soft", "outline"] as const)
      expect(
        frameOf(
          <Pill tone={tone} variant="group">
            epic
          </Pill>,
        ),
      ).toContain("epic")
  })

  // Nothing already rendered moves: every existing pill is an event pill.
  it("stays solid by default", () => {
    const frame = frameOf(<Pill>NEW</Pill>)
    expect(frame).toContain(glyph("plCapLeft"))
    expect(frame).not.toContain(glyph("plCapLeftThin"))
  })

  it("prices an outline the same as a solid", () => {
    const drawn = frameOf(<Pill tone="outline">epic</Pill>).split("\n")[0] ?? ""
    expect([...drawn].length).toBe(pillWidth("epic"))
  })

  it("takes every variant without falling back", () => {
    for (const variant of [
      "success",
      "error",
      "warning",
      "info",
      "accent",
      "muted",
      "group",
    ] as const)
      expect(frameOf(<Pill variant={variant}>x</Pill>)).toContain(
        glyph("plCapLeft"),
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
