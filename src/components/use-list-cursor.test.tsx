import React from "react"
import { Text } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { useListCursor } from "./use-list-cursor.js"

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

const UP = "\u001B[A"
const DOWN = "\u001B[B"

type HarnessProps = {
  length?: number
  initial?: number
  wrap?: boolean
  vimKeys?: boolean
  isActive?: boolean
}

const Harness = ({ length = 3, ...options }: HarnessProps) => {
  const { cursor } = useListCursor(length, options)
  return <Text>cursor:{cursor}</Text>
}

describe("useListCursor", () => {
  it("starts at 0, or at an explicit initial", () => {
    expect(render(<Harness />).lastFrame()).toContain("cursor:0")
    expect(render(<Harness initial={2} />).lastFrame()).toContain("cursor:2")
  })

  it("moves down and up with the arrow keys", async () => {
    const { stdin, lastFrame } = render(<Harness />)
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("cursor:1")
    stdin.write(UP)
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })

  it("accepts vim j/k by default", async () => {
    const { stdin, lastFrame } = render(<Harness />)
    stdin.write("j")
    await delay()
    expect(lastFrame()).toContain("cursor:1")
    stdin.write("k")
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })

  it("leaves j/k alone when vimKeys is off", async () => {
    const { stdin, lastFrame } = render(<Harness vimKeys={false} />)
    stdin.write("j")
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })

  it("clamps at the top rather than wrapping", async () => {
    const { stdin, lastFrame } = render(<Harness />)
    stdin.write(UP)
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })

  it("clamps at the bottom rather than wrapping", async () => {
    const { stdin, lastFrame } = render(<Harness initial={2} />)
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("cursor:2")
  })

  // The signed-modulo case. `(0 - 1) % 3` is -1 in JS, not 2, so a wrap written
  // without the `+ length` lands the cursor off the list. Every clamp test above
  // passes against that bug because clamping never reaches the modulo at all.
  it("wraps top-to-bottom when wrap is on", async () => {
    const { stdin, lastFrame } = render(<Harness wrap />)
    stdin.write(UP)
    await delay()
    expect(lastFrame()).toContain("cursor:2")
  })

  it("wraps bottom-to-top when wrap is on", async () => {
    const { stdin, lastFrame } = render(<Harness wrap initial={2} />)
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })

  it("ignores input when isActive is false", async () => {
    const { stdin, lastFrame } = render(<Harness isActive={false} />)
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })

  it("does nothing on an empty list", async () => {
    const { stdin, lastFrame } = render(<Harness length={0} />)
    stdin.write(DOWN)
    await delay()
    expect(lastFrame()).toContain("cursor:0")
  })
})
