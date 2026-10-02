import React, { useLayoutEffect, useRef, useState } from "react"
import { Box, Text, measureElement, useWindowSize, type DOMElement } from "ink"
import { colors } from "../tokens.js"

type SkeletonBarProps = {
  /** Cells to draw. */
  width: number
}

/**
 * A placeholder for text that has not arrived: a run of `█` in the track
 * colour, the same ground a `ProgressBar` leaves unfilled. Static on purpose —
 * a shimmer is motion with nothing behind it, and the status slot is where a
 * page says it is busy.
 */
export const SkeletonBar = ({ width }: SkeletonBarProps) => (
  <Text color={colors.track}>{"█".repeat(Math.max(0, Math.floor(width)))}</Text>
)

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
}

/**
 * The body of a list that has nothing to show yet: `rows` skeleton bars whose
 * lengths cycle through `widths`, grouped by blank rows when `gapEvery` is set.
 * Only for the first load, when nothing is known — once real rows exist, keep
 * them on screen and say busy in `Page`'s status slot instead.
 */
export const SkeletonRows = ({
  rows,
  widths,
  gapEvery,
  indent = 0,
  width,
}: SkeletonRowsProps) => {
  const ref = useRef<DOMElement | null>(null)
  const [measured, setMeasured] = useState(0)
  useWindowSize()

  useLayoutEffect(() => {
    if (width !== undefined || !ref.current) return
    const { width: w } = measureElement(ref.current)
    if (w !== measured) setMeasured(w)
  })

  const available = Math.max(0, (width ?? measured) - indent)
  const lines: Array<number | null> = []
  for (let i = 0; i < rows; i++) {
    const fraction = widths.length ? widths[i % widths.length]! : 1
    lines.push(Math.round(Math.max(0, Math.min(1, fraction)) * available))
    const closesGroup =
      gapEvery !== undefined && gapEvery > 0 && (i + 1) % gapEvery === 0
    if (closesGroup && i < rows - 1) lines.push(null)
  }

  return (
    <Box ref={ref} flexDirection="column">
      {lines.map((cells, i) => (
        <Text key={i}>
          {cells === null ? " " : " ".repeat(indent)}
          {cells === null ? null : <SkeletonBar width={cells} />}
        </Text>
      ))}
    </Box>
  )
}
