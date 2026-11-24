import React, { createContext, useContext, useMemo } from "react"
import type { ReactNode } from "react"
import { useIsScreenReaderEnabled } from "ink"
import { getIconMode } from "../icon-mode.js"
import { createTheme, type Theme, type ThemeName } from "./theme.js"
import type { GlyphSetName } from "./glyph-set.js"
import {
  detectEnvironment,
  type Env,
  type TerminalBackground,
  type TerminalCapabilities,
} from "./terminal.js"

const ThemeContext = createContext<Theme | null>(null)

export type ThemeProviderProps = {
  /** A theme you resolved yourself with `createTheme`. Wins over every other prop. */
  theme?: Theme
  /** What `probeTerminal()` returned. Defaults to the environment alone. */
  capabilities?: TerminalCapabilities
  /** `default`, `minimal` or `plain`. `plain` is forced when colour is off. */
  name?: ThemeName
  /** Light or dark. Defaults to `detectTheme(capabilities)`. */
  background?: TerminalBackground
  /** Glyph set. Defaults to `ascii` without UTF-8, else the icon mode. */
  icons?: GlyphSetName
  children: ReactNode
}

/**
 * The single source of truth for what the terminal can show. Mount it once,
 * around the whole app, with what `probeTerminal()` found:
 *
 * ```tsx
 * const capabilities = await probeTerminal()
 * render(
 *   <ThemeProvider capabilities={capabilities}>
 *     <App />
 *   </ThemeProvider>,
 * )
 * ```
 *
 * It binds no keys and draws nothing; it only answers `useTheme()`.
 */
export const ThemeProvider = ({
  theme,
  capabilities,
  name,
  background,
  icons,
  children,
}: ThemeProviderProps) => {
  const value = useMemo(
    () => theme ?? createTheme({ capabilities, name, background, icons }),
    [theme, capabilities, name, background, icons],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * The theme without a provider: exactly what every component drew before
 * themes existed — the dark truecolour palette, unicode glyphs, chalk left to
 * downsample — except that it now honours the global policy from the
 * environment everywhere rather than in three places: `NO_COLOR` turns colour
 * off (`plain`), `NO_MOTION` / `REDUCE_MOTION`, a non-TTY stdout and
 * `INK_SCREEN_READER` stop motion. Locale and terminal detection need a
 * provider, so an app that never mounts one never changes glyphs under its
 * users.
 */
export const ambientTheme = (
  env: Env = process.env,
  stdout: { isTTY?: boolean } | undefined = process.stdout,
): Theme => {
  const detected = detectEnvironment(env, stdout)
  const capabilities: TerminalCapabilities = {
    ...detected,
    colorLevel:
      env["NO_COLOR"] !== undefined && env["NO_COLOR"] !== ""
        ? "none"
        : "truecolor",
    background: "dark",
    unicode: true,
  }
  const key = [
    capabilities.colorLevel,
    capabilities.isTTY,
    capabilities.reducedMotion,
    capabilities.screenReader,
    getIconMode(),
  ].join("|")
  const cached = cache.get(key)
  if (cached) return cached
  const theme = { ...createTheme({ capabilities }), provided: false }
  cache.set(key, theme)
  return theme
}

const cache = new Map<string, Theme>()

/**
 * The resolved theme: colours at the terminal's depth, glyphs, and the policy
 * (`colour`, `motion`, `static`, `screenReader`, `unicode`). Every component
 * reads this instead of `process.env`. Without a `ThemeProvider` it returns
 * `ambientTheme()`. Ink's own screen-reader switch (`render(…, {
 * isScreenReaderEnabled: true })`) is honoured either way.
 */
export const useTheme = (): Theme => {
  const provided = useContext(ThemeContext)
  const inkScreenReader = useIsScreenReaderEnabled()
  const theme = provided ?? ambientTheme()
  if (!inkScreenReader || theme.policy.screenReader) return theme
  return {
    ...theme,
    policy: { ...theme.policy, screenReader: true, motion: false },
  }
}
