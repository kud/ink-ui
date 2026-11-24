/**
 * What the terminal can display — one answer, read by every component through
 * the theme instead of each component asking `process.env` for itself.
 *
 * Two layers. `detectEnvironment` reads only the environment and the streams,
 * synchronously, and is enough on its own for piped output, CI and every
 * terminal that never answers a query. `probeTerminal` adds one batch of
 * queries on top, and must run BEFORE Ink's `render()`: Ink takes stdin over
 * the moment it mounts, and a reply arriving after that is read as keystrokes.
 */
import { luminance, mix } from "./color-math.js"

export type ColorLevel = "none" | "ansi16" | "ansi256" | "truecolor"

export type TerminalBackground = "dark" | "light"

export type TerminalCapabilities = {
  /** How many colours the terminal draws. `none` for NO_COLOR, a pipe or `TERM=dumb`. */
  colorLevel: ColorLevel
  /** Light or dark ground, from OSC 11 when the terminal answered, else `COLORFGBG`, else `undefined`. */
  background: TerminalBackground | undefined
  /** The ground as `#rrggbb`, when the terminal reported it (OSC 11). */
  backgroundColor: string | undefined
  /** DEC mode 2026: the terminal can batch a frame and paint it atomically. */
  synchronizedOutput: boolean
  /** The kitty graphics protocol (kitty, WezTerm, Ghostty, iTerm2 ≥ 3.7.8). */
  kittyGraphics: boolean
  /** OSC 8 hyperlinks. */
  hyperlinks: boolean
  /** The locale is UTF-8. When false, every glyph falls back to the `ascii` set. */
  unicode: boolean
  /** stdout is a terminal. When false the output is static: no motion, no redraw. */
  isTTY: boolean
  /** Running under CI. */
  ci: boolean
  /** Ink's screen-reader mode (`INK_SCREEN_READER=true`). */
  screenReader: boolean
  /** The user asked for no motion (`NO_MOTION`, `REDUCE_MOTION`). */
  reducedMotion: boolean
  /** Inside tmux or screen, which answer queries on the terminal's behalf. */
  multiplexer: boolean
  /** The terminal's own name and version, from XTVERSION or `TERM_PROGRAM`. */
  terminal: { name: string | undefined; version: string | undefined }
  /** True when the query batch was sent and the terminal answered DA1. */
  probed: boolean
}

export type Env = Record<string, string | undefined>

type Stream = { isTTY?: boolean }

const isSet = (value: string | undefined): boolean =>
  value !== undefined && value !== ""

const FORCE_LEVEL: Record<string, ColorLevel> = {
  "0": "none",
  false: "none",
  "1": "ansi16",
  true: "ansi16",
  "": "ansi16",
  "2": "ansi256",
  "3": "truecolor",
}

const TRUECOLOR_PROGRAMS = new Set([
  "iTerm.app",
  "WezTerm",
  "ghostty",
  "vscode",
  "Hyper",
  "Tabby",
  "rio",
  "WarpTerminal",
])

const HYPERLINK_PROGRAMS = new Set([
  "iTerm.app",
  "WezTerm",
  "ghostty",
  "vscode",
  "Hyper",
  "Tabby",
  "rio",
  "WarpTerminal",
  "kitty",
])

/** Compare dotted versions numerically: `3.7.10` is after `3.7.8`. */
export const versionAtLeast = (
  version: string | undefined,
  minimum: string,
): boolean => {
  if (!version) return false
  const have = version.split(/[.\-+ ]/).map((part) => parseInt(part, 10))
  const want = minimum.split(".").map((part) => parseInt(part, 10))
  for (let i = 0; i < want.length; i++) {
    const a = Number.isNaN(have[i]) || have[i] === undefined ? 0 : have[i]!
    const b = want[i]!
    if (a !== b) return a > b
  }
  return true
}

const normaliseName = (name: string | undefined): string | undefined => {
  if (!name) return undefined
  const lower = name.toLowerCase()
  if (lower.startsWith("iterm")) return "iTerm.app"
  if (lower.startsWith("wezterm")) return "WezTerm"
  if (lower.startsWith("ghostty")) return "ghostty"
  if (lower.startsWith("kitty") || lower === "xterm-kitty") return "kitty"
  return name
}

const isUtf8 = (env: Env): boolean => {
  const locale = env["LC_ALL"] || env["LC_CTYPE"] || env["LANG"] || ""
  if (/utf-?8/i.test(locale)) return true
  // Windows Terminal and the macOS terminals are UTF-8 whatever the locale
  // says; an unset locale on Linux is the C locale, which is not.
  return isSet(env["WT_SESSION"]) || env["TERM_PROGRAM"] !== undefined
}

