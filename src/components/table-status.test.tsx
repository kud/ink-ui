import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Table } from "./table.js"
import { statusColumn } from "./table-status.js"
import { sortRows } from "./table-sort.js"
import { colors } from "../tokens.js"

type Run = { name: string; state: "success" | "error" | "pending" | "warning" | "info" | "" }

const runs: Run[] = [
  { name: "build", state: "success" },
  { name: "lint", state: "error" },
  { name: "deploy", state: "pending" },
  { name: "docs", state: "" },
  { name: "audit", state: "warning" },
]

const state = statusColumn<Run>({
  key: "state",
  header: "State",
  status: (row) => row.state || undefined,
})

describe("statusColumn", () => {
  it("draws a glyph and a word, never a colour alone", () => {
    const { lastFrame } = render(
      <Table maxWidth={40} columns={[{ key: "name", header: "Name" }, state]} data={runs} />,
    )
    const frame = lastFrame()!
    expect(frame).toMatch(/build\s+✓ success/)
    expect(frame).toMatch(/lint\s+✗ error/)
    expect(frame).toMatch(/deploy\s+◌ pending/)
    expect(frame).toMatch(/audit\s+⚠ warning/)
  })

  it("colours each state from its token, and leaves a row with none plain", () => {
    expect(state.color?.("error", runs[1]!)).toBe(colors.error)
    expect(state.color?.("pending", runs[2]!)).toBe(colors.pending)
    expect(state.color?.("", runs[3]!)).toBeUndefined()
    expect(state.format?.("", runs[3]!)).toBe("")
  })

  it("takes a custom label", () => {
    const labelled = statusColumn<Run>({
      key: "state",
      header: "State",
      status: (row) => row.state || undefined,
      label: (row) => row.name.toUpperCase(),
    })
    expect(labelled.format?.("error", runs[1]!)).toBe("✗ LINT")
  })

  it("sorts by severity, with stateless rows last", () => {
    expect(
      sortRows(runs, [state], { key: "state", direction: "asc" }).map((r) => r.name),
    ).toEqual(["lint", "audit", "deploy", "build", "docs"])
    expect(
      sortRows(runs, [state], { key: "state", direction: "desc" }).map((r) => r.name),
    ).toEqual(["build", "deploy", "audit", "lint", "docs"])
  })
})
