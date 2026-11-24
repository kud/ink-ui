/**
 * Themes: a validated token set, resolved once from what the terminal can show.
 *
 * Every colour is derived from `@kud/glyphs`' `colors.json`, which carries each
 * token at three depths — `ansi16` (the meaning every consumer honours),
 * `ansi256` (a hand-picked fallback) and `hex` (the dark-ground truecolour
 * layer). Nothing here re-types one of those values. The few roles ink-ui has
 * that glyphs does not (`ticket`, `selection`, `trackHighlight`) and the light
 * layer glyphs does not carry yet are ink-ui's own, written once below.
 *
 * Three levels, named and contracted like shui's (`src/themes/*.zsh`):
 *
 * - `default` — the full palette, at whatever depth the terminal has:
 *   truecolour hexes, the 256-colour layer, or the 16-colour floor. Dark by
 *   default; `background: "light"` takes the light variant.
 * - `minimal` — the 16 ANSI colours only, by name, so the user's terminal
 *   palette paints them.
 * - `plain` — no colour at all. Text attributes (bold, underline, dim) stay:
 *   `NO_COLOR` is about colour, and a bold title is how a heading survives it.
 *   Chosen automatically whenever the terminal has no colour.
 *
 * Like shui's `_shui_validate_theme`, a theme declares every required token or
 * it is rejected: `validateTheme` names the missing ones.
 */
import { colors as glyphColors, states as glyphStates } from "@kud/glyphs"
import { getIconMode } from "../icon-mode.js"
import {
  palette,
  softColors as SOFT_DARK,
  tonalColors as TONAL_DARK,
  tonalStrongColors as TONAL_STRONG_DARK,
} from "../tokens.js"
import {
  ansi16Name,
  ansi256,
  hexToAnsi256,
  mix,
} from "./color-math.js"
import { glyphSets, type GlyphSet, type GlyphSetName } from "./glyph-set.js"
import {
  detectEnvironment,
  type ColorLevel,
  type Env,
  type TerminalBackground,
  type TerminalCapabilities,
} from "./terminal.js"

export type ThemeName = "default" | "minimal" | "plain"

export const THEME_NAMES: readonly ThemeName[] = ["default", "minimal", "plain"]

/** Every colour role a theme must declare. The same keys as `colors`. */
export const COLOR_ROLES = [
  "accent",
  "secondary",
  "muted",
  "success",
  "error",
  "warning",
  "info",
  "group",
  "track",
  "trackHighlight",
  "ticket",
  "pr",
  "link",
  "added",
  "removed",
  "pending",
  "dim",
  "selection",
] as const

export type ColorRole = (typeof COLOR_ROLES)[number]

/** The seven `Pill` variants, which key the soft and tonal families. */
export const FILL_ROLES = [
  "success",
  "error",
  "warning",
  "info",
  "accent",
  "muted",
  "group",
] as const

export type FillRole = (typeof FILL_ROLES)[number]

export const PRIORITY_ROLES = [
  "highest",
  "high",
  "medium",
  "low",
  "lowest",
] as const

export type PriorityRole = (typeof PRIORITY_ROLES)[number]

/** A resolved colour: a hex, `ansi256(n)`, an ANSI name — or `undefined`, no colour. */
export type ThemeColor = string | undefined

export type TonalPair = { fill: ThemeColor; ink: ThemeColor }

export type StateName = keyof typeof glyphStates

/** A state from glyphs' state map, resolved: its mark, its colour, whether it spins. */
export type ThemeState = { glyph: string; color: ThemeColor; spinner: boolean }

/**
 * What every component reads before it decides how to draw. One answer for
 * the whole app, so no component asks `process.env` for itself.
 */
export type ThemePolicy = {
  /** Draw colour at all. False under `NO_COLOR`, a pipe, `TERM=dumb`. */
  color: boolean
  /** Animate. False for reduced motion, a non-TTY and a screen reader. */
  motion: boolean
  /** Output is static — not a TTY, so nothing is redrawn and nothing should pretend to be live. */
  static: boolean
  /** Ink's screen-reader mode: say states in words, hide decoration. */
  screenReader: boolean
  /** The terminal can draw beyond 7-bit ASCII. */
  unicode: boolean
  /** OSC 8 hyperlinks are drawn (`FORCE_HYPERLINK` overrides detection). */
  hyperlinks: boolean
}

