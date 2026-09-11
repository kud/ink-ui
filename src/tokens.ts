/**
 * `secondary` is the third neutral: text that is context rather than the
 * answer — a row's labels beside its title — and must read as its own tier.
 * Default foreground is the answer, `muted` (which is what `dimColor` renders)
 * is furniture, and a middle tier drawn in either of those is not "quiet", it
 * is absent: on a dark ground `dimColor` inks at L* 50 and the eye files it
 * with the age column. Hex rather than an ANSI name because the tier only
 * exists as a measured step — `#999999` is L* 63, 5.9:1 on `#1c1c28` and 13 L*
 * above the faint, which reads as a decision; `#888888` is 7 L* above it and
 * reads as a rendering wobble. Tuned to the dark ground every consumer already
 * commits to; a light-theme terminal would need its own value.
 */
export const colors = {
  accent: "#FF8C00",
  secondary: "#999999",
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
