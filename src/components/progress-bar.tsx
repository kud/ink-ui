// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Text, useAnimation, useStdout } from "ink"
import { colors } from "../tokens.js"
import { motionAllowed, streamIsTTY } from "./motion.js"

/** Left-anchored partial blocks, one per eighth of a cell: index 1 is ▏. */
export const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"] as const

/**
 * How a `width`-cell bar spends `fraction` (0–1) at eighth-cell resolution:
 * whole filled cells, the eighths in the one partial cell (0 when the edge
 * falls on a cell boundary), and the track cells after it. The three always
 * add up to `width`.
 */
export const barCells = (
  fraction: number,
  width: number,
): { full: number; partial: number; empty: number } => {
  const cells = Math.max(0, Math.floor(width))
  const f = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0
  const eighths = Math.round(f * cells * 8)
  const full = Math.floor(eighths / 8)
  const partial = eighths % 8
  return { full, partial, empty: cells - full - (partial ? 1 : 0) }
}

/**
 * Where an indeterminate bar's band starts on `frame`: it walks to the far
 * end and back, one cell a frame. With motion off the caller passes no frame
 * and the band rests in the middle, which reads as "working" rather than as a
 * quarter done.
 */
export const indeterminateOffset = (
  width: number,
  band: number,
  frame?: number,
): number => {
  const travel = Math.max(0, Math.floor(width) - band)
  if (frame === undefined) return Math.floor(travel / 2)
  if (travel === 0) return 0
  const p = frame % (travel * 2)
  return p <= travel ? p : travel * 2 - p
}

/** Seconds as a short duration: `42s`, `3m 05s`, `1h 02m`. */
export const formatEta = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return ""
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`
}

const INDETERMINATE_MS = 80

type BarProps = {
  fraction: number
  width: number
  color: string
  trackColor: string
}

/** The strip itself, shared by `ProgressBar` and `Meter`. */
export const Bar = ({ fraction, width, color, trackColor }: BarProps) => {
  const { full, partial, empty } = barCells(fraction, width)
  return (
    <Text>
      <Text color={color}>{"█".repeat(full)}</Text>
      {partial ? (
        // The partial glyph covers only its left eighths; the background
        // paints the rest of the cell as track so the strip stays one piece.
        <Text color={color} backgroundColor={trackColor}>
          {EIGHTHS[partial]}
        </Text>
      ) : null}
      <Text color={trackColor}>{"█".repeat(empty)}</Text>
    </Text>
  )
}

type ProgressBarProps = {
  // 0–100. Ignored while `indeterminate`.
  value?: number
  // Total character width of the bar.
  width?: number
  // The filled portion.
  color?: string
  // The unfilled remainder. Keep it clearly darker than `color`: the two are
  // told apart by lightness, which survives any colour vision deficiency.
  trackColor?: string
  /** No known end: a band walks the track instead of a fill growing along it. */
  indeterminate?: boolean
  /** What is progressing, drawn before the bar in `secondary`. */
  label?: string
  /** Print the percentage after the bar, in the default foreground. */
  showValue?: boolean
  /** Time left — seconds, formatted for you, or a string you formatted. Muted. */
  eta?: number | string
  /**
   * Let the indeterminate band move. Defaults to true; it rests still when
   * stdout is not a TTY or `NO_MOTION` / `REDUCE_MOTION` is set, whatever is
   * passed.
   */
  animate?: boolean
}

// Solid blocks throughout, filled and unfilled alike. The previous version drew
// the remainder with a shade character (░), which dithers into a visibly
// textured, faintly three-dimensional strip beside the flat blocks around it.
// One block character in two weights of the same family sits flat instead.
//
// That trades a *shape* difference (█ vs ░) for a *lightness* one, so a truly
// monochrome terminal loses the distinction where it previously kept it — the
// reason to accept that is that lightness still separates for colourblind
// readers, which is the case that actually occurs.
//
// The leading edge is drawn at eighth-cell resolution (▏▎▍▌▋▊▉), so a 20-cell
// bar moves in 160 steps rather than 20 and a slow job visibly advances.
export const ProgressBar = ({
  value = 0,
  width = 20,
  color = colors.accent,
  trackColor = colors.track,
  indeterminate = false,
  label,
  showValue = false,
  eta,
  animate = true,
}: ProgressBarProps) => {
  const { stdout } = useStdout()
  const moving =
    indeterminate && motionAllowed(animate, streamIsTTY(stdout))
  const { frame } = useAnimation({
    interval: INDETERMINATE_MS,
    isActive: moving,
  })
  const cells = Math.max(0, Math.floor(width))
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0

  let bar: React.ReactNode
  if (indeterminate) {
    const band = Math.max(1, Math.round(cells / 4))
    const at = indeterminateOffset(cells, band, moving ? frame : undefined)
    const fill = Math.min(band, cells)
    bar = (
      <Text>
        <Text color={trackColor}>{"█".repeat(at)}</Text>
        <Text color={color}>{"█".repeat(fill)}</Text>
        <Text color={trackColor}>{"█".repeat(Math.max(0, cells - at - fill))}</Text>
      </Text>
    )
  } else {
    bar = (
      <Bar
        fraction={clamped / 100}
        width={cells}
        color={color}
        trackColor={trackColor}
      />
    )
  }

  const etaText = typeof eta === "number" ? formatEta(eta) : eta
  return (
    <Text>
      {label ? <Text color={colors.secondary}>{label} </Text> : null}
      {bar}
      {showValue && !indeterminate ? (
        <Text> {`${Math.round(clamped)}%`.padStart(4)}</Text>
      ) : null}
      {etaText ? <Text color={colors.muted}> eta {etaText}</Text> : null}
    </Text>
  )
}