export type Theme = {
  name: ThemeName
  background: TerminalBackground
  colorLevel: ColorLevel
  colors: Record<ColorRole, ThemeColor>
  softColors: Record<FillRole, ThemeColor>
  tonalColors: Record<FillRole, TonalPair>
  tonalStrongColors: Record<FillRole, TonalPair>
  priorityColors: Record<PriorityRole, ThemeColor>
  states: Record<StateName, ThemeState>
  icons: GlyphSetName
  glyphs: GlyphSet
  policy: ThemePolicy
  /**
   * True for a theme resolved from capabilities (`createTheme`, a
   * `ThemeProvider`); false for the ambient theme a component falls back to
   * without a provider, where it keeps checking the stream Ink draws to.
   */
  provided: boolean
}

type Spec = { ansi16: number; ansi256: number | undefined; dark: string }

/**
 * `muted` is the one glyphs token whose hex is `null` — "stay on the terminal
 * palette". On the dark ground ink-ui has always drawn it as `#75767E`, what
 * `dimColor` measures there, and `colors.muted` keeps that value.
 */
const MUTED_ON_DARK = palette.slate

const fromGlyphs = (role: keyof typeof glyphColors): Spec => {
  const value = glyphColors[role]
  return {
    ansi16: value.ansi16,
    ansi256: value.ansi256,
    dark: value.hex ?? MUTED_ON_DARK,
  }
}

/**
 * The dark layer. Every entry that exists in glyphs is read from glyphs;
 * the three ink-ui-only roles take their 256 index by downsampling their hex,
 * so they cannot disagree with how chalk would draw them.
 */
const SPECS: Record<ColorRole, Spec> = {
  accent: fromGlyphs("accent"),
  secondary: fromGlyphs("secondary"),
  muted: fromGlyphs("muted"),
  success: fromGlyphs("success"),
  error: fromGlyphs("error"),
  warning: fromGlyphs("warning"),
  info: fromGlyphs("info"),
  group: fromGlyphs("group"),
  track: fromGlyphs("track"),
  link: fromGlyphs("link"),
  added: fromGlyphs("added"),
  removed: fromGlyphs("removed"),
  dim: fromGlyphs("dim"),
  // A PR number is the accent, by rule: the accent is spent once per row and
  // on a PR row the number is where it goes.
  pr: fromGlyphs("accent"),
  // Waiting is not news, so it has no hue of its own.
  pending: fromGlyphs("muted"),
  // ink-ui only — glyphs has no identifier, selection or shimmer role.
  ticket: { ansi16: 11, ansi256: undefined, dark: palette.yellow },
  trackHighlight: { ansi16: 8, ansi256: undefined, dark: palette.trackHigh },
  selection: { ansi16: 8, ansi256: undefined, dark: palette.selection },
}

/**
 * The light layer — glyphs has no light hexes yet, so ink-ui carries them.
 * Tuned to a white ground: every role a reader reads as text clears 4.5:1 on
 * `#FFFFFF` (the contrast test checks it), the never-share-a-hue pairs stay
 * apart at 256 colours, and the grounds (`track`, `selection`) sit just below
 * the paper the way the dark ones sit just above it.
 */
const LIGHT: Record<ColorRole, string> = {
  accent: "#B54700",
  secondary: "#57606A",
  muted: "#6E7781",
  success: "#0A7350",
  error: "#C4122B",
  warning: "#8A5A00",
  info: "#0A6789",
  group: "#7A3EB8",
  track: "#E3E6EA",
  trackHighlight: "#BCC3CB",
  ticket: "#6B6400",
  pr: "#B54700",
  link: "#0A4FC8",
  added: "#1A7F37",
  removed: "#B3372F",
  pending: "#6E7781",
  dim: "#A0A7B0",
  selection: "#DCE3F0",
}

const LIGHT_GROUND = "#FFFFFF"

const mapFill = <T>(fn: (role: FillRole) => T): Record<FillRole, T> =>
  Object.fromEntries(FILL_ROLES.map((role) => [role, fn(role)])) as Record<
    FillRole,
    T
  >

/** Light soft fills: the light hue over white at a fixed weight, inked by contrast at the call site. */
const SOFT_LIGHT = mapFill((role) => mix(LIGHT[role], LIGHT_GROUND, 0.2))

