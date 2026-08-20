import { describe, it, expect } from "vitest"
import { resolveColumnWidths, widestLine } from "./table-layout.js"

const columns = [{ header: "Name" }, { header: "Program" }]

describe("widestLine", () => {
  it("measures the widest line of a multi-line cell, not the whole string", () => {
    expect(widestLine("short\nmuch longer line\nmid")).toBe(16)
  })

  it("counts display columns rather than code units", () => {
    expect(widestLine("日本語")).toBe(6)
  })
})

describe("resolveColumnWidths", () => {
  it("sizes a column to its widest cell when no width is given", () => {
    expect(
      resolveColumnWidths({
        columns,
        rows: [
          ["api", "node server.js"],
          ["db", "postgres"],
        ],
        gap: 2,
        maxWidth: 80,
      }),
    ).toEqual([4, 14])
  })

  it("never sizes a column below its own header", () => {
    expect(
      resolveColumnWidths({
        columns,
        rows: [["a", "b"]],
        gap: 2,
        maxWidth: 80,
      }),
    ).toEqual([4, 7])
  })

  it("measures a multi-line cell by its widest line", () => {
    expect(
      resolveColumnWidths({
        columns: [{ header: "Program" }],
        rows: [["/usr/bin/env\n--flag\n-v"]],
        gap: 2,
        maxWidth: 80,
      }),
    ).toEqual([12])
  })

  it("takes from the widest column first when the table overflows", () => {
    // Natural widths are 10 and 40, plus a 2-column gap: 52 into 30 leaves 22 to
    // find, and all of it comes from the wider column before the narrow one is touched.
    expect(
      resolveColumnWidths({
        columns,
        rows: [["x".repeat(10), "y".repeat(40)]],
        gap: 2,
        maxWidth: 30,
      }),
    ).toEqual([10, 18])
  })

  it("evens out equally wide columns rather than emptying one", () => {
    expect(
      resolveColumnWidths({
        columns,
        rows: [["x".repeat(20), "y".repeat(20)]],
        gap: 2,
        maxWidth: 30,
      }),
    ).toEqual([14, 14])
  })

  it("leaves an explicit width alone and shrinks its flexible neighbour instead", () => {
    expect(
      resolveColumnWidths({
        columns: [{ header: "Name", width: 20 }, { header: "Program" }],
        rows: [["x".repeat(40), "y".repeat(40)]],
        gap: 2,
        maxWidth: 30,
      }),
    ).toEqual([20, 8])
  })

  it("stops at a column's minWidth rather than shrinking it away", () => {
    expect(
      resolveColumnWidths({
        columns: [
          { header: "Name", minWidth: 10 },
          { header: "Program", minWidth: 10 },
        ],
        rows: [["x".repeat(30), "y".repeat(30)]],
        gap: 2,
        maxWidth: 12,
      }),
    ).toEqual([10, 10])
  })

  it("overflows rather than disagreeing with widths the caller fixed", () => {
    expect(
      resolveColumnWidths({
        columns: [
          { header: "Name", width: 40 },
          { header: "Program", width: 40 },
        ],
        rows: [["a", "b"]],
        gap: 2,
        maxWidth: 30,
      }),
    ).toEqual([40, 40])
  })

  it("sizes from headers alone when there are no rows", () => {
    expect(
      resolveColumnWidths({ columns, rows: [], gap: 2, maxWidth: 80 }),
    ).toEqual([4, 7])
  })
})
