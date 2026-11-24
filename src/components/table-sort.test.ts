import { describe, it, expect } from "vitest"
import { compareValues, nextSort, sortIndices, sortRows } from "./table-sort.js"

type Row = { name: string; size?: number | null; group: string }

const rows: Row[] = [
  { name: "item-10", size: 3, group: "b" },
  { name: "item-9", size: null, group: "a" },
  { name: "Item-2", size: 1, group: "b" },
  { name: "item-1", size: 3, group: "a" },
]

const columns = [{ key: "name" }, { key: "size" }, { key: "group" }]

describe("compareValues", () => {
  it("orders numbers by magnitude and text with a numeric collator", () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues("item-9", "item-10")).toBeLessThan(0)
    expect(compareValues("abc", "ABC")).toBe(0)
  })

  it("orders dates by time", () => {
    expect(compareValues(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBeLessThan(0)
  })
})

describe("sortRows", () => {
  it("returns the original order when there is no sort", () => {
    expect(sortRows(rows, columns, null)).toEqual(rows)
  })

  it("sorts text numerically and case-insensitively", () => {
    expect(
      sortRows(rows, columns, { key: "name", direction: "asc" }).map((r) => r.name),
    ).toEqual(["item-1", "Item-2", "item-9", "item-10"])
  })

  it("is stable: equal values keep the order they arrived in, both ways", () => {
    const asc = sortRows(rows, columns, { key: "size", direction: "asc" })
    expect(asc.map((r) => r.name)).toEqual(["Item-2", "item-10", "item-1", "item-9"])
    const desc = sortRows(rows, columns, { key: "size", direction: "desc" })
    expect(desc.map((r) => r.name)).toEqual(["item-10", "item-1", "Item-2", "item-9"])
  })

  it("keeps empties last whichever the direction", () => {
    for (const direction of ["asc", "desc"] as const) {
      const sorted = sortRows(rows, columns, { key: "size", direction })
      expect(sorted.at(-1)!.name).toBe("item-9")
    }
  })

  it("uses a column's own comparator when it has one", () => {
    const byLength = [
      { key: "name", compare: (a: Row, b: Row) => a.group.localeCompare(b.group) },
    ]
    expect(
      sortRows(rows, byLength, { key: "name", direction: "asc" }).map((r) => r.group),
    ).toEqual(["a", "a", "b", "b"])
  })

  it("returns indices into the original data", () => {
    expect(sortIndices(rows, columns, { key: "name", direction: "desc" })).toEqual([
      0, 1, 2, 3,
    ])
  })
})

describe("nextSort", () => {
  it("cycles ascending, descending, then unsorted", () => {
    const first = nextSort(null, "name")
    expect(first).toEqual({ key: "name", direction: "asc" })
    const second = nextSort(first, "name")
    expect(second).toEqual({ key: "name", direction: "desc" })
    expect(nextSort(second, "name")).toBeNull()
  })

  it("starts a different column ascending", () => {
    expect(nextSort({ key: "name", direction: "desc" }, "size")).toEqual({
      key: "size",
      direction: "asc",
    })
  })
})