/** Light tonal pairs: the same blend recipe as the dark ones, 12% rest and 22% strong, inked in the hue. */
const TONAL_LIGHT = mapFill((role) => ({
  fill: mix(LIGHT[role], LIGHT_GROUND, 0.12),
  ink: LIGHT[role],
}))
const TONAL_STRONG_LIGHT = mapFill((role) => ({
  fill: mix(LIGHT[role], LIGHT_GROUND, 0.22),
  ink: LIGHT[role],
}))

const PRIORITY_DARK = { ink: palette.ink, grey: palette.grey, slate: palette.slate }
const PRIORITY_LIGHT = { ink: "#1F2328", grey: "#57606A", slate: "#8C959F" }

const priorityTiers = <T>(tiers: {
  ink: T
  grey: T
  slate: T
}): Record<PriorityRole, T> => ({
  highest: tiers.ink,
  high: tiers.ink,
  medium: tiers.grey,
  low: tiers.slate,
  lowest: tiers.slate,
})

/** The 16-colour ANSI slot each fill role takes as a background. */
const FILL_ANSI16: Record<FillRole, number> = mapFill((role) =>
  SPECS[role].ansi16,
)

export type CreateThemeOptions = {
  /** `default`, `minimal` or `plain`. Forced to `plain` when colour is off. */
  name?: ThemeName
  /** Light or dark. Defaults to what the capabilities report, else dark. */
  background?: TerminalBackground
  /** What the terminal can do — from `probeTerminal()` or `detectEnvironment()`. */
  capabilities?: TerminalCapabilities
  /** Glyph set. Defaults to `ascii` without UTF-8, else the icon mode (`nerd` or `unicode`). */
  icons?: GlyphSetName
}

export const policyFor = (capabilities: TerminalCapabilities): ThemePolicy => ({
  color: capabilities.colorLevel !== "none",
  motion:
    capabilities.isTTY &&
    !capabilities.reducedMotion &&
    !capabilities.screenReader,
  static: !capabilities.isTTY,
  screenReader: capabilities.screenReader,
  unicode: capabilities.unicode,
  hyperlinks: capabilities.hyperlinks,
})

const resolveColor = (
  role: ColorRole,
  background: TerminalBackground,
  depth: "truecolor" | "ansi256" | "ansi16",
): string => {
  const spec = SPECS[role]
  if (depth === "ansi16") return ansi16Name(spec.ansi16)
  const hex = background === "light" ? LIGHT[role] : spec.dark
  if (depth === "truecolor") return hex
  // The hand-picked 256 index is tuned to the dark ground; the light layer
  // downsamples its own hex.
  return ansi256(
    background === "dark" && spec.ansi256 !== undefined
      ? spec.ansi256
      : hexToAnsi256(hex),
  )
}

const atDepth = (
  hex: string,
  depth: "truecolor" | "ansi256",
): string => (depth === "truecolor" ? hex : ansi256(hexToAnsi256(hex)))

/**
 * Resolve a theme. Pure: the same options always give the same theme, and
 * nothing here touches the terminal — pass `capabilities` from
 * `probeTerminal()` for the real answer, or let it fall back to the
 * environment.
 */
