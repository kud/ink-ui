import { describe, it, expect } from "vitest"
import stringWidth from "string-width"
import {
  displayWidth,
  resolveColumnWidths,
  truncateCell,
  truncateLine,
  widestLine,
} from "./table-layout.js"

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

describe("flexible and capped columns", () => {
  it("hands spare width to flex columns in proportion, exactly", () => {
    const widths = resolveColumnWidths({
      columns: [
        { header: "Id", width: 4 },
        { header: "Name", flex: 1 },
        { header: "Note", flex: 2 },
      ],
      rows: [["1", "api", "ok"]],
      gap: 2,
      maxWidth: 40,
    })
    expect(widths.reduce((sum, width) => sum + width, 4)).toBe(40)
    expect(widths[0]).toBe(4)
    // Three columns of 4 and two gaps of 2 leave 24 spare, split 1:2.
    expect(widths[1]).toBe(4 + 8)
    expect(widths[2]).toBe(4 + 16)
  })

  it("hands the rounding remainder out left to right", () => {
    const widths = resolveColumnWidths({
      columns: [
        { header: "A", width: 1, flex: 0 },
        { header: "B", width: 1 },
        { header: "Cc", flex: 1 },
        { header: "Dd", flex: 1 },
      ],
      rows: [],
      gap: 0,
      maxWidth: 9,
    })
    expect(widths).toEqual([1, 1, 4, 3])
  })

  it("never grows a fixed column, even one marked flex", () => {
    const widths = resolveColumnWidths({
      columns: [{ header: "A", width: 5, flex: 1 }],
      rows: [],
      gap: 2,
      maxWidth: 40,
    })
    expect(widths).toEqual([5])
  })

  it("stops a flex column at its maxWidth and gives the rest to the others", () => {
    const widths = resolveColumnWidths({
      columns: [
        { header: "Name", flex: 1, maxWidth: 10 },
        { header: "Note", flex: 1 },
      ],
      rows: [],
      gap: 0,
      maxWidth: 40,
    })
    expect(widths).toEqual([10, 30])
  })

  it("leaves the table narrower when every flex column is at its ceiling", () => {
    const widths = resolveColumnWidths({
      columns: [{ header: "Name", flex: 1, maxWidth: 10 }],
      rows: [],
      gap: 0,
      maxWidth: 40,
    })
    expect(widths).toEqual([10])
  })

  it("caps a measured column at its maxWidth", () => {
    const widths = resolveColumnWidths({
      columns: [{ header: "Path", maxWidth: 10 }],
      rows: [["a".repeat(50)]],
      gap: 2,
      maxWidth: 80,
    })
    expect(widths).toEqual([10])
  })

  it("reserves the header slot so a sort indicator never truncates it", () => {
    const widths = resolveColumnWidths({
      columns: [{ header: "Size" }],
      rows: [["1"]],
      gap: 2,
      maxWidth: 80,
      headerExtra: 2,
    })
    expect(widths).toEqual([6])
  })
})

describe("truncateLine", () => {
  it("leaves a line that fits untouched", () => {
    expect(truncateLine("hello", 5)).toBe("hello")
  })

  it("ends a clipped line in an ellipsis within the width", () => {
    const clipped = truncateLine("hello world", 6)
    expect(clipped).toBe("hello…")
    expect(stringWidth(clipped)).toBe(6)
  })

  it("drops a wide glyph that would straddle the edge rather than overflow", () => {
    // Each ideograph is two columns: five columns hold two of them and the
    // ellipsis, never two and a half.
    const clipped = truncateLine("日本語テキスト", 6)
    expect(clipped).toBe("日本…")
    expect(stringWidth(clipped)).toBeLessThanOrEqual(6)
  })

  it("keeps a grapheme cluster whole", () => {
    const family = "👨‍👩‍👧"
    const clipped = truncateLine(`${family}${family}${family}`, 5)
    expect(clipped).toBe(`${family}${family}…`)
    // Combining marks stay attached to their letter.
    expect(truncateLine("éééé", 3)).toBe("éé…")
  })

  it("returns only the ellipsis at width one and nothing at zero", () => {
    expect(truncateLine("hello", 1)).toBe("…")
    expect(truncateLine("hello", 0)).toBe("")
  })

  it("truncates each line of a multi-line cell on its own", () => {
    expect(truncateCell("abcdef\nxy", 4)).toBe("abc…\nxy")
  })
})

describe("displayWidth", () => {
  it("agrees with string-width on plain, Latin, wide and clustered text", () => {
    const samples = [
      "plain ascii",
      "café · naïve — ½",
      "soft\u00adhyphen",
      "日本語",
      "e\u0301",
      "👨‍👩‍👧 family",
      "✓ success",
      "tab\tchar",
    ]
    for (const sample of samples)
      expect(displayWidth(sample), sample).toBe(stringWidth(sample))
  })

  it("returns the same width from its memo as on the first call", () => {
    expect(displayWidth("⚠ warning")).toBe(displayWidth("⚠ warning"))
  })
})
