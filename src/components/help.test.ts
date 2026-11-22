import { readFileSync } from "node:fs"
import { describe, it, expect } from "vitest"
import { renderHelp } from "./render-help.js"
import { detectHelpColorMode, layoutHelp, normaliseDescription } from "./help-layout.js"
import type { HelpColorMode, HelpSpec } from "./help-layout.js"

const deploy = JSON.parse(
  readFileSync(new URL("./help.golden/deploy.json", import.meta.url), "utf8"),
) as HelpSpec

const ESC = "\u001b["
const plain = (spec: HelpSpec, columns = 80) => renderHelp(spec, { columns, mode: "plain" })
const lines = (spec: HelpSpec, columns = 80) => plain(spec, columns).split("\n")

describe("renderHelp goldens", () => {
  const cases: [string, number, HelpColorMode][] = [
    ["tty", 80, "truecolor"],
    ["ansi256", 80, "ansi256"],
    ["ansi16", 80, "ansi16"],
    ["no-color", 80, "monochrome"],
    ["piped", 80, "plain"],
    ["narrow", 50, "plain"],
  ]
  for (const [name, columns, mode] of cases) {
    it(`matches deploy.${name}.txt`, async () => {
      await expect(renderHelp(deploy, { columns, mode })).toMatchFileSnapshot(`./help.golden/deploy.${name}.txt`)
    })
  }
})

describe("renderHelp layout", () => {
  it("puts every description at column 26", () => {
    const row = lines(deploy).find((l) => l.includes("Log every request"))!
    expect(row.indexOf("Log every request")).toBe(26)
    expect(row.startsWith("  -v, --verbose")).toBe(true)
  })

  it("moves a description under a name longer than 22 columns", () => {
    const all = lines(deploy)
    const at = all.findIndex((l) => l.includes("--max-parallel-uploads"))
    expect(all[at]!.trimEnd()).toBe("      --max-parallel-uploads <n>")
    expect(all[at + 1]!.indexOf("Upload at most")).toBe(26)
  })

  it("keeps a name of exactly 22 columns on its own line", () => {
    const spec: HelpSpec = { name: "t", commands: [{ name: "x".repeat(22), description: "Fits" }] }
    expect(lines(spec)).toContain(`  ${"x".repeat(22)}  Fits`)
  })

  it("hangs wrapped descriptions under column 26 and never passes 80", () => {
    const all = lines(deploy, 200)
    const at = all.findIndex((l) => l.includes("--region"))
    expect(all[at + 1]!.slice(0, 26).trim()).toBe("")
    for (const l of all) expect(l.length).toBeLessThanOrEqual(80)
  })

  it("shifts long-only options by four so the -- align", () => {
    const all = lines(deploy)
    expect(all.find((l) => l.includes("--dry-run"))!.indexOf("--")).toBe(6)
    expect(all.find((l) => l.includes("--verbose"))!.indexOf("--")).toBe(6)
  })

  it("does not shift when no option has a short form", () => {
    const spec: HelpSpec = { name: "t", options: [{ name: "--all", description: "Everything" }] }
    expect(lines(spec)).toContain("  --all                   Everything")
  })

  it("drops descriptions under the name at indent 6 below 60 columns", () => {
    const all = lines(deploy, 59)
    const at = all.findIndex((l) => l.includes("--verbose"))
    expect(all[at]).toBe("  -v, --verbose")
    expect(all[at + 1]).toBe("      Log every request")
  })

  it("orders sections and omits the empty ones", () => {
    const headings = lines(deploy).filter((l) => /^[A-Z][A-Z ]+$/.test(l))
    expect(headings).toEqual(["USAGE", "COMMANDS", "ARGUMENTS", "OPTIONS", "EXAMPLES", "ENVIRONMENT", "SEE ALSO"])
    expect(plain({ name: "t", options: [{ name: "-a", description: "A" }] })).toBe("t\n\nOPTIONS\n  -a                      A\n")
  })

  it("puts one blank line before each heading and none trailing", () => {
    const all = lines(deploy)
    for (const [i, l] of all.entries()) if (/^[A-Z][A-Z ]+$/.test(l)) expect(all[i - 1]).toBe("")
    expect(plain(deploy).endsWith("\n")).toBe(true)
    expect(plain(deploy).endsWith("\n\n")).toBe(false)
    for (const l of all) expect(l).toBe(l.trimEnd())
  })

  it("normalises descriptions: capital first letter, no final full stop", () => {
    expect(normaliseDescription("print the  plan.")).toBe("Print the plan")
    expect(normaliseDescription("wait…")).toBe("Wait…")
    expect(normaliseDescription("and so on...")).toBe("And so on...")
    expect(normaliseDescription("--flag stays")).toBe("--flag stays")
  })

  it("draws no glyphs beyond the text it was given", () => {
    expect(plain(deploy)).not.toMatch(/[✓✗⚠ℹ●❯▲▼]/u)
  })
})