const backgroundFromColorFgBg = (
  value: string | undefined,
): TerminalBackground | undefined => {
  if (!value) return undefined
  const parts = value.split(";")
  const bg = parseInt(parts[parts.length - 1] ?? "", 10)
  if (Number.isNaN(bg)) return undefined
  // rxvt's convention: 0–6 and 8 are dark slots, 7 and 9–15 light ones.
  return bg === 7 || (bg >= 9 && bg <= 15) ? "light" : "dark"
}

const colorLevelFrom = (env: Env, isTTY: boolean): ColorLevel => {
  const force = env["FORCE_COLOR"]
  if (force !== undefined && force in FORCE_LEVEL) return FORCE_LEVEL[force]!
  if (isSet(env["NO_COLOR"])) return "none"
  if (!isTTY) return "none"
  const term = env["TERM"] ?? ""
  if (term === "dumb") return "none"
  const colorterm = (env["COLORTERM"] ?? "").toLowerCase()
  if (colorterm === "truecolor" || colorterm === "24bit") return "truecolor"
  if (TRUECOLOR_PROGRAMS.has(env["TERM_PROGRAM"] ?? "")) return "truecolor"
  if (isSet(env["WT_SESSION"])) return "truecolor"
  if (term === "xterm-kitty" || term.endsWith("-direct")) return "truecolor"
  if (term.includes("256")) return "ansi256"
  return "ansi16"
}

const kittyGraphicsFor = (
  name: string | undefined,
  version: string | undefined,
): boolean => {
  if (name === "kitty" || name === "WezTerm" || name === "ghostty") return true
  // iTerm2 implements the kitty graphics protocol from 3.7.8 on; earlier
  // releases only have their own inline-image escape.
  if (name === "iTerm.app") return versionAtLeast(version, "3.7.8")
  return false
}

const hyperlinksFor = (env: Env, name: string | undefined): boolean => {
  if (name && HYPERLINK_PROGRAMS.has(name)) return true
  if (isSet(env["WT_SESSION"])) return true
  if (isSet(env["KONSOLE_VERSION"])) return true
  const vte = parseInt(env["VTE_VERSION"] ?? "", 10)
  return !Number.isNaN(vte) && vte >= 5000
}

const parseVersion = (version: string | undefined): number[] =>
  (version ?? "").split(".").map((part) => Number.parseInt(part, 10) || 0)

const atLeast = (version: string | undefined, ...min: number[]): boolean => {
  const have = parseVersion(version)
  for (let i = 0; i < min.length; i++) {
    const a = have[i] ?? 0
    const b = min[i]!
    if (a !== b) return a > b
  }
  return true
}

/**
 * Whether the terminal behind `isTTY` draws OSC 8 hyperlinks. Piped output and
 * CI never do; `FORCE_HYPERLINK=1` / `=0` override everything, which is the
 * same switch `supports-hyperlinks` reads, so a user who has set it once for
 * another tool is not asked again.
 */
export const supportsHyperlinks = (
  isTTY: boolean,
  env: Env = process.env,
): boolean => {
  const force = env["FORCE_HYPERLINK"]
  if (force !== undefined) return force !== "0" && force !== "false"
  if (!isTTY) return false
  if (env["CI"] || env["TEAMCITY_VERSION"]) return false
  if (env["WT_SESSION"] || env["DOMTERM"] || env["KONSOLE_VERSION"])
    return true
  if (env["KITTY_WINDOW_ID"] || env["GHOSTTY_RESOURCES_DIR"]) return true
  const vte = Number.parseInt(env["VTE_VERSION"] ?? "", 10)
  if (vte >= 5000) return true
  const term = env["TERM"] ?? ""
  if (/^(xterm-kitty|xterm-ghostty|alacritty|foot|wezterm)/.test(term))
    return true
  const version = env["TERM_PROGRAM_VERSION"]
  switch (env["TERM_PROGRAM"]) {
    case "iTerm.app":
      return atLeast(version, 3, 1)
    case "WezTerm":
      return atLeast(version, 20200620)
    case "vscode":
      return atLeast(version, 1, 72)
    case "ghostty":
    case "Hyper":
    case "rio":
      return true
    default:
      return false
  }
}

