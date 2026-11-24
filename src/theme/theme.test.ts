import { describe, it, expect, afterEach } from "vitest"
import { colors as glyphColors, states as glyphStates } from "@kud/glyphs"
import {
  createTheme,
  validateTheme,
  paint,
  COLOR_ROLES,
  FILL_ROLES,
  THEME_NAMES,
  type ColorRole,
  type Theme,
} from "./theme.js"
import { detectEnvironment, type TerminalCapabilities } from "./terminal.js"
import { ansi16Name, contrast, hexToAnsi256 } from "./color-math.js"
import { colors, palette, softColors, tonalColors } from "../tokens.js"
import { setIconMode } from "../icon-mode.js"

afterEach(() => setIconMode("text"))

const caps = (
  overrides: Partial<TerminalCapabilities> = {},
): TerminalCapabilities => ({
  ...detectEnvironment(
    { COLORTERM: "truecolor", LANG: "en_GB.UTF-8" },
    { isTTY: true },
  ),
  ...overrides,
})

const GLYPH_ROLES = Object.keys(glyphColors) as Array<
  keyof typeof glyphColors & ColorRole
>

const ansi256Index = (value: string | undefined): number => {
  const match = /^ansi256\((\d+)\)$/.exec(value ?? "")
  if (!match) throw new Error(`not an ansi256 colour: ${value}`)
  return Number(match[1])
}

describe("tokens are derived from @kud/glyphs, never hand-copied", () => {
  it("every glyphs token with a hex is that hex in the dark truecolour theme", () => {
    const theme = createTheme({ capabilities: caps() })
    for (const role of GLYPH_ROLES) {
      const hex = glyphColors[role].hex
      if (hex !== null) expect(theme.colors[role], role).toBe(hex)
    }
  })

  it("the public `colors` and `palette` carry the same glyphs hexes", () => {
    for (const role of GLYPH_ROLES) {
      const hex = glyphColors[role].hex
      if (hex !== null) expect(colors[role], role).toBe(hex)
    }
    expect(palette.orange).toBe(glyphColors.accent.hex)
    expect(palette.cyan).toBe(glyphColors.info.hex)
    expect(palette.grey).toBe(glyphColors.secondary.hex)
  })

  it("the dark truecolour theme is exactly the legacy `colors`", () => {
    const theme = createTheme({ capabilities: caps() })
    for (const role of COLOR_ROLES)
      expect(theme.colors[role], role).toBe(colors[role])
    for (const role of FILL_ROLES) {
      expect(theme.softColors[role], role).toBe(softColors[role])
      expect(theme.tonalColors[role], role).toEqual(tonalColors[role])
    }
  })

  it("glyphs' null hex for muted keeps the measured dimColor value", () => {
    expect(glyphColors.muted.hex).toBeNull()
    expect(createTheme({ capabilities: caps() }).colors.muted).toBe("#75767E")
  })

  it("the 256-colour layer uses glyphs' hand-picked index, and downsamples the rest", () => {
    const theme = createTheme({
      capabilities: caps({ colorLevel: "ansi256" }),
    })
    for (const role of GLYPH_ROLES)
      expect(ansi256Index(theme.colors[role]), role).toBe(
        glyphColors[role].ansi256,
      )
    expect(ansi256Index(theme.colors.ticket)).toBe(hexToAnsi256(palette.yellow))
    expect(ansi256Index(theme.colors.pr)).toBe(glyphColors.accent.ansi256)
  })

  it("the 16-colour layer is glyphs' ansi16 floor, by name", () => {
    for (const theme of [
      createTheme({ capabilities: caps({ colorLevel: "ansi16" }) }),
      createTheme({ name: "minimal", capabilities: caps() }),
    ])
      for (const role of GLYPH_ROLES)
        expect(theme.colors[role], role).toBe(
          ansi16Name(glyphColors[role].ansi16),
        )
  })

  it("states come from glyphs' state map", () => {
    const theme = createTheme({ capabilities: caps() })
    expect(Object.keys(theme.states).sort()).toEqual(
      Object.keys(glyphStates).sort(),
    )
    expect(theme.states.success).toEqual({
      glyph: "✓",
      color: glyphColors.success.hex,
      spinner: false,
    })
    expect(theme.states.running.spinner).toBe(true)
    expect(theme.states.running.color).toBe(glyphColors.accent.hex)
  })
})