describe("renderHelp encoding", () => {
  const tty = renderHelp(deploy, { columns: 80, mode: "truecolor" })
  const mono = renderHelp(deploy, { columns: 80, mode: "monochrome" })

  it("paints headings bold in the accent and nothing else in it", () => {
    expect(tty).toContain(`${ESC}1;38;2;255;140;0mUSAGE${ESC}0m`)
    expect(tty.split("38;2;255;140;0").length - 1).toBe(7)
  })

  it("draws names bold in the normal colour and placeholders in secondary", () => {
    expect(tty).toContain(`${ESC}1m--port${ESC}0m ${ESC}38;2;153;153;153m<number>${ESC}0m`)
  })

  it("never wraps a description word in an escape", () => {
    const row = tty.split("\n").find((l) => l.includes("Log every request"))!
    expect(row.endsWith("Log every request")).toBe(true)
  })

  it("underlines see-also links in the link colour", () => {
    expect(tty).toContain(`${ESC}4;38;2;130;170;255mhttps://kud.io/projects/deploy${ESC}0m`)
  })

  it("keeps bold and underline but drops colour under NO_COLOR", () => {
    expect(mono).toContain(`${ESC}1mUSAGE${ESC}0m`)
    expect(mono).toContain(`${ESC}4mhttps://kud.io/projects/deploy${ESC}0m`)
    expect(mono).not.toMatch(/\u001b\[[0-9;]*3[0-9];/)
    expect(mono).not.toContain("38;")
  })

  it("emits no escapes when piped", () => {
    expect(plain(deploy)).not.toContain("\u001b")
  })
})

describe("detectHelpColorMode", () => {
  it("is plain when the stream is not a TTY, whatever the env says", () => {
    expect(detectHelpColorMode({ isTTY: false }, { COLORTERM: "truecolor" })).toBe("plain")
  })
  it("is monochrome when NO_COLOR is set and non-empty", () => {
    expect(detectHelpColorMode({ isTTY: true }, { NO_COLOR: "1", COLORTERM: "truecolor" })).toBe("monochrome")
    expect(detectHelpColorMode({ isTTY: true }, { NO_COLOR: "", COLORTERM: "truecolor" })).toBe("truecolor")
  })
  it("reads the depth from COLORTERM, then TERM", () => {
    expect(detectHelpColorMode({ isTTY: true }, { COLORTERM: "24bit" })).toBe("truecolor")
    expect(detectHelpColorMode({ isTTY: true }, { TERM: "xterm-256color" })).toBe("ansi256")
    expect(detectHelpColorMode({ isTTY: true }, { TERM: "xterm" })).toBe("ansi16")
  })
  it("is what renderHelp uses when no mode is forced", () => {
    const out = renderHelp(deploy, { stream: { isTTY: true, columns: 80 }, env: { NO_COLOR: "1" } })
    expect(out).toBe(renderHelp(deploy, { columns: 80, mode: "monochrome" }))
  })
})

describe("layoutHelp", () => {
  it("clamps to 80 columns and treats a missing width as 80", () => {
    expect(layoutHelp(deploy, 200)).toEqual(layoutHelp(deploy, 80))
    expect(layoutHelp(deploy, undefined)).toEqual(layoutHelp(deploy, 80))
  })
})