/**
 * Everything the environment alone can say, synchronously. Precedence for
 * colour follows the conventions the rest of the ecosystem uses: `FORCE_COLOR`
 * beats `NO_COLOR`, which beats a pipe, which beats `TERM=dumb`, then the
 * truecolour hints (`COLORTERM`, a known `TERM_PROGRAM`, `*-direct`), then a
 * `TERM` naming 256 colours, then the 16-colour floor.
 */
export const detectEnvironment = (
  env: Env = process.env,
  stdout: Stream | undefined = process.stdout,
): TerminalCapabilities => {
  const isTTY = stdout?.isTTY === true
  const name = normaliseName(env["TERM_PROGRAM"] ?? (env["TERM"] === "xterm-kitty" ? "kitty" : undefined))
  const version = env["TERM_PROGRAM_VERSION"]
  const multiplexer =
    isSet(env["TMUX"]) || /^(screen|tmux)/.test(env["TERM"] ?? "")
  const ci = isSet(env["CI"])
  const interactive = isTTY && !ci
  return {
    colorLevel: colorLevelFrom(env, isTTY),
    background: backgroundFromColorFgBg(env["COLORFGBG"]),
    backgroundColor: undefined,
    // Without a reply nothing is assumed: a frame the terminal cannot batch
    // is still a frame, only less smooth.
    synchronizedOutput: false,
    kittyGraphics: interactive && !multiplexer && kittyGraphicsFor(name, version),
    hyperlinks: supportsHyperlinks(isTTY, env),
    unicode: isUtf8(env),
    isTTY,
    ci,
    screenReader: env["INK_SCREEN_READER"] === "true",
    reducedMotion: isSet(env["NO_MOTION"]) || isSet(env["REDUCE_MOTION"]),
    multiplexer,
    terminal: { name, version },
    probed: false,
  }
}

const ESC = "\u001B"

/**
 * The one batch of queries `probeTerminal` writes, in order: XTVERSION (the
 * terminal's name and version), DECRQM for mode 2026 (synchronized output),
 * OSC 11 (the background colour) and DA1 last. Every terminal answers DA1, and
 * terminals answer in order, so its reply is the signal that everything before
 * it has either arrived or never will.
 */
export const PROBE_QUERY =
  `${ESC}[>0q` + `${ESC}[?2026$p` + `${ESC}]11;?${ESC}\\` + `${ESC}[c`

export type ProbeReplies = {
  /** XTVERSION's text, e.g. `iTerm2 3.7.8` or `kitty(0.39.1)`. */
  xtversion: string | undefined
  /** DECRPM for 2026: `true` set or reset (supported), `false` not recognised. */
  synchronizedOutput: boolean | undefined
  /** OSC 11's colour as `#rrggbb`. */
  backgroundColor: string | undefined
  /** True when the DA1 reply was seen. */
  da1: boolean
}

const scaleChannel = (hex: string): number => {
  // OSC 11 reports 1–4 hex digits per channel; scale whatever came to 0–255.
  const max = Math.pow(16, hex.length) - 1
  return Math.round((parseInt(hex, 16) / max) * 255)
}

/**
 * Read whatever the terminal sent back. Pure: a test feeds it fake replies.
 * Unknown bytes are ignored, and a reply that never came stays `undefined` —
 * no answer means unsupported.
 */
export const parseProbeReplies = (input: string): ProbeReplies => {
  const xt = /\u001BP>\|([^\u001B\u0007]*)(?:\u001B\\|\u0007)/.exec(input)
  const decrpm = /\u001B\[\?2026;(\d)\$y/.exec(input)
  const osc =
    /\u001B\]11;rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})(?:\/[0-9a-f]{1,4})?(?:\u001B\\|\u0007)/i.exec(
      input,
    )
  const da1 = /\u001B\[\?[\d;]*c/.test(input)
  const mode = decrpm ? Number(decrpm[1]) : undefined
  return {
    xtversion: xt?.[1]?.trim() || undefined,
    // DECRPM: 1 set, 2 reset, 3 permanently set, 4 permanently reset, 0 not recognised.
    synchronizedOutput:
      mode === undefined ? undefined : mode === 1 || mode === 2 || mode === 3,
    backgroundColor: osc
      ? `#${[osc[1]!, osc[2]!, osc[3]!]
          .map((c) => scaleChannel(c).toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()}`
      : undefined,
    da1,
  }
}

