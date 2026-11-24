/**
 * The colour arithmetic the theme derives its layers with. Pure functions, no
 * terminal access — a theme is computed once from its inputs, never measured at
 * render time.
 */

const channels = (hex: string): [number, number, number] =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [
    number,
    number,
    number,
  ]

const toHex = (value: number): string =>
  Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()

/** True for a `#rrggbb` string — the only form the theme measures. */
export const isHex = (value: string | undefined | null): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)

/**
 * Downsample a hex to its xterm 256-colour index the way chalk does (ansi-styles
 * `rgbToAnsi256`): an exact grey goes to the 24-step ramp, anything else rounds
 * each channel onto the 6×6×6 cube. Used for the tokens `@kud/glyphs` gives no
 * hand-picked 256 index for, so the two layers can never disagree about how a
 * colour this package owns degrades.
 */
export const hexToAnsi256 = (hex: string): number => {
  const [red, green, blue] = channels(hex)
  if (red === green && green === blue) {
    if (red < 8) return 16
    if (red > 248) return 231
    return Math.round(((red - 8) / 247) * 24) + 232
  }
  return (
    16 +
    36 * Math.round((red / 255) * 5) +
    6 * Math.round((green / 255) * 5) +
    Math.round((blue / 255) * 5)
  )
}

/** A linear blend of `top` over `ground` at `weight` (0 = ground, 1 = top). */
export const mix = (top: string, ground: string, weight: number): string => {
  const a = channels(top)
  const b = channels(ground)
  return `#${a.map((c, i) => toHex(c * weight + b[i]! * (1 - weight))).join("")}`
}

/** WCAG relative luminance of a `#rrggbb` colour. */
export const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1–21. */
export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The sixteen ANSI palette slots as Ink (chalk) names. A named colour is the
 * one form the terminal's own theme repaints, which is exactly what the
 * `minimal` level wants: on a 16-colour terminal the user's palette is the
 * only palette there is.
 */
export const ANSI16_NAMES = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "blackBright",
  "redBright",
  "greenBright",
  "yellowBright",
  "blueBright",
  "magentaBright",
  "cyanBright",
  "whiteBright",
] as const

export type Ansi16Name = (typeof ANSI16_NAMES)[number]

export const ansi16Name = (index: number): Ansi16Name =>
  ANSI16_NAMES[Math.max(0, Math.min(15, index))]!

/** Ink's spelling of a 256-colour index. */
export const ansi256 = (index: number): string => `ansi256(${index})`
