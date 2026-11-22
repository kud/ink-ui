import React from "react"
import { readFileSync } from "node:fs"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Help } from "./help.js"
import { renderHelp } from "./render-help.js"
import type { HelpSpec } from "./help-layout.js"

const deploy = JSON.parse(
  readFileSync(new URL("./help.golden/deploy.json", import.meta.url), "utf8"),
) as HelpSpec

const trimLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")

describe("Help", () => {
  // The component and the string renderer share one layout, so the frame Ink
  // draws must be the piped golden, line for line.
  it("draws the same lines as renderHelp", () => {
    const frame = render(<Help {...deploy} columns={80} />).lastFrame() ?? ""
    const expected = renderHelp(deploy, { columns: 80, mode: "plain" })
    expect(trimLines(frame)).toBe(expected.replace(/\n$/, ""))
  })

  it("drops descriptions under their names below 60 columns", () => {
    const frame = render(<Help {...deploy} columns={50} />).lastFrame() ?? ""
    expect(frame).toContain("  -v, --verbose\n      Log every request")
  })

  it("keeps the header without a banner", () => {
    const frame = render(<Help name="t" version="1.0.0" description="does a thing." />).lastFrame() ?? ""
    expect(trimLines(frame)).toBe("t 1.0.0\nDoes a thing")
  })
})
