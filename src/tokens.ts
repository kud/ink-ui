/**
 * The raw hexes behind every token, tuned to the dark ground `#1a1b27`.
 * Dark-only and truecolour assumed; on a 256-colour terminal chalk downsamples
 * them (`tokens.test.ts` checks the pairs that must stay apart). Hex rather
 * than ANSI names, because the terminal theme repaints a named colour.
 */
export const palette = {
  orange: "#FF8C00",
  amber: "#FFB400",
  yellow: "#FFCB6B",
  red: "#FF5364",
  mint: "#5FD7A7",
  green: "#4ADE80",
  coral: "#FF6B6B",
  blue: "#82AAFF",
  cyan: "#89DDFF",
  purple: "#C792EA",
  ink: "#E4E4EC",
  grey: "#999999",
  slate: "#75767E",
  dusk: "#5C5E73",
  selection: "#30364A",
  track: "#2B323D",
  trackHigh: "#6B7480",
} as const

export type Palette = (typeof palette)[keyof typeof palette]

/**
 * `secondary` is the third neutral: text that is context rather than the
 * answer — a row's labels beside its title — and must read as its own tier.
 * Default foreground is the answer, `muted` (measured #75767E) is furniture,
 * and a middle tier drawn in either of those is not "quiet", it is absent: on
 * a dark ground `dimColor` inks at L* 50 and the eye files it with the age
 * column. Hex rather than an ANSI name because the tier only exists as a
 * measured step — `#999999` is L* 63, 5.9:1 on `#1c1c28` and 13 L* above the
 * faint, which reads as a decision; `#888888` is 7 L* above it and reads as a
 * rendering wobble. Tuned to the dark ground every consumer already commits
 * to; a light-theme terminal would need its own value.
 *
 * `track` is the unlit ground of a measured strip: the empty part of a
 * `ProgressBar`, and the base of a `SkeletonBar` standing in for text that
 * has not arrived. Furniture, never a state — kept clearly darker than any
 * fill drawn over it, so the two separate by lightness for every reader.
 *
 * `trackHighlight` is the crest of that ground: the lighter step a skeleton's
 * shimmer band peaks at while it sweeps, with the falloff each side blended
 * between the two. Still ground, never ink — nothing is ever written in it,
 * which is why it can sit well above `track` without becoming a state.
 */
export const colors = {
  accent: palette.orange,
  secondary: palette.grey,
  muted: palette.slate,
  success: palette.mint,
  error: palette.red,
  warning: palette.amber,
  info: palette.cyan,
  group: palette.purple,
  track: palette.track,
  trackHighlight: palette.trackHigh,
  ticket: palette.yellow,
  pr: palette.orange,
  link: palette.blue,
  added: palette.green,
  removed: palette.coral,
  pending: palette.slate,
  dim: palette.dusk,
  selection: palette.selection,
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

/**
 * Priority is ordinal, so it steps in lightness, never hue: a red chevron
 * would claim a failure. The chevron's shape carries the rank.
 */
export const priorityColors = {
  highest: palette.ink,
  high: palette.ink,
  medium: palette.grey,
  low: palette.slate,
  lowest: palette.slate,
} as const

export type PriorityColor = (typeof priorityColors)[keyof typeof priorityColors]

export const spacing = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
} as const

export type Spacing = (typeof spacing)[keyof typeof spacing]
