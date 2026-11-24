import React from "react"
import { Text } from "ink"
import { colors } from "../tokens.js"
import { Bar } from "./progress-bar.js"

export type MeterLevel = "normal" | "warning" | "critical"

/**
 * Which zone `value` sits in. `warning` and `critical` are thresholds in the
 * value's own units, and a value at a threshold is in it. Exported so the
 * colour choice — invisible in a test frame — can be asserted directly.
 */
export const meterLevel = (
  value: number,
  { warning, critical }: { warning?: number; critical?: number } = {},
): MeterLevel => {
  if (critical !== undefined && value >= critical) return "critical"
  if (warning !== undefined && value >= warning) return "warning"
  return "normal"
}

const LEVEL_GLYPH: Record<MeterLevel, string> = {
  normal: "",
  warning: "⚠",
  critical: "✗",
}

type MeterProps = {
  /** The measurement, in its own units. Clamped to `min`–`max` for drawing. */
  value: number
  /** Bottom of the scale. Defaults to 0. */
  min?: number
  /** Top of the scale. Defaults to 100. */
  max?: number
  /** Cells the bar spans. Defaults to 20. */
  width?: number
  /** What is measured, drawn before the bar in `secondary`. */
  label?: string
  /** At or above this, the fill turns `warning` and gains `⚠`. */
  warning?: number
  /** At or above this, the fill turns `error` and gains `✗`. */
  critical?: number
  /**
   * The reading after the bar. Defaults to the percentage of the scale; pass
   * a function for units (`(v, _, max) => \`${v} / ${max} GB\``) or `false`
   * to draw the bar alone.
   */
  format?: ((value: number, min: number, max: number) => string) | false
  /** The fill while no threshold is crossed. Defaults to `secondary`. */
  color?: string
  trackColor?: string
}

/**
 * A bounded measurement — disk used, quota spent, a score — as opposed to a
 * `ProgressBar`, which is work heading for done. The fill stays a quiet
 * `secondary` until a threshold is crossed, so a meter only spends colour when
 * it has news, and a crossed threshold always carries its glyph (`⚠`, `✗`) as
 * well as its hue.
 */
export const Meter = ({
  value,
  min = 0,
  max = 100,
  width = 20,
  label,
  warning,
  critical,
  format,
  color = colors.secondary,
  trackColor = colors.track,
}: MeterProps) => {
  const span = max - min
  const fraction = span > 0 ? (value - min) / span : 0
  const level = meterLevel(value, { warning, critical })
  const fill =
    level === "critical"
      ? colors.error
      : level === "warning"
        ? colors.warning
        : color
  const reading =
    format === false
      ? ""
      : format
        ? format(value, min, max)
        : `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`.padStart(4)
  const glyph = LEVEL_GLYPH[level]
  return (
    <Text>
      {label ? <Text color={colors.secondary}>{label} </Text> : null}
      <Bar fraction={fraction} width={width} color={fill} trackColor={trackColor} />
      {reading ? <Text> {reading}</Text> : null}
      {glyph ? <Text color={fill}> {glyph}</Text> : null}
    </Text>
  )
}
