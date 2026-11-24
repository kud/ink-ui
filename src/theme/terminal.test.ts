import { describe, it, expect } from "vitest"
import { EventEmitter } from "node:events"
import {
  applyProbeReplies,
  detectEnvironment,
  detectTheme,
  parseProbeReplies,
  parseXtversion,
  probeTerminal,
  versionAtLeast,
  PROBE_QUERY,
} from "./terminal.js"

const ESC = "\u001B"
const ST = `${ESC}\\`
const BEL = "\u0007"
const tty = { isTTY: true }
const UTF8 = { LANG: "en_GB.UTF-8" }

describe("detectEnvironment", () => {
  it("has no colour when piped", () => {
    expect(detectEnvironment({ ...UTF8 }, { isTTY: false }).colorLevel).toBe(
      "none",
    )
  })

  it("honours NO_COLOR, but only when it is non-empty", () => {
    expect(detectEnvironment({ NO_COLOR: "1" }, tty).colorLevel).toBe("none")
    expect(detectEnvironment({ NO_COLOR: "" }, tty).colorLevel).toBe("ansi16")
  })

  it("lets FORCE_COLOR win over NO_COLOR and a pipe", () => {
    expect(
      detectEnvironment({ NO_COLOR: "1", FORCE_COLOR: "3" }, { isTTY: false })
        .colorLevel,
    ).toBe("truecolor")
    expect(detectEnvironment({ FORCE_COLOR: "0" }, tty).colorLevel).toBe("none")
    expect(detectEnvironment({ FORCE_COLOR: "2" }, tty).colorLevel).toBe(
      "ansi256",
    )
  })

  it("reads the depth from COLORTERM, TERM_PROGRAM and TERM", () => {
    expect(detectEnvironment({ COLORTERM: "truecolor" }, tty).colorLevel).toBe(
      "truecolor",
    )
    expect(detectEnvironment({ COLORTERM: "24bit" }, tty).colorLevel).toBe(
      "truecolor",
    )
    expect(detectEnvironment({ TERM_PROGRAM: "iTerm.app" }, tty).colorLevel).toBe(
      "truecolor",
    )
    expect(detectEnvironment({ TERM: "xterm-256color" }, tty).colorLevel).toBe(
      "ansi256",
    )
    expect(detectEnvironment({ TERM: "xterm" }, tty).colorLevel).toBe("ansi16")
    expect(detectEnvironment({ TERM: "dumb" }, tty).colorLevel).toBe("none")
  })

  it("knows a UTF-8 locale from a C one", () => {
    expect(detectEnvironment({ LANG: "en_GB.UTF-8" }, tty).unicode).toBe(true)
    expect(detectEnvironment({ LC_ALL: "C" }, tty).unicode).toBe(false)
    expect(detectEnvironment({}, tty).unicode).toBe(false)
  })

  it("reads motion, CI, screen reader and multiplexers", () => {
    const env = detectEnvironment(
      { NO_MOTION: "1", CI: "true", INK_SCREEN_READER: "true", TMUX: "/tmp/t" },
      tty,
    )
    expect(env).toMatchObject({
      reducedMotion: true,
      ci: true,
      screenReader: true,
      multiplexer: true,
    })
    expect(detectEnvironment({ REDUCE_MOTION: "1" }, tty).reducedMotion).toBe(true)
    expect(detectEnvironment({ TERM: "screen-256color" }, tty).multiplexer).toBe(
      true,
    )
  })

  it("reads light or dark from COLORFGBG", () => {
    expect(detectEnvironment({ COLORFGBG: "0;15" }, tty).background).toBe(
      "light",
    )
    expect(detectEnvironment({ COLORFGBG: "15;0" }, tty).background).toBe("dark")
    expect(detectEnvironment({}, tty).background).toBeUndefined()
  })

  it("gives iTerm2 kitty graphics from 3.7.8, by version", () => {
    const at = (version: string) =>
      detectEnvironment(
        { TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: version },
        tty,
      ).kittyGraphics
    expect(at("3.7.7")).toBe(false)
    expect(at("3.7.8")).toBe(true)
    expect(at("3.7.10")).toBe(true)
    expect(at("3.8.0beta1")).toBe(true)
  })

  it("names hyperlink-capable terminals, never when piped", () => {
    expect(detectEnvironment({ TERM_PROGRAM: "ghostty" }, tty).hyperlinks).toBe(
      true,
    )
    expect(detectEnvironment({ VTE_VERSION: "7600" }, tty).hyperlinks).toBe(true)
    expect(detectEnvironment({ TERM_PROGRAM: "Apple_Terminal" }, tty).hyperlinks).toBe(
      false,
    )
    expect(
      detectEnvironment({ TERM_PROGRAM: "ghostty" }, { isTTY: false }).hyperlinks,
    ).toBe(false)
  })
})

