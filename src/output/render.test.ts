import { describe, expect, it } from "vitest"
import {
  empty,
  keyValue,
  list,
  note,
  renderOutput,
  resolveOutput,
  result,
  section,
  success,
  warning,
  writeOutput,
} from "./index.js"

const doc = result({
  title: "acme deploy",
  blocks: [
    success("Deployed api-gateway to staging"),
    section("Release", [keyValue({ Version: "1.4.2", Region: "eu-west-1", Commit: "a1b2c3d" })]),
    section("Changes", [
      list(["Retry a declined card", "Address form keeps its state when the page reloads after a network failure"]),
    ]),
    section("Steps", [list(["Build", "Push"], { ordered: true })]),
    warning("Two health checks are slow"),
    empty("No pending migrations", "Run acme migrate --plan to preview the next one."),
    note("Logs: https://example.com/acme/logs/12345"),
  ],
})

const ESC = "\x1b"

describe("renderOutput — plain", () => {
  it("lays out every primitive with no escape codes", () => {
    expect(renderOutput(doc, { target: "plain" })).toBe(
      [
        "acme deploy",
        "",
        "✓ Deployed api-gateway to staging",
        "",
        "Release",
        "  Version  1.4.2",
        "  Region   eu-west-1",
        "  Commit   a1b2c3d",
        "",
        "Changes",
        "  ● Retry a declined card",
        "  ● Address form keeps its state when the page reloads after a network failure",
        "",
        "Steps",
        "  1. Build",
        "  2. Push",
        "",
        "⚠ Two health checks are slow",
        "◌ No pending migrations",
        "  Run acme migrate --plan to preview the next one.",
        "Logs: https://example.com/acme/logs/12345",
        "",
      ].join("\n"),
    )
  })

  it("wraps with hanging indents and stacks key/value rows at a narrow width", () => {
    expect(renderOutput(doc, { target: "plain", width: 30 })).toBe(
      [
        "acme deploy",
        "",
        "✓ Deployed api-gateway to",
        "  staging",
        "",
        "Release",
        "  Version",
        "    1.4.2",
        "  Region",
        "    eu-west-1",
        "  Commit",
        "    a1b2c3d",
        "",
        "Changes",
        "  ● Retry a declined card",
        "  ● Address form keeps its",
        "    state when the page",
        "    reloads after a network",
        "    failure",
        "",
        "Steps",
        "  1. Build",
        "  2. Push",
        "",
        "⚠ Two health checks are slow",
        "◌ No pending migrations",
        "  Run acme migrate --plan to",
        "  preview the next one.",
        "Logs:",
        "https://example.com/acme/logs/12345",
        "",
      ].join("\n"),
    )
  })

  it("is deterministic and never leaves trailing whitespace", () => {
    const once = renderOutput(doc, { target: "plain", width: 40 })
    expect(renderOutput(doc, { target: "plain", width: 40 })).toBe(once)
    expect(once.split("\n").some((line) => line !== line.trimEnd())).toBe(false)
    expect(once.endsWith("\n") && !once.endsWith("\n\n")).toBe(true)
  })
})

describe("renderOutput — styled", () => {
  const small = result({ title: "t", blocks: [success("ok"), keyValue({ A: "b" })] })

  it("paints from the tokens: accent title, status hue on the glyph only, muted labels", () => {
    expect(renderOutput(small, { target: "styled" })).toBe(
      `${ESC}[1m${ESC}[38;2;255;140;0mt${ESC}[39m${ESC}[22m\n\n` +
        `${ESC}[38;2;95;215;167m✓${ESC}[39m ok\n` +
        `${ESC}[38;2;117;118;126mA${ESC}[39m  b\n`,
    )
  })

  it("keeps weight but drops every hue under NO_COLOR", () => {
    const out = renderOutput(small, { target: "styled", color: false })
    expect(out).toBe(`${ESC}[1mt${ESC}[22m\n\n✓ ok\n${ESC}[2mA${ESC}[22m  b\n`)
    expect(out).not.toMatch(/\x1b\[38;/)
  })
})

describe("renderOutput — json", () => {
  it("emits the model as data, never ANSI", () => {
    const out = renderOutput(doc, { target: "json" })
    expect(out).not.toContain(ESC)
    const parsed = JSON.parse(out)
    expect(parsed.title).toBe("acme deploy")
    expect(parsed.blocks[0]).toEqual({ kind: "status", variant: "success", text: "Deployed api-gateway to staging" })
    expect(parsed.blocks[1].blocks[0].pairs).toEqual([
      ["Version", "1.4.2"],
      ["Region", "eu-west-1"],
      ["Commit", "a1b2c3d"],
    ])
  })
})

describe("resolveOutput", () => {
  const tty = { isTTY: true, columns: 120, write: () => true }
  const pipe = { isTTY: false, write: () => true }

  it("--json wins over a terminal", () => {
    expect(resolveOutput({ json: true, stream: tty, env: {} }).target).toBe("json")
  })

  it("a pipe gets plain text at a fixed 80 columns", () => {
    expect(resolveOutput({ stream: pipe, env: {} })).toEqual({ target: "plain", color: false, width: 80 })
  })

  it("a terminal gets styled output at its own width", () => {
    expect(resolveOutput({ stream: tty, env: {} })).toEqual({ target: "styled", color: true, width: 120 })
  })

  it("NO_COLOR drops hue on a terminal; an empty NO_COLOR does not", () => {
    expect(resolveOutput({ stream: tty, env: { NO_COLOR: "1" } }).color).toBe(false)
    expect(resolveOutput({ stream: tty, env: { NO_COLOR: "" } }).color).toBe(true)
  })

  it("writeOutput writes plain text to a pipe", () => {
    let written = ""
    writeOutput(result({ blocks: [success("done")] }), {
      stream: { isTTY: false, write: (chunk: string) => (written += chunk) },
      env: {},
    })
    expect(written).toBe("✓ done\n")
  })
})
