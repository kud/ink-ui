import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, afterEach } from "vitest"
import { Box, Text } from "ink"
import {
  SkeletonBar,
  SkeletonRows,
  skeletonCellColor,
  skeletonMotionEnabled,
} from "./skeleton.js"
import { colors } from "../tokens.js"

const bars = (frame: string) =>
  frame.split("\n").map((line) => (line.match(/█/g) ?? []).length)

const settle = () => new Promise((r) => setTimeout(r, 30))

// Width 20 gives travel 32 and cycle 42: head starts six cells left of the
// bar, crosses one cell per frame, then ten frames of plain track.
const WIDTH = 20

describe("skeletonCellColor", () => {
  it("peaks at the highlight crest around the head", () => {
    // Frame 11 puts the head on cell 5; the crest spans three cells each side.
    for (const cell of [2, 3, 4, 5, 6, 7, 8])
      expect(skeletonCellColor(cell, 11, WIDTH)).toBe(colors.trackHighlight)
  })

  it("falls off as a gradient, not a hard edge", () => {
    expect(skeletonCellColor(9, 11, WIDTH)).toBe("#565e6a")
    expect(skeletonCellColor(10, 11, WIDTH)).toBe("#404853")
  })

  it("is base track outside the band", () => {
    expect(skeletonCellColor(11, 11, WIDTH)).toBe(colors.track)
    expect(skeletonCellColor(19, 11, WIDTH)).toBe(colors.track)
    // The falloff is symmetric: cell 0 sits five left of the head on cell 5.
    expect(skeletonCellColor(0, 11, WIDTH)).toBe("#404853")
  })

  it("shifts the wave with the row offset", () => {
    expect(skeletonCellColor(5, 11, WIDTH, 0)).toBe(colors.trackHighlight)
    expect(skeletonCellColor(5, 11, WIDTH, 6)).toBe(colors.track)
  })

  it("holds plain track through the pause after the band leaves", () => {
    for (const frame of [32, 35, 41])
      for (let cell = 0; cell < WIDTH; cell++)
        expect(skeletonCellColor(cell, frame, WIDTH)).toBe(colors.track)
  })

  it("starts with the band fully off the bar, and loops cleanly", () => {
    for (let cell = 0; cell < WIDTH; cell++) {
      expect(skeletonCellColor(cell, 0, WIDTH)).toBe(colors.track)
      expect(skeletonCellColor(cell, 42, WIDTH)).toBe(colors.track)
    }
  })

  it("wraps a row offset larger than the frame instead of going negative", () => {
    expect(skeletonCellColor(5, 2, WIDTH, 6)).toBe(colors.track)
  })
})

describe("skeletonMotionEnabled", () => {
  const wasTty = process.stdout.isTTY
  const wasNoMotion = process.env["NO_MOTION"]
  const wasReduceMotion = process.env["REDUCE_MOTION"]

  const tty = (value: boolean | undefined) =>
    Object.defineProperty(process.stdout, "isTTY", {
      value,
      configurable: true,
    })

  afterEach(() => {
    tty(wasTty)
    if (wasNoMotion === undefined) delete process.env["NO_MOTION"]
    else process.env["NO_MOTION"] = wasNoMotion
    if (wasReduceMotion === undefined) delete process.env["REDUCE_MOTION"]
    else process.env["REDUCE_MOTION"] = wasReduceMotion
  })

  it("is true on a TTY with no opt-out", () => {
    tty(true)
    delete process.env["NO_MOTION"]
    delete process.env["REDUCE_MOTION"]
    expect(skeletonMotionEnabled(true)).toBe(true)
  })

  it("is false when the caller passes animate={false}, even on a TTY", () => {
    tty(true)
    delete process.env["NO_MOTION"]
    delete process.env["REDUCE_MOTION"]
    expect(skeletonMotionEnabled(false)).toBe(false)
  })

  it("is false under either motion opt-out", () => {
    tty(true)
    delete process.env["REDUCE_MOTION"]
    process.env["NO_MOTION"] = "1"
    expect(skeletonMotionEnabled(true)).toBe(false)
    delete process.env["NO_MOTION"]
    process.env["REDUCE_MOTION"] = "1"
    expect(skeletonMotionEnabled(true)).toBe(false)
  })

  it("is false when stdout is not a TTY", () => {
    tty(undefined)
    delete process.env["NO_MOTION"]
    delete process.env["REDUCE_MOTION"]
    expect(skeletonMotionEnabled(true)).toBe(false)
  })
})

describe("SkeletonBar", () => {
  it("draws exactly `width` blocks and nothing else", () => {
    const { lastFrame } = render(<SkeletonBar width={7} />)
    expect(lastFrame()).toBe("█".repeat(7))
  })

  it("draws nothing for a zero width", () => {
    const { lastFrame } = render(<SkeletonBar width={0} />)
    expect(lastFrame()).toBe("")
  })

  it("animate={false} draws the static bar and starts no timer, even on a TTY", async () => {
    const wasTty = process.stdout.isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    try {
      const { lastFrame, frames } = render(
        <SkeletonBar width={5} animate={false} />,
      )
      expect(lastFrame()).toBe("█".repeat(5))
      await new Promise((r) => setTimeout(r, 150))
      expect(frames.length).toBe(1)
    } finally {
      Object.defineProperty(process.stdout, "isTTY", {
        value: wasTty,
        configurable: true,
      })
    }
  })

  it("stays static under NO_MOTION, even on a TTY", async () => {
    const wasTty = process.stdout.isTTY
    const wasNoMotion = process.env["NO_MOTION"]
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    process.env["NO_MOTION"] = "1"
    try {
      const { lastFrame, frames } = render(<SkeletonBar width={5} />)
      expect(lastFrame()).toBe("█".repeat(5))
      await new Promise((r) => setTimeout(r, 150))
      expect(frames.length).toBe(1)
    } finally {
      Object.defineProperty(process.stdout, "isTTY", {
        value: wasTty,
        configurable: true,
      })
      if (wasNoMotion === undefined) delete process.env["NO_MOTION"]
      else process.env["NO_MOTION"] = wasNoMotion
    }
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

  it("animate={false} stills every row", () => {
    const { lastFrame } = render(
      <SkeletonRows rows={2} widths={[1]} width={8} animate={false} />,
    )
    expect(bars(lastFrame() ?? "")).toEqual([8, 8])
  })
})
