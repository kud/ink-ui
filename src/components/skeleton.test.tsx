import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Box, Text } from "ink"
import { SkeletonBar, SkeletonRows } from "./skeleton.js"

const bars = (frame: string) =>
  frame.split("\n").map((line) => (line.match(/█/g) ?? []).length)

const settle = () => new Promise((r) => setTimeout(r, 30))

describe("SkeletonBar", () => {
  it("draws exactly `width` blocks and nothing else", () => {
    const { lastFrame } = render(<SkeletonBar width={7} />)
    expect(lastFrame()).toBe("█".repeat(7))
  })

  it("draws nothing for a zero width", () => {
    const { lastFrame } = render(<SkeletonBar width={0} />)
    expect(lastFrame()).toBe("")
  })

  it("is static — the frame never changes on its own", async () => {
    const { frames } = render(<SkeletonBar width={5} />)
    const before = frames.length
    await new Promise((r) => setTimeout(r, 200))
    expect(frames.length).toBe(before)
  })
})

describe("SkeletonRows", () => {
  it("cycles the width fractions in order, deterministically", () => {
    const frame = () =>
      render(
        <SkeletonRows rows={5} widths={[1, 0.5, 0.25]} width={40} />,
      ).lastFrame() ?? ""
    expect(bars(frame())).toEqual([40, 20, 10, 40, 20])
    expect(frame()).toBe(frame())
  })

  it("inserts one blank row after every `gapEvery` rows, never trailing", () => {
    const { lastFrame } = render(
      <SkeletonRows rows={5} widths={[1]} gapEvery={2} width={10} />,
    )
    expect(bars(lastFrame() ?? "")).toEqual([10, 10, 0, 10, 10, 0, 10])
  })

  it("indents every bar and takes the fractions of what is left", () => {
    const { lastFrame } = render(
      <SkeletonRows rows={1} widths={[0.5]} indent={4} width={24} />,
    )
    expect(lastFrame()).toBe(`    ${"█".repeat(10)}`)
  })

  it("measures its container when no width is given", async () => {
    const { lastFrame } = render(
      <Box width={30} flexDirection="column">
        <Text>head</Text>
        <SkeletonRows rows={2} widths={[1, 0.5]} />
      </Box>,
    )
    await settle()
    expect(bars(lastFrame() ?? "").slice(1)).toEqual([30, 15])
  })
})