/** Split an XTVERSION string into a name and a version: `kitty(0.39.1)`, `iTerm2 3.7.8`, `WezTerm 20240203-110809-5046fc22`. */
export const parseXtversion = (
  text: string | undefined,
): { name: string | undefined; version: string | undefined } => {
  if (!text) return { name: undefined, version: undefined }
  const match = /^([^\s(]+)[\s(]+([^)\s]+)\)?/.exec(text)
  if (!match) return { name: normaliseName(text), version: undefined }
  return { name: normaliseName(match[1]), version: match[2] }
}

/** Light or dark, from the ground's WCAG luminance against mid-grey. */
export const backgroundFromColor = (hex: string): TerminalBackground =>
  luminance(hex) > luminance(mix("#FFFFFF", "#000000", 0.5)) ? "light" : "dark"

/** Fold the replies into the environment's answer. Pure. */
export const applyProbeReplies = (
  base: TerminalCapabilities,
  replies: ProbeReplies,
): TerminalCapabilities => {
  const reported = parseXtversion(replies.xtversion)
  const name = reported.name ?? base.terminal.name
  const version = reported.version ?? base.terminal.version
  const interactive = base.isTTY && !base.ci
  return {
    ...base,
    background: replies.backgroundColor
      ? backgroundFromColor(replies.backgroundColor)
      : base.background,
    backgroundColor: replies.backgroundColor ?? base.backgroundColor,
    synchronizedOutput: replies.synchronizedOutput ?? false,
    kittyGraphics:
      interactive && !base.multiplexer && kittyGraphicsFor(name, version),
    hyperlinks: base.hyperlinks || (interactive && hyperlinksFor({}, name)),
    terminal: { name, version },
    probed: replies.da1,
  }
}

type ProbeInput = NodeJS.ReadableStream & {
  isTTY?: boolean
  isRaw?: boolean
  setRawMode?: (mode: boolean) => unknown
}

type ProbeOutput = { isTTY?: boolean; write: (chunk: string) => unknown }

export type ProbeOptions = {
  stdin?: ProbeInput
  stdout?: ProbeOutput
  env?: Env
  /** How long to wait for DA1, in milliseconds. 200 by default. */
  timeout?: number
}

/**
 * Ask the terminal what it can do, then return the environment's answer with
 * the replies folded in. Run it once, before Ink's `render()`:
 *
 * ```tsx
 * const capabilities = await probeTerminal()
 * render(<ThemeProvider capabilities={capabilities}><App /></ThemeProvider>)
 * ```
 *
 * It never throws and never hangs: no TTY on either side, CI, or a
 * multiplexer (tmux and screen answer on the terminal's behalf, so the reply
 * describes the wrong program) skip the queries and return the environment's
 * answer; a terminal that never answers is cut off after `timeout`; and stdin
 * is put back exactly as it was found — raw mode, flowing state, listeners.
 */
export const probeTerminal = async (
  options: ProbeOptions = {},
): Promise<TerminalCapabilities> => {
  const env = options.env ?? process.env
  const stdin = options.stdin ?? (process.stdin as ProbeInput)
  const stdout = options.stdout ?? (process.stdout as ProbeOutput)
  const timeout = options.timeout ?? 200
  const base = detectEnvironment(env, stdout)

  if (
    !base.isTTY ||
    stdin.isTTY !== true ||
    typeof stdin.setRawMode !== "function" ||
    base.ci ||
    base.multiplexer
  )
    return base

  const wasRaw = stdin.isRaw === true
  const wasPaused = stdin.isPaused()
  let received = ""

  const replies = await new Promise<ProbeReplies>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      if (timer) clearTimeout(timer)
      stdin.removeListener("data", onData)
      resolve(parseProbeReplies(received))
    }
    const onData = (chunk: Buffer | string) => {
      received += chunk.toString()
      if (/\u001B\[\?[\d;]*c/.test(received)) finish()
    }
    try {
      stdin.setRawMode!(true)
      stdin.on("data", onData)
      stdin.resume()
      timer = setTimeout(finish, timeout)
      stdout.write(PROBE_QUERY)
    } catch {
      finish()
    }
  })

  try {
    stdin.setRawMode!(wasRaw)
    if (wasPaused) stdin.pause()
  } catch {
    // A stream that refuses to be restored is the caller's to deal with;
    // the probe's answer is still good.
  }

  return applyProbeReplies(base, replies)
}

/**
 * Light or dark for a theme, from what the terminal reported: OSC 11 first,
 * then `COLORFGBG`, then dark — the ground every token was first tuned to.
 */
export const detectTheme = (
  capabilities: Pick<TerminalCapabilities, "background">,
): TerminalBackground => capabilities.background ?? "dark"
