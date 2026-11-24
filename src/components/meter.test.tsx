import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Meter, meterLevel } from "./meter.js"

describe("meterLevel", () => {
  it("places a value in its zone, thresholds inclusive", () => {
    const t = { warning: 70, critical: 90 }
    expect(meterLevel(10, t)).toBe("normal")
    expect(meterLevel(70, t)).toBe("warning")
    expect(meterLevel(90, t)).toBe("critical")
    expect(meterLevel(99)).toBe("normal")
  })
})

describe("Meter", () => {
  it("draws the bar and the percentage of its scale", () => {
    const { lastFrame } = render(<Meter value={5} max={10} width={8} />)
    expect(lastFrame()).toBe("████████  50%")
  })

  it("carries a glyph, never only a hue, once a threshold is crossed", () => {
    const warn = render(<Meter value={75} width={4} warning={70} critical={90} />)
    const crit = render(<Meter value={95} width={4} warning={70} critical={90} />)
    expect(warn.lastFrame()).toMatch(/ 75% ⚠$/)
    expect(crit.lastFrame()).toMatch(/ 95% ✗$/)
  })

  it("takes a custom reading, or none", () => {
    const units = render(
      <Meter value={42} max={128} width={4} label="Disk" format={(v, _, m) => `${v} / ${m} GB`} />,
    )
    expect(units.lastFrame()).toMatch(/^Disk .{4} 42 \/ 128 GB$/)
    const bare = render(<Meter value={42} width={4} format={false} />)
    expect(bare.lastFrame()).toMatch(/^[█▏▎▍▌▋▊▉]{4}$/)
  })
})
