import React from "react"
import { Text, useStdout } from "ink"
import { colors } from "../tokens.js"
import { streamIsTTY } from "./motion.js"

type Env = Record<string, string | undefined>

const OSC = "\u001b]"
const BEL = "\u0007"
// Every C0 control, DEL and the C1 range: any one of them inside the URL or
// the label could close the OSC 8 early and smuggle a sequence of its own.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g

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
 * The OSC 8 sequence around `text`, with control characters stripped from
 * both halves so neither can end the sequence early.
 */
export const hyperlink = (url: string, text: string): string =>
  `${OSC}8;;${url.replace(CONTROL, "")}${BEL}${text.replace(CONTROL, "")}${OSC}8;;${BEL}`

type LinkProps = {
  /** Where the link goes. */
  url: string
  /** The visible text. Defaults to the URL itself. */
  children?: string
  /**
   * Override detection: `true` always emits OSC 8, `false` always prints the
   * `text (url)` fallback. Omit it to follow the terminal.
   */
  hyperlink?: boolean
}

/**
 * A clickable reference: OSC 8 in a terminal that draws it, with the visible
 * text in the `link` token and underlined. Where hyperlinks cannot show —
 * piped output, CI, a terminal that does not draw them — it prints
 * `text (url)` with the URL muted, so the address is never lost; a link whose
 * text is the URL prints once.
 */
export const Link = ({ url, children, hyperlink: force }: LinkProps) => {
  const { stdout } = useStdout()
  const text = children ?? url
  const live = force ?? supportsHyperlinks(streamIsTTY(stdout))
  if (live)
    return (
      <Text color={colors.link} underline>
        {hyperlink(url, text)}
      </Text>
    )
  return (
    <Text>
      <Text color={colors.link} underline>
        {text.replace(CONTROL, "")}
      </Text>
      {text === url ? null : (
        <Text color={colors.muted}> ({url.replace(CONTROL, "")})</Text>
      )}
    </Text>
  )
}
