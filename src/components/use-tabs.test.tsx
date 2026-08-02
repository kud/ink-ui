import React from "react"
import { Text } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { useTabs } from "./use-tabs.js"
import type { TabItem } from "./Tabs.js"

const items: TabItem<"open" | "done" | "all">[] = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
]

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

const TAB = "\t"
const SHIFT_TAB = "\u001B[Z" // CSI Z — Ink parses this as tab + shift

const Harness = ({ initial }: { initial?: "open" | "done" | "all" }) => {
  const { active } = useTabs(items, initial ? { initial } : undefined)
  return <Text>active:{active}</Text>
}

describe("useTabs", () => {
  it("starts on the first item", () => {
    const { lastFrame } = render(<Harness />)
    expect(lastFrame()).toContain("active:open")
  })

  it("honours an explicit initial tab", () => {
    const { lastFrame } = render(<Harness initial="done" />)
    expect(lastFrame()).toContain("active:done")
  })

  it("moves forward on Tab", async () => {
    const { stdin, lastFrame } = render(<Harness />)
    stdin.write(TAB)
    await delay()
    expect(lastFrame()).toContain("active:done")
  })

  it("wraps forward from the last tab to the first", async () => {
    const { stdin, lastFrame } = render(<Harness initial="all" />)
    stdin.write(TAB)
    await delay()
    expect(lastFrame()).toContain("active:open")
  })

  it("moves backward on Shift+Tab", async () => {
    const { stdin, lastFrame } = render(<Harness initial="done" />)
    stdin.write(SHIFT_TAB)
    await delay()
    expect(lastFrame()).toContain("active:open")
  })

  // The regression case. A bare `(i - 1) % n` returns -1 here rather than
  // wrapping, because JS `%` keeps the sign of the dividend — the panel goes
  // blank instead of landing on the last tab. Every forward-only test above
  // passes against that bug, so this is the one that actually pins the fix.
  it("wraps backward from the first tab to the last", async () => {
    const { stdin, lastFrame } = render(<Harness />)
    stdin.write(SHIFT_TAB)
    await delay()
    expect(lastFrame()).toContain("active:all")
  })

  it("ignores input when isActive is false", async () => {
    const Inactive = () => {
      const { active } = useTabs(items, { isActive: false })
      return <Text>active:{active}</Text>
    }
    const { stdin, lastFrame } = render(<Inactive />)
    stdin.write(TAB)
    await delay()
    expect(lastFrame()).toContain("active:open")
  })
})
