import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Box, Text, measureElement, useWindowSize, type DOMElement } from "ink"
import { colors } from "../tokens.js"

// One cell per frame: fast enough to read as motion, slow enough that the eye
// can follow the band rather than seeing a flicker.
const SHIMMER_FRAME_MS = 70
// The crest is seven cells across with two blended cells each side — wide
// enough to find at row-scan speed, narrow enough to read as a band and not a
// second bar.
const CREST_HALF = 3
const FALLOFF = 2
// The head starts and ends this far past the bar's edge, so the band slides
// fully in from nothing rather than popping into existence at cell zero.
const LEAD = CREST_HALF + FALLOFF + 1
// Frames of plain track between sweeps: the pause that says "loading", where
// a ceaseless loop would say "busy".
const PAUSE_FRAMES = 10
// Frames each row lags the one above, so the wave travels down-and-across
// instead of marching in lockstep.
const ROW_LAG = 2

const toRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

// The falloff is blended, not tokenised: it is a gradient between two tokens,
// and naming every step would fix a shape that belongs to the wave, not to
// the palette.
const blendHex = (from: string, to: string, t: number): string => {
  const [r1, g1, b1] = toRgb(from)
  const [r2, g2, b2] = toRgb(to)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  const hex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${hex(mix(r1, r2))}${hex(mix(g1, g2))}${hex(mix(b1, b2))}`
}

/**
 * Which colour the cell at `cell` takes on `frame` of a `width`-wide bar, the
 * shimmer maths as a pure function: crest at the head, a two-cell blended
 * falloff each side, base track everywhere else, and plain track for every
 * cell once the band has left and the pause runs. `rowOffset` staggers rows
 * sharing one clock — `SkeletonRows` passes each row's lag here.
 *
 * Exported for its own test and nothing else — `src/index.ts` does not
 * re-export it, which is this package's definition of internal. The frame a
 * test renders carries no escape codes (the runner is not a TTY), so the
 * choice is unobservable through the component and has to be asserted here or
 * not at all.
 */
export const skeletonCellColor = (
  cell: number,
  frame: number,
  width: number,
  rowOffset = 0,
): string => {
  const cells = Math.max(0, Math.floor(width))
  const travel = cells + LEAD * 2
  const cycle = travel + PAUSE_FRAMES
  const phase = (((frame - rowOffset) % cycle) + cycle) % cycle
  if (phase >= travel) return colors.track
  const distance = Math.abs(cell - (phase - LEAD))
  if (distance <= CREST_HALF) return colors.trackHighlight
  if (distance <= CREST_HALF + FALLOFF)
    return blendHex(
      colors.track,
      colors.trackHighlight,
      (CREST_HALF + FALLOFF + 1 - distance) / (FALLOFF + 1),
    )
  return colors.track
}

/**
 * Whether a skeleton may animate: the caller asked for it, the output is a
 * terminal that can show it, and the user has not opted out of motion.
 *
 * Exported for its own test alongside `skeletonCellColor`, and internal for
 * the same reason. `NO_MOTION` / `REDUCE_MOTION` are read the way `Pill`
 * reads `NO_COLOR` — plain env checks, no config surface.
 */
export const skeletonMotionEnabled = (animate: boolean): boolean => {
  if (!animate) return false
  if (process.env["NO_MOTION"] || process.env["REDUCE_MOTION"]) return false
  return process.stdout?.isTTY === true
}

type SkeletonBarProps = {
  /** Cells to draw. */
  width: number
  /**
   * Settle for the plain track bar. Defaults to true; still draws static when
   * stdout is not a TTY or motion is opted out, whatever is passed.
   */
  animate?: boolean
  /**
   * A frame on the shared clock, passed by `SkeletonRows` so every row ticks
   * together. Omit it and the bar keeps its own clock — that is the standalone
   * behaviour.
   */
  frame?: number
  /**
   * Stagger within a shared clock, in frames. `SkeletonRows` passes each row's
   * lag; a standalone bar leaves it at 0.
   */
  rowOffset?: number
}

/**
 * A placeholder for text that has not arrived: a run of `█` over the track
 * ground, swept left to right by a soft highlight band that loops after a
 * short pause.
 *
 * Animated on purpose — amended 2026-10-05. This used to be static, on the
 * grounds that a shimmer is motion with nothing behind it and the status slot
 * is where a page says it is busy. In practice a first load with nothing on
 * screen reads as frozen without motion: the status slot says busy, but there
 * is no body yet for it to reassure. Still draws the plain static bar when
 * there is nowhere for motion to show — stdout piped, `NO_MOTION` or
 * `REDUCE_MOTION` set — or when `animate` is false.
 */
export const SkeletonBar = ({
  width,
  animate = true,
  frame,
  rowOffset = 0,
}: SkeletonBarProps) => {
  const cells = Math.max(0, Math.floor(width))
  const controlled = frame !== undefined
  const active = !controlled && skeletonMotionEnabled(animate)
  const [ownFrame, setOwnFrame] = useState(0)

  useEffect(() => {
    if (!active) return
    const timer = setInterval(
      () => setOwnFrame((f) => f + 1),
      SHIMMER_FRAME_MS,
    )
    return () => clearInterval(timer)
  }, [active])

  if (!controlled && !active)
    return <Text color={colors.track}>{"█".repeat(cells)}</Text>
  const at = controlled ? frame : ownFrame
  return (
    <Text>
      {Array.from({ length: cells }, (_, i) => (
        <Text key={i} color={skeletonCellColor(i, at, cells, rowOffset)}>
          █
        </Text>
      ))}
    </Text>
  )
}

type SkeletonRowsProps = {
  /** How many bars to draw. Blank gap rows are extra. */
  rows: number
  /**
   * Each bar's length as a fraction (0–1) of the width left after `indent`,
   * cycled in order: row `i` takes `widths[i % widths.length]`. Deterministic,
   * so the placeholder does not reshuffle on every render.
   */
  widths: number[]
  /** Insert one blank row after every `gapEvery` bars, never after the last. */
  gapEvery?: number
  /** Leading blank cells before every bar. Defaults to 0. */
  indent?: number
  /**
   * The width the fractions are taken of. Omit it and the rows measure the
   * space their container gives them, re-measuring when the terminal resizes.
   */
  width?: number
  /**
   * Settle every row for the plain track bar. Passed through to each
   * `SkeletonBar`; defaults to true.
   */
  animate?: boolean
}

/**
 * The body of a list that has nothing to show yet: `rows` skeleton bars whose
 * lengths cycle through `widths`, grouped by blank rows when `gapEvery` is set.
 * Only for the first load, when nothing is known — once real rows exist, keep
 * them on screen and say busy in `Page`'s status slot instead.
 *
 * One clock for the group: a single interval here hands each bar its frame,
 * staggered by row so the wave travels diagonally down-and-across rather than
 * marching in lockstep.
 */
export const SkeletonRows = ({
  rows,
  widths,
  gapEvery,
  indent = 0,
  width,
  animate = true,
}: SkeletonRowsProps) => {
  const ref = useRef<DOMElement | null>(null)
  const [measured, setMeasured] = useState(0)
  useWindowSize()

  useLayoutEffect(() => {
    if (width !== undefined || !ref.current) return
    const { width: w } = measureElement(ref.current)
    if (w !== measured) setMeasured(w)
  })

  const active = skeletonMotionEnabled(animate)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setFrame((f) => f + 1), SHIMMER_FRAME_MS)
    return () => clearInterval(timer)
  }, [active])

  const available = Math.max(0, (width ?? measured) - indent)
  const lines: Array<number | null> = []
  for (let i = 0; i < rows; i++) {
    const fraction = widths.length ? widths[i % widths.length]! : 1
    lines.push(Math.round(Math.max(0, Math.min(1, fraction)) * available))
    const closesGroup =
      gapEvery !== undefined && gapEvery > 0 && (i + 1) % gapEvery === 0
    if (closesGroup && i < rows - 1) lines.push(null)
  }

  let bar = 0
  return (
    <Box ref={ref} flexDirection="column">
      {lines.map((cells, i) => {
        if (cells === null)
          return (
            <Text key={i}>
              {" "}
            </Text>
          )
        const rowOffset = bar++ * ROW_LAG
        return (
          <Text key={i}>
            {" ".repeat(indent)}
            <SkeletonBar
              width={cells}
              animate={animate}
              frame={active ? frame : undefined}
              rowOffset={rowOffset}
            />
          </Text>
        )
      })}
    </Box>
  )
}