export const createTheme = (options: CreateThemeOptions = {}): Theme => {
  const capabilities = options.capabilities ?? detectEnvironment()
  const detected = policyFor(capabilities)
  const background = options.background ?? capabilities.background ?? "dark"
  const name: ThemeName = !detected.color ? "plain" : (options.name ?? "default")
  // Asking for `plain` is asking for no colour, so the policy says so too and
  // every caller-supplied colour is dropped with the tokens.
  const policy: ThemePolicy = { ...detected, color: name !== "plain" }
  const colorLevel: ColorLevel = name === "plain" ? "none" : capabilities.colorLevel
  const icons: GlyphSetName =
    options.icons ??
    (!policy.unicode ? "ascii" : getIconMode() === "nerd" ? "nerd" : "unicode")
  const glyphs = glyphSets[icons]

  const depth: "truecolor" | "ansi256" | "ansi16" | "none" =
    name === "plain"
      ? "none"
      : name === "minimal" || colorLevel === "ansi16"
        ? "ansi16"
        : colorLevel === "ansi256"
          ? "ansi256"
          : "truecolor"

  const colorFor = (role: ColorRole): ThemeColor =>
    depth === "none" ? undefined : resolveColor(role, background, depth)

  const colors = Object.fromEntries(
    COLOR_ROLES.map((role) => [role, colorFor(role)]),
  ) as Record<ColorRole, ThemeColor>

  const light = background === "light"

  const softColors = mapFill((role): ThemeColor => {
    if (depth === "none") return undefined
    if (depth === "ansi16") return ansi16Name(FILL_ANSI16[role])
    return atDepth(light ? SOFT_LIGHT[role] : SOFT_DARK[role], depth)
  })

  const tonal = (strong: boolean) =>
    mapFill((role): TonalPair => {
      if (depth === "none") return { fill: undefined, ink: undefined }
      // Sixteen colours have no tint: a tonal chip keeps its hue as ink and
      // loses its fill, which is the outline of a chip rather than a chip.
      if (depth === "ansi16")
        return { fill: undefined, ink: ansi16Name(FILL_ANSI16[role]) }
      const pair = light
        ? (strong ? TONAL_STRONG_LIGHT : TONAL_LIGHT)[role]
        : (strong ? TONAL_STRONG_DARK : TONAL_DARK)[role]
      return { fill: atDepth(pair.fill, depth), ink: atDepth(pair.ink, depth) }
    })

  const priorityColors = priorityTiers<ThemeColor>(
    depth === "none"
      ? { ink: undefined, grey: undefined, slate: undefined }
      : depth === "ansi16"
        ? { ink: "whiteBright", grey: "white", slate: "blackBright" }
        : (() => {
            const tiers = light ? PRIORITY_LIGHT : PRIORITY_DARK
            return {
              ink: atDepth(tiers.ink, depth),
              grey: atDepth(tiers.grey, depth),
              slate: atDepth(tiers.slate, depth),
            }
          })(),
  )

  const stateGlyph: Record<StateName, string> = {
    success: glyphs.success,
    error: glyphs.error,
    warning: glyphs.warning,
    info: glyphs.info,
    pending: glyphs.pending,
    running: glyphs.spinner[0] ?? "",
  }

  const states = Object.fromEntries(
    (Object.keys(glyphStates) as StateName[]).map((state) => {
      const source = glyphStates[state]
      return [
        state,
        {
          glyph: stateGlyph[state],
          color: colorFor(source.color as ColorRole),
          spinner: source.spinner,
        },
      ]
    }),
  ) as Record<StateName, ThemeState>

  return {
    name,
    background,
    colorLevel,
    colors,
    softColors,
    tonalColors: tonal(false),
    tonalStrongColors: tonal(true),
    priorityColors,
    states,
    icons,
    glyphs,
    policy,
    provided: true,
  }
}

/**
 * The contract, as shui states it: a theme declares every required token.
 * Returns the missing ones — empty means valid. A role set to `undefined` is
 * declared (that is how `plain` says "no colour"); a role absent is not.
 */
export const validateTheme = (theme: Partial<Theme>): string[] => {
  const missing: string[] = []
  const check = (group: string, value: object | undefined, keys: readonly string[]) => {
    if (!value) {
      missing.push(group)
      return
    }
    for (const key of keys) if (!(key in value)) missing.push(`${group}.${key}`)
  }
  check("colors", theme.colors, COLOR_ROLES)
  check("softColors", theme.softColors, FILL_ROLES)
  check("tonalColors", theme.tonalColors, FILL_ROLES)
  check("tonalStrongColors", theme.tonalStrongColors, FILL_ROLES)
  check("priorityColors", theme.priorityColors, PRIORITY_ROLES)
  check("states", theme.states, Object.keys(glyphStates))
  check("glyphs", theme.glyphs, Object.keys(glyphSets.unicode))
  check("policy", theme.policy, [
    "color",
    "motion",
    "static",
    "screenReader",
    "unicode",
    "hyperlinks",
  ])
  if (theme.name !== undefined && !THEME_NAMES.includes(theme.name))
    missing.push(`name (${String(theme.name)})`)
  return missing
}

export type { ColorLevel, TerminalBackground, TerminalCapabilities, Env }

/**
 * A caller-supplied colour, honouring the policy: the colour itself when the
 * theme draws colour, `undefined` when it does not. Every component passes
 * colours that arrive as props through this, so `NO_COLOR` reaches them too.
 */
export const paint = (
  theme: Pick<Theme, "policy">,
  color: string | undefined,
): string | undefined => (theme.policy.color ? color : undefined)
