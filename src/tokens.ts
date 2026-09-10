export const colors = {
  accent: "#FF8C00",
  muted: "gray",
  success: "green",
  error: "red",
  warning: "yellow",
  info: "cyan",
  group: "magenta",
} as const

export type Color = (typeof colors)[keyof typeof colors]

/**
 * The soft family: a filled block that is quiet enough to live on every row.
 *
 * Solid `colors` are events and shout on purpose. A permanent classifier —
 * an issue type, a category — sits on a dark ground beside the row's real
 * news, and a saturated fill there out-shouts it. These are the same
 * semantics, desaturated and darkened so white ink reads on all seven,
 * measured against `#1e1f26` for a deutan/protan reader. Hex rather than
 * ANSI names because the point is a fixed, measured contrast, and a named
 * colour is whatever the theme says it is.
 *
 * `group` is the container of the rows beneath it (an epic). It is
 * deliberately not the accent hue: an accent-filled block on the same row
 * as an accent-coloured key steals the key's colour.
 */
export const softColors = {
  accent: "#8f4611",
  muted: "#474a54",
  success: "#2e6d4c",
  error: "#7e2a2c",
  warning: "#8a6a1e",
  info: "#3c74a2",
  group: "#524389",
} as const

export type SoftColor = (typeof softColors)[keyof typeof softColors]

export const spacing = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
} as const

export type Spacing = (typeof spacing)[keyof typeof spacing]
