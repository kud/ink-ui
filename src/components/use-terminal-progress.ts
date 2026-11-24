import { useEffect, useRef } from "react"
import { useStdout } from "ink"
import { streamIsTTY } from "./motion.js"

type Env = Record<string, string | undefined>

/**
 * What the terminal's tab or taskbar shows. `normal`, `error` and `warning`
 * carry a value; `indeterminate` pulses; `hidden` removes the indicator.
 * `warning` is OSC 9;4 state 4, which Windows Terminal calls "paused" and
 * draws in yellow.
 */
export type TerminalProgressState =
  | "normal"
  | "error"
  | "warning"
  | "indeterminate"
  | "hidden"

export type TerminalProgress = {
  /** 0–100. Required for `normal`; `error` and `warning` default to 100. */
  value?: number
  /** Defaults to `normal`. */
  state?: TerminalProgressState
  /**
   * Stand the indicator down without unmounting: `false` clears it. Defaults
   * to true.
   */
  isActive?: boolean
}

const STATE_CODE: Record<TerminalProgressState, number> = {
  hidden: 0,
  normal: 1,
  error: 2,
  indeterminate: 3,
  warning: 4,
}

/** OSC 9;4 with value 0 and state 0: what every supporting terminal reads as "remove". */
export const TERMINAL_PROGRESS_CLEAR = "\u001b]9;4;0;0\u0007"

/**
 * The exact OSC 9;4 sequence for a progress state:
 * `ESC ] 9 ; 4 ; <state> ; <value> BEL`, value an integer 0–100.
 */
export const terminalProgressSequence = ({
  value,
  state = "normal",
}: Pick<TerminalProgress, "value" | "state">): string => {
  if (state === "hidden") return TERMINAL_PROGRESS_CLEAR
  const fallback = state === "error" || state === "warning" ? 100 : 0
  const raw = state === "indeterminate" ? 0 : (value ?? fallback)
  const pct = Number.isFinite(raw) ? Math.round(Math.max(0, Math.min(100, raw))) : 0
  return `\u001b]9;4;${STATE_CODE[state]};${pct}\u0007`
}

const atLeast = (version: string | undefined, ...min: number[]): boolean => {
  const have = (version ?? "").split(".").map((p) => Number.parseInt(p, 10) || 0)
  for (let i = 0; i < min.length; i++) {
    const a = have[i] ?? 0
    if (a !== min[i]) return a > min[i]!
  }
  return true
}

/**
 * Whether the terminal draws OSC 9;4. This is an allow-list on purpose: older
 * iTerm2 and kitty read OSC 9 as "post a desktop notification", so guessing
 * wrong pops a notification reading `4;1;42` instead of doing nothing.
 * `FORCE_TERMINAL_PROGRESS=1` / `=0` override detection; tmux and screen are
 * never assumed, since neither passes the sequence through by default.
 */
export const terminalProgressSupported = (
  isTTY: boolean,
  env: Env = process.env,
): boolean => {
  const force = env["FORCE_TERMINAL_PROGRESS"]
  if (force !== undefined) return force !== "0" && force !== "false"
  if (!isTTY) return false
  if (env["TMUX"] || env["STY"]) return false
  if (env["WT_SESSION"]) return true
  if (env["ConEmuANSI"] === "ON") return true
  const version = env["TERM_PROGRAM_VERSION"]
  switch (env["TERM_PROGRAM"]) {
    case "iTerm.app":
      return atLeast(version, 3, 6)
    case "ghostty":
      return true
    case "kitty":
      return atLeast(version, 0, 47)
    default:
      return Boolean(env["GHOSTTY_RESOURCES_DIR"])
  }
}

/**
 * Mirrors progress into the terminal's own chrome — the tab's ring in
 * iTerm2 ≥ 3.6 and Ghostty, the taskbar button in Windows Terminal, kitty
 * ≥ 0.47 — through OSC 9;4.
 *
 * Each update goes out on Ink's `useStdout().write` side channel, never
 * through `<Text>`: it draws nothing on screen and must not take part in
 * layout. It is written only when it changes, cleared on unmount and on
 * process exit (straight to the stream — Ink has stopped writing by then),
 * and the hook
 * does nothing at all where the terminal would not understand it or stdout is
 * not a TTY.
 */
export const useTerminalProgress = ({
  value,
  state = "normal",
  isActive = true,
}: TerminalProgress): void => {
  const { stdout, write } = useStdout()
  const supported = terminalProgressSupported(streamIsTTY(stdout))
  const sequence =
    isActive && supported ? terminalProgressSequence({ value, state }) : null
  const shown = useRef(false)

  useEffect(() => {
    if (!supported) return
    if (sequence === null || sequence === TERMINAL_PROGRESS_CLEAR) {
      if (shown.current) write(TERMINAL_PROGRESS_CLEAR)
      shown.current = false
      return
    }
    write(sequence)
    shown.current = true
  }, [sequence, supported, write])

  useEffect(() => {
    if (!supported) return
    // Teardown goes straight to the stream. Ink marks itself unmounted before
    // React runs cleanups, and from then on its `write` is a silent no-op, so
    // the side channel cannot carry the last clear when the whole app is
    // leaving. The raw write is safe: OSC 9;4 draws nothing and moves no
    // cursor, so Ink's record of the frame stays true.
    const clear = () => {
      if (shown.current) stdout.write(TERMINAL_PROGRESS_CLEAR)
      shown.current = false
    }
    process.once("exit", clear)
    return () => {
      process.off("exit", clear)
      clear()
    }
  }, [supported, stdout])
}