describe("the three levels", () => {
  it("every level, light and dark, satisfies the contract", () => {
    for (const name of THEME_NAMES)
      for (const background of ["dark", "light"] as const)
        for (const colorLevel of ["ansi16", "ansi256", "truecolor"] as const)
          expect(
            validateTheme(
              createTheme({
                name,
                background,
                capabilities: caps({ colorLevel }),
              }),
            ),
            `${name} ${background} ${colorLevel}`,
          ).toEqual([])
  })

  it("names the tokens a broken theme is missing, as shui does", () => {
    const theme = createTheme({ capabilities: caps() })
    const { accent: _accent, ...rest } = theme.colors
    const broken: Partial<Theme> = { ...theme, colors: rest as Theme["colors"] }
    expect(validateTheme(broken)).toEqual(["colors.accent"])
    expect(validateTheme({ ...theme, name: "neon" as never })).toEqual([
      "name (neon)",
    ])
    const { policy: _policy, ...noPolicy } = theme
    expect(validateTheme(noPolicy)).toContain("policy")
  })

  it("plain draws no colour at all", () => {
    const theme = createTheme({ name: "plain", capabilities: caps() })
    expect(Object.values(theme.colors).every((c) => c === undefined)).toBe(true)
    expect(Object.values(theme.softColors).every((c) => c === undefined)).toBe(
      true,
    )
    expect(theme.policy.color).toBe(false)
  })

  it("no colour from the terminal forces plain whatever was asked", () => {
    const theme = createTheme({
      name: "default",
      capabilities: caps({ colorLevel: "none" }),
    })
    expect(theme.name).toBe("plain")
    expect(theme.colors.accent).toBeUndefined()
  })

  it("minimal has no tint for a tonal chip, only its hue", () => {
    const theme = createTheme({ name: "minimal", capabilities: caps() })
    expect(theme.tonalColors.accent).toEqual({
      fill: undefined,
      ink: ansi16Name(glyphColors.accent.ansi16),
    })
  })

  it("paint drops a caller's colour when the theme draws none", () => {
    expect(paint(createTheme({ capabilities: caps() }), "#123456")).toBe(
      "#123456",
    )
    expect(
      paint(createTheme({ name: "plain", capabilities: caps() }), "#123456"),
    ).toBeUndefined()
  })
})

describe("the light variant", () => {
  const light = createTheme({ background: "light", capabilities: caps() })
  const TEXT_ROLES: ColorRole[] = [
    "accent",
    "secondary",
    "muted",
    "success",
    "error",
    "warning",
    "info",
    "group",
    "ticket",
    "pr",
    "link",
    "added",
    "removed",
    "pending",
  ]

  it("every role read as text clears 4.5:1 on white", () => {
    for (const role of TEXT_ROLES)
      expect(
        contrast(light.colors[role]!, "#FFFFFF"),
        `${role} ${light.colors[role]}`,
      ).toBeGreaterThanOrEqual(4.5)
  })

  it("keeps the never-share-a-hue pairs apart at 256 colours", () => {
    const at256 = (role: ColorRole) => hexToAnsi256(light.colors[role]!)
    const pairs: Array<[ColorRole, ColorRole]> = [
      ["accent", "ticket"],
      ["ticket", "pr"],
      ["success", "warning"],
      ["ticket", "success"],
      ["ticket", "warning"],
      ["ticket", "error"],
      ["pr", "warning"],
      ["pr", "error"],
      ["info", "link"],
      ["pending", "accent"],
      ["pending", "warning"],
    ]
    for (const [a, b] of pairs)
      expect(at256(a), `${a} vs ${b}`).not.toBe(at256(b))
  })

  it("its grounds sit just below the paper, never as ink", () => {
    for (const role of ["track", "selection"] as const)
      expect(contrast(light.colors[role]!, "#FFFFFF")).toBeLessThan(1.5)
  })

  it("is chosen from the terminal's reported background", () => {
    expect(createTheme({ capabilities: caps({ background: "light" }) }).background).toBe("light")
    expect(createTheme({ capabilities: caps() }).background).toBe("dark")
  })
})

describe("glyphs follow the locale and the icon mode", () => {
  it("is ascii, mirroring shui's set, when the locale is not UTF-8", () => {
    const theme = createTheme({ capabilities: caps({ unicode: false }) })
    expect(theme.icons).toBe("ascii")
    expect([
      theme.glyphs.success,
      theme.glyphs.error,
      theme.glyphs.warning,
      theme.glyphs.info,
      theme.glyphs.pointer,
    ]).toEqual(["+", "x", "!", "i", ">"])
    for (const value of Object.values(theme.glyphs).flat())
      expect(/^[\x20-\x7e]*$/.test(String(value)), String(value)).toBe(true)
  })

  it("follows the nerd icon mode on a UTF-8 terminal", () => {
    setIconMode("nerd")
    expect(createTheme({ capabilities: caps() }).icons).toBe("nerd")
  })
})

describe("the policy", () => {
  it("turns motion off for reduced motion, a pipe and a screen reader", () => {
    expect(createTheme({ capabilities: caps() }).policy.motion).toBe(true)
    expect(
      createTheme({ capabilities: caps({ reducedMotion: true }) }).policy.motion,
    ).toBe(false)
    expect(
      createTheme({ capabilities: caps({ isTTY: false }) }).policy,
    ).toMatchObject({ motion: false, static: true })
    expect(
      createTheme({ capabilities: caps({ screenReader: true }) }).policy,
    ).toMatchObject({ motion: false, screenReader: true })
  })
})
