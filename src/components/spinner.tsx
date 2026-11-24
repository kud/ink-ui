import React from "react"
import { Box, Text, useAnimation, useStdout } from "ink"
import cliSpinners from "cli-spinners"
import { colors } from "../tokens.js"
import { motionAllowed, streamIsTTY } from "./motion.js"

export type SpinnerType = "dots" | "line" | "arc" | "pulse" | "bounce"

type SpinnerFrames = {
  readonly interval: number
  readonly frames: readonly string[]
  /** The frame drawn when motion is off — the one that reads best held still. */
  readonly still: string
}

/**
 * Every style is one cell wide, so switching style never moves the label.
 * `pulse` is drawn here rather than taken from `cli-spinners`, whose pulsing
 * styles are all wider than a cell.
 */
export const SPINNERS: Record<SpinnerType, SpinnerFrames> = {
  dots: { ...cliSpinners.dots, still: cliSpinners.dots.frames[0]! },
  line: { ...cliSpinners.line, still: cliSpinners.line.frames[0]! },
  arc: { ...cliSpinners.arc, still: cliSpinners.arc.frames[0]! },
  pulse: { interval: 140, frames: ["·", "•", "●", "•"], still: "●" },
  bounce: { ...cliSpinners.bounce, still: cliSpinners.bounce.frames[0]! },
}

/**
 * The glyph a spinner shows on tick `frame` of Ink's clock, or its still
 * frame when `frame` is undefined (motion off). Exported for its test.
 */
export const spinnerFrame = (type: SpinnerType, frame?: number): string => {
  const spinner = SPINNERS[type]
  if (frame === undefined) return spinner.still
  const n = spinner.frames.length
  return spinner.frames[((Math.floor(frame) % n) + n) % n]!
}

type SpinnerProps = {
  label?: string
  /** Which glyph cycle to draw. Defaults to `dots`. */
  type?: SpinnerType
  /**
   * Let it spin. Defaults to true; it holds a still frame when stdout is not a
   * TTY or `NO_MOTION` / `REDUCE_MOTION` is set, whatever is passed.
   */
  animate?: boolean
}

/**
 * Work in progress with no measurable end. Ticks on Ink's shared animation
 * clock (`useAnimation`), so any number of spinners cost one timer and one
 * render per tick, and holds a still frame where motion cannot or should not
 * show.
 */
export const Spinner = ({ label, type = "dots", animate = true }: SpinnerProps) => {
  const { stdout } = useStdout()
  const moving = motionAllowed(animate, streamIsTTY(stdout))
  const { frame } = useAnimation({
    interval: SPINNERS[type].interval,
    isActive: moving,
  })

  return (
    <Box gap={1}>
      <Text color={colors.accent}>
        {spinnerFrame(type, moving ? frame : undefined)}
      </Text>
      {label && <Text dimColor>{label}</Text>}
    </Box>
  )
}