describe("versionAtLeast", () => {
  it("compares numerically, not as strings", () => {
    expect(versionAtLeast("3.7.10", "3.7.8")).toBe(true)
    expect(versionAtLeast("3.10", "3.7.8")).toBe(true)
    expect(versionAtLeast("3.7", "3.7.8")).toBe(false)
    expect(versionAtLeast(undefined, "1")).toBe(false)
  })
})

describe("parseProbeReplies", () => {
  it("reads a full answer from iTerm2", () => {
    const replies = parseProbeReplies(
      `${ESC}P>|iTerm2 3.7.8${ST}` +
        `${ESC}[?2026;2$y` +
        `${ESC}]11;rgb:1a1a/1b1b/2727${ST}` +
        `${ESC}[?62;4c`,
    )
    expect(replies).toEqual({
      xtversion: "iTerm2 3.7.8",
      synchronizedOutput: true,
      backgroundColor: "#1A1B27",
      da1: true,
    })
  })

  it("reads two-digit channels and a BEL terminator", () => {
    expect(
      parseProbeReplies(`${ESC}]11;rgb:ff/ff/ff${BEL}${ESC}[?1;2c`)
        .backgroundColor,
    ).toBe("#FFFFFF")
  })

  it("treats DECRPM 0 and 4 as unsupported", () => {
    expect(parseProbeReplies(`${ESC}[?2026;0$y`).synchronizedOutput).toBe(false)
    expect(parseProbeReplies(`${ESC}[?2026;4$y`).synchronizedOutput).toBe(false)
  })

  it("leaves what never came undefined: no answer means unsupported", () => {
    expect(parseProbeReplies(`${ESC}[?1;2c`)).toEqual({
      xtversion: undefined,
      synchronizedOutput: undefined,
      backgroundColor: undefined,
      da1: true,
    })
    expect(parseProbeReplies("").da1).toBe(false)
  })

  it("ignores bytes it does not understand", () => {
    expect(
      parseProbeReplies(`garbage${ESC}[?2026;1$yq${ESC}[?64;1c`)
        .synchronizedOutput,
    ).toBe(true)
  })
})

describe("parseXtversion", () => {
  it("splits the common forms", () => {
    expect(parseXtversion("kitty(0.39.1)")).toEqual({
      name: "kitty",
      version: "0.39.1",
    })
    expect(parseXtversion("iTerm2 3.7.8")).toEqual({
      name: "iTerm.app",
      version: "3.7.8",
    })
    expect(parseXtversion("WezTerm 20240203-110809-5046fc22").name).toBe(
      "WezTerm",
    )
  })
})

