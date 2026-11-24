import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Link, hyperlink, supportsHyperlinks } from "./link.js"

describe("hyperlink", () => {
  it("wraps text in the exact OSC 8 pair", () => {
    expect(hyperlink("https://kud.io", "kud")).toBe(
      "\u001b]8;;https://kud.io\u0007kud\u001b]8;;\u0007",
    )
  })

  it("strips control characters that would end the sequence early", () => {
    expect(hyperlink("https://a.io/\u0007\u001b]8;;x", "t\u001bx")).toBe(
      "\u001b]8;;https://a.io/]8;;x\u0007tx\u001b]8;;\u0007",
    )
  })
})

describe("supportsHyperlinks", () => {
  it("is off when output is not a TTY", () => {
    expect(supportsHyperlinks(false, { TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.6.0" })).toBe(false)
  })

  it("honours FORCE_HYPERLINK both ways, even when piped", () => {
    expect(supportsHyperlinks(false, { FORCE_HYPERLINK: "1" })).toBe(true)
    expect(supportsHyperlinks(true, { FORCE_HYPERLINK: "0", WT_SESSION: "x" })).toBe(false)
  })

  it("recognises known terminals and gates by version", () => {
    expect(supportsHyperlinks(true, { TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.5.2" })).toBe(true)
    expect(supportsHyperlinks(true, { TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.0.9" })).toBe(false)
    expect(supportsHyperlinks(true, { WT_SESSION: "abc" })).toBe(true)
    expect(supportsHyperlinks(true, { TERM: "xterm-ghostty" })).toBe(true)
    expect(supportsHyperlinks(true, { VTE_VERSION: "6003" })).toBe(true)
    expect(supportsHyperlinks(true, { TERM: "xterm-256color" })).toBe(false)
  })

  it("stays off in CI", () => {
    expect(supportsHyperlinks(true, { CI: "true", WT_SESSION: "x" })).toBe(false)
  })
})

describe("Link", () => {
  it("falls back to `text (url)` when output is not a TTY", () => {
    const { lastFrame } = render(<Link url="https://kud.io">kud</Link>)
    expect(lastFrame()).toBe("kud (https://kud.io)")
  })

  it("prints a bare URL once in the fallback", () => {
    const { lastFrame } = render(<Link url="https://kud.io" />)
    expect(lastFrame()).toBe("https://kud.io")
  })

  it("emits OSC 8 when forced, and Ink lets it through untouched", () => {
    const { lastFrame } = render(
      <Link url="https://kud.io" hyperlink>
        kud
      </Link>,
    )
    expect(lastFrame()).toContain("\u001b]8;;https://kud.io\u0007kud\u001b]8;;\u0007")
    expect(lastFrame()).not.toContain("(https://kud.io)")
  })
})
