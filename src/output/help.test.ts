import { describe, expect, it } from "vitest"
import { help, renderOutput } from "./index.js"

const spec = {
  name: "acme",
  summary: "Ship services to every environment.",
  usage: ["acme <command> [options]"],
  commands: [
    { name: "deploy <env>", summary: "Deploy the current build" },
    { name: "status", summary: "Show what is running where" },
  ],
  options: [
    { name: "-f, --force", summary: "Skip the confirmation" },
    { name: "    --json", summary: "Print the result as JSON" },
  ],
  examples: ["acme deploy staging"],
  notes: ["Docs: https://example.com/acme"],
}

describe("help", () => {
  it("renders a --help page from the shared primitives", () => {
    expect(renderOutput(help(spec), { target: "plain" })).toBe(
      [
        "acme",
        "",
        "Ship services to every environment.",
        "",
        "Usage",
        "  acme <command> [options]",
        "",
        "Commands",
        "  deploy <env>  Deploy the current build",
        "  status        Show what is running where",
        "",
        "Options",
        "  -f, --force  Skip the confirmation",
        "      --json   Print the result as JSON",
        "",
        "Examples",
        "  acme deploy staging",
        "",
        "Docs: https://example.com/acme",
        "",
      ].join("\n"),
    )
  })

  it("leaves out sections with nothing in them", () => {
    const out = renderOutput(help({ name: "acme", usage: ["acme"] }), { target: "plain" })
    expect(out).toBe("acme\n\nUsage\n  acme\n")
  })

  it("never wraps usage lines, even when narrow", () => {
    const usage = "acme deploy <env> [--force] [--json] [--region <name>]"
    const out = renderOutput(help({ name: "acme", usage: [usage] }), { target: "plain", width: 20 })
    expect(out).toContain(`  ${usage}\n`)
  })

  it("draws terms bright and descriptions in the secondary tier when styled", () => {
    const out = renderOutput(help({ name: "acme", commands: spec.commands }), { target: "styled" })
    expect(out).toContain("  deploy <env>  \x1b[38;2;153;153;153mDeploy the current build\x1b[39m")
  })

  it("serialises to structured JSON", () => {
    const parsed = JSON.parse(renderOutput(help(spec), { target: "json" }))
    expect(parsed.blocks.map((b: { kind: string; title?: string }) => b.title ?? b.kind)).toEqual([
      "text",
      "Usage",
      "Commands",
      "Options",
      "Examples",
      "note",
    ])
  })
})