describe("applyProbeReplies and detectTheme", () => {
  const base = detectEnvironment({ ...UTF8, COLORTERM: "truecolor" }, tty)

  it("takes light or dark from OSC 11", () => {
    const light = applyProbeReplies(
      base,
      parseProbeReplies(`${ESC}]11;rgb:fafa/fafa/fafa${ST}${ESC}[?1c`),
    )
    expect(light.background).toBe("light")
    expect(detectTheme(light)).toBe("light")
    const dark = applyProbeReplies(
      base,
      parseProbeReplies(`${ESC}]11;rgb:1a1a/1b1b/2727${ST}${ESC}[?1c`),
    )
    expect(detectTheme(dark)).toBe("dark")
  })

  it("defaults to dark when nothing answered", () => {
    expect(detectTheme(applyProbeReplies(base, parseProbeReplies("")))).toBe(
      "dark",
    )
  })

  it("names the terminal and its graphics from XTVERSION", () => {
    const kitty = applyProbeReplies(
      base,
      parseProbeReplies(`${ESC}P>|kitty(0.39.1)${ST}${ESC}[?62c`),
    )
    expect(kitty).toMatchObject({
      terminal: { name: "kitty", version: "0.39.1" },
      kittyGraphics: true,
      hyperlinks: true,
      probed: true,
    })
    const oldIterm = applyProbeReplies(
      base,
      parseProbeReplies(`${ESC}P>|iTerm2 3.7.7${ST}${ESC}[?62c`),
    )
    expect(oldIterm.kittyGraphics).toBe(false)
  })
})

class FakeStdin extends EventEmitter {
  isTTY = true
  isRaw = false
  paused = true
  rawCalls: boolean[] = []
  setRawMode(mode: boolean) {
    this.isRaw = mode
    this.rawCalls.push(mode)
    return this
  }
  resume() {
    this.paused = false
    return this
  }
  pause() {
    this.paused = true
    return this
  }
  isPaused() {
    return this.paused
  }
}

const fakeOutput = (answer?: (stdin: FakeStdin) => void, stdin?: FakeStdin) => {
  const written: string[] = []
  return {
    written,
    stream: {
      isTTY: true,
      write: (chunk: string) => {
        written.push(chunk)
        if (answer && stdin) setTimeout(() => answer(stdin), 5)
        return true
      },
    },
  }
}

const probe = (stdin: FakeStdin, out: { isTTY: boolean; write: (c: string) => boolean }, env: Record<string, string> = { ...UTF8, COLORTERM: "truecolor" }) =>
  probeTerminal({
    stdin: stdin as never,
    stdout: out,
    env,
    timeout: 50,
  })

describe("probeTerminal", () => {
  it("writes one batch ending with DA1 and reads the answers", async () => {
    const stdin = new FakeStdin()
    const out = fakeOutput((s) => {
      s.emit("data", Buffer.from(`${ESC}P>|WezTerm 20240203${ST}${ESC}[?2026;2$y`))
      s.emit("data", Buffer.from(`${ESC}]11;rgb:ffff/ffff/ffff${ST}${ESC}[?62;22c`))
    }, stdin)
    const result = await probe(stdin, out.stream)
    expect(out.written).toEqual([PROBE_QUERY])
    expect(PROBE_QUERY.endsWith(`${ESC}[c`)).toBe(true)
    expect(result).toMatchObject({
      probed: true,
      synchronizedOutput: true,
      background: "light",
      kittyGraphics: true,
      terminal: { name: "WezTerm" },
    })
  })

  it("gives up after the timeout and restores stdin exactly", async () => {
    const stdin = new FakeStdin()
    const out = fakeOutput()
    const started = Date.now()
    const result = await probe(stdin, out.stream)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(result.probed).toBe(false)
    expect(result.synchronizedOutput).toBe(false)
    expect(stdin.rawCalls).toEqual([true, false])
    expect(stdin.isPaused()).toBe(true)
    expect(stdin.listenerCount("data")).toBe(0)
  })

  it("never queries under tmux, CI or a pipe", async () => {
    for (const [env, outTTY] of [
      [{ ...UTF8, TMUX: "/tmp/tmux-1/default" }, true],
      [{ ...UTF8, CI: "true" }, true],
      [{ ...UTF8 }, false],
    ] as const) {
      const stdin = new FakeStdin()
      const out = fakeOutput()
      const result = await probe(stdin, { ...out.stream, isTTY: outTTY }, env)
      expect(out.written).toEqual([])
      expect(stdin.rawCalls).toEqual([])
      expect(result.probed).toBe(false)
    }
  })
})
