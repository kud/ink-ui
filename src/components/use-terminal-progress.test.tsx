import React from "react"
import { Text } from "ink"
import { render } from "ink-testing-library"
import { afterEach, describe, it, expect, vi } from "vitest"
import {
  TERMINAL_PROGRESS_CLEAR,
  terminalProgressSequence,
  terminalProgressSupported,
  useTerminalProgress,
  type TerminalProgress,
} from "./use-terminal-progress.js"

describe("terminalProgressSequence", () => {
  it("writes the exact OSC 9;4 bytes for each state", () => {
    expect(terminalProgressSequence({ value: 42 })).toBe("\u001b]9;4;1;42\u0007")
    expect(terminalProgressSequence({ value: 30, state: "error" })).toBe("\u001b]9;4;2;30\u0007")
    expect(terminalProgressSequence({ state: "indeterminate", value: 80 })).toBe("\u001b]9;4;3;0\u0007")
    expect(terminalProgressSequence({ state: "warning" })).toBe("\u001b]9;4;4;100\u0007")
    expect(terminalProgressSequence({ state: "hidden" })).toBe("\u001b]9;4;0;0\u0007")
    expect(TERMINAL_PROGRESS_CLEAR).toBe("\u001b]9;4;0;0\u0007")
  })

  it("rounds and clamps the value to an integer 0–100", () => {
    expect(terminalProgressSequence({ value: 33.6 })).toBe("\u001b]9;4;1;34\u0007")
    expect(terminalProgressSequence({ value: 140 })).toBe("\u001b]9;4;1;100\u0007")
    expect(terminalProgressSequence({ value: -3 })).toBe("\u001b]9;4;1;0\u0007")
  })
})

describe("terminalProgressSupported", () => {
  it("is off when not a TTY, inside tmux, or in an unknown terminal", () => {
    expect(terminalProgressSupported(false, { WT_SESSION: "x" })).toBe(false)
    expect(terminalProgressSupported(true, { WT_SESSION: "x", TMUX: "/tmp/t" })).toBe(false)
    expect(terminalProgressSupported(true, { TERM_PROGRAM: "Apple_Terminal" })).toBe(false)
  })

  it("allows the terminals that draw it, version-gated where OSC 9 once meant notify", () => {
    expect(terminalProgressSupported(true, { WT_SESSION: "x" })).toBe(true)
    expect(terminalProgressSupported(true, { TERM_PROGRAM: "ghostty" })).toBe(true)
    expect(terminalProgressSupported(true, { TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.6.1" })).toBe(true)
    expect(terminalProgressSupported(true, { TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.5.14" })).toBe(false)
    expect(terminalProgressSupported(true, { TERM_PROGRAM: "kitty", TERM_PROGRAM_VERSION: "0.47.0" })).toBe(true)
    expect(terminalProgressSupported(true, { TERM_PROGRAM: "kitty", TERM_PROGRAM_VERSION: "0.42.2" })).toBe(false)
  })

  it("honours FORCE_TERMINAL_PROGRESS both ways", () => {
    expect(terminalProgressSupported(false, { FORCE_TERMINAL_PROGRESS: "1" })).toBe(true)
    expect(terminalProgressSupported(true, { FORCE_TERMINAL_PROGRESS: "0", WT_SESSION: "x" })).toBe(false)
  })
})

const Host = (props: TerminalProgress) => {
  useTerminalProgress(props)
  return <Text>body</Text>
}

// Ink's side channel writes the sequence ahead of a repaint of the current
// frame, so pull the sequences out of whatever reached the stream.
const writes = (frames: string[]) =>
  frames.flatMap((f) => f.match(/\u001b\]9;4;\d;\d+\u0007/g) ?? [])

describe("useTerminalProgress", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("writes nothing when stdout is not a TTY", () => {
    const { stdout, rerender, unmount } = render(<Host value={10} />)
    rerender(<Host value={60} />)
    unmount()
    expect(writes(stdout.frames)).toEqual([])
  })

  it("writes on change only, outside the rendered text, and clears on unmount", async () => {
    vi.stubEnv("FORCE_TERMINAL_PROGRESS", "1")
    const { stdout, rerender, unmount, lastFrame } = render(<Host value={10} />)
    rerender(<Host value={10} />)
    rerender(<Host value={60} />)
    rerender(<Host state="error" value={60} />)
    // Nothing reaches the laid-out frame: the sequence rides ahead of it.
    expect(lastFrame()?.endsWith("body")).toBe(true)
    unmount()
    expect(writes(stdout.frames)).toEqual([
      "\u001b]9;4;1;10\u0007",
      "\u001b]9;4;1;60\u0007",
      "\u001b]9;4;2;60\u0007",
      TERMINAL_PROGRESS_CLEAR,
    ])
  })

  it("clears when stood down with isActive, and does not clear twice", () => {
    vi.stubEnv("FORCE_TERMINAL_PROGRESS", "1")
    const { stdout, rerender, unmount } = render(<Host value={50} />)
    rerender(<Host value={50} isActive={false} />)
    unmount()
    expect(writes(stdout.frames)).toEqual(["\u001b]9;4;1;50\u0007", TERMINAL_PROGRESS_CLEAR])
  })

  it("clears on process exit if the app never unmounts", () => {
    vi.stubEnv("FORCE_TERMINAL_PROGRESS", "1")
    const before = process.listenerCount("exit")
    const { stdout } = render(<Host value={70} />)
    expect(process.listenerCount("exit")).toBe(before + 1)
    process.listeners("exit").at(-1)!.call(process, 0)
    expect(writes(stdout.frames).at(-1)).toBe(TERMINAL_PROGRESS_CLEAR)
  })
})
