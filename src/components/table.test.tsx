import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Table, scrollWindow } from "./table.js"

const lines = (frame: string | undefined) => (frame ?? "").split("\n")

describe("Table", () => {
  it("renders headers above their rows", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[
          { key: "name", header: "Name" },
          { key: "status", header: "Status" },
        ]}
        data={[{ name: "api", status: "ok" }]}
      />,
    )
    const [header, row] = lines(lastFrame())
    expect(header).toContain("Name")
    expect(header).toContain("Status")
    expect(row).toContain("api")
    expect(row).toContain("ok")
  })

  it("wraps a cell whose column asks for it, keeping it inside its width", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[
          { key: "program", header: "Program", width: 10, overflow: "wrap" },
        ]}
        data={[{ program: "alpha bravo charlie" }]}
      />,
    )
    const [, ...body] = lines(lastFrame())
    expect(body.length).toBeGreaterThan(1)
    expect(body.join(" ")).toContain("alpha")
    expect(body.join(" ")).toContain("charlie")
    for (const line of body) expect(line.length).toBeLessThanOrEqual(10)
  })

  it("truncates with an ellipsis by default rather than wrapping", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[{ key: "program", header: "Program", width: 10 }]}
        data={[{ program: "alpha bravo charlie" }]}
      />,
    )
    const body = lines(lastFrame()).slice(1)
    expect(body).toHaveLength(1)
    expect(body[0]).toContain("…")
    expect(body[0]).not.toContain("charlie")
  })

  it("keeps the next row below the tallest cell of a ragged row", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[
          { key: "name", header: "Name", width: 6 },
          { key: "program", header: "Program", width: 10, overflow: "wrap" },
        ]}
        data={[
          { name: "api", program: "alpha bravo charlie" },
          { name: "db", program: "short" },
        ]}
      />,
    )
    const body = lines(lastFrame()).slice(1)
    // The first row is three lines tall because its second cell wrapped; the
    // second row must start after all three, not overlap them.
    const first = body.findIndex((line) => line.includes("api"))
    const second = body.findIndex((line) => line.includes("db"))
    expect(first).toBe(0)
    expect(second).toBe(3)
    expect(body[second]).toContain("short")
    // The tall cell's continuation lines belong to it alone — no stray first-column text.
    expect(body[1]).not.toContain("api")
    expect(body[2]).not.toContain("api")
  })

  it("aligns a column right or centre when asked", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[
          { key: "left", header: "L", width: 8 },
          { key: "middle", header: "M", width: 8, align: "center" },
          { key: "right", header: "R", width: 8, align: "right" },
        ]}
        data={[{ left: "a", middle: "b", right: "c" }]}
      />,
    )
    const row = lines(lastFrame())[1] ?? ""
    expect(row.indexOf("a")).toBe(0)
    // Centre lands mid-column; right lands at its far edge. Both are measured
    // against the left column's own start so a gap change cannot silently pass.
    expect(row.indexOf("b")).toBe(13)
    expect(row.indexOf("c")).toBe(27)
  })

  it("shrinks a flexible column so a wide table still fits its bounds", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={20}
        columns={[
          { key: "name", header: "Name" },
          { key: "program", header: "Program" },
        ]}
        data={[{ name: "api", program: "x".repeat(40) }]}
      />,
    )
    for (const line of lines(lastFrame())) expect(line.length).toBeLessThanOrEqual(20)
  })

  it("renders a nullish cell as empty rather than as the word undefined", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[
          { key: "name", header: "Name" },
          { key: "note", header: "Note" },
        ]}
        data={[{ name: "api", note: undefined }]}
      />,
    )
    expect(lastFrame()).not.toContain("undefined")
  })

  it("keeps the existing look when none of the new props are passed", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={20}
        columns={[{ key: "name", header: "Name" }]}
        data={[{ name: "api" }]}
      />,
    )
    expect(lines(lastFrame())).toEqual(["Name", "api"])
  })

  it("draws the sort indicator on the sorted header and sorts the rows", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        sort={{ key: "size", direction: "desc" }}
        columns={[
          { key: "name", header: "Name" },
          { key: "size", header: "Size", align: "right" },
        ]}
        data={[
          { name: "small", size: 1 },
          { name: "large", size: 30 },
          { name: "mid", size: 7 },
        ]}
      />,
    )
    const [header, ...body] = lines(lastFrame())
    expect(header).toContain("Size ↓")
    expect(body.map((line) => line.trim().split(/\s+/)[0])).toEqual([
      "large",
      "mid",
      "small",
    ])
  })

  it("does not move a column when the sort indicator appears", () => {
    const props = {
      maxWidth: 40,
      columns: [
        { key: "name", header: "Name" },
        { key: "size", header: "Size" },
      ] as const,
      data: [{ name: "api", size: 1 }],
    }
    const unsorted = render(<Table {...props} columns={[...props.columns]} sort={null} />)
    const sorted = render(
      <Table {...props} columns={[...props.columns]} sort={{ key: "name", direction: "asc" }} />,
    )
    const at = (frame: string | undefined) => lines(frame)[0]!.indexOf("Size")
    expect(at(sorted.lastFrame())).toBe(at(unsorted.lastFrame()))
  })

  it("marks the cursor row with ❯ and the selection column with ■ and □", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        cursor={1}
        selection="multiple"
        selected={["0"]}
        columns={[{ key: "name", header: "Name" }]}
        data={[{ name: "api" }, { name: "db" }, { name: "web" }]}
      />,
    )
    const [header, first, second, third] = lines(lastFrame())
    expect(header).toBe("    Name")
    expect(first).toBe("  ■ api")
    expect(second).toBe("❯ □ db")
    expect(third).toBe("  □ web")
  })

  it("draws single selection as a radio column", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        selection="single"
        selected={["1"]}
        columns={[{ key: "name", header: "Name" }]}
        data={[{ name: "api" }, { name: "db" }]}
      />,
    )
    expect(lines(lastFrame()).slice(1)).toEqual(["○ api", "● db"])
  })

  it("selects by rowKey, so a selection survives a re-sort", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        selection="multiple"
        selected={["db"]}
        rowKey={(row) => row.name}
        sort={{ key: "name", direction: "desc" }}
        columns={[{ key: "name", header: "Name" }]}
        data={[{ name: "api" }, { name: "db" }]}
      />,
    )
    expect(lines(lastFrame()).slice(1)).toEqual(["■ db", "□ api"])
  })

  it("renders only the visible window and keeps the header above it", () => {
    const data = Array.from({ length: 10_000 }, (_, i) => ({ id: `row-${i}` }))
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        height={5}
        cursor={5_000}
        columns={[{ key: "id", header: "Id" }]}
        data={data}
      />,
    )
    const frame = lines(lastFrame())
    expect(frame).toHaveLength(6)
    expect(frame[0]).toContain("Id")
    expect(frame.at(-1)).toContain("❯ row-5000")
    expect(frame[1]).toContain("row-4996")
  })

  it("shows the empty state under the header when there are no rows", () => {
    const { lastFrame } = render(
      <Table maxWidth={40} columns={[{ key: "name", header: "Name" }]} data={[]} />,
    )
    expect(lines(lastFrame())).toEqual(["Name", "No rows"])
  })

  it("takes a custom empty message", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        empty="Nothing matches the filter"
        columns={[{ key: "name", header: "Name" }]}
        data={[]}
      />,
    )
    expect(lastFrame()).toContain("Nothing matches the filter")
  })

  it("draws a column through its format and truncates by display width", () => {
    const { lastFrame } = render(
      <Table
        maxWidth={40}
        columns={[
          {
            key: "title",
            header: "Title",
            width: 7,
            format: (value) => `${String(value)}!`,
          },
        ]}
        data={[{ title: "日本語テキスト" }]}
      />,
    )
    const row = lines(lastFrame())[1]!
    expect(row.trimEnd()).toBe("日本語…")
  })
})

describe("scrollWindow", () => {
  it("does not move while the cursor stays inside the window", () => {
    expect(scrollWindow({ total: 100, height: 10, cursor: 15, previous: 10 })).toBe(10)
  })

  it("moves just enough to bring the cursor back in", () => {
    expect(scrollWindow({ total: 100, height: 10, cursor: 20, previous: 10 })).toBe(11)
    expect(scrollWindow({ total: 100, height: 10, cursor: 4, previous: 10 })).toBe(4)
  })

  it("never scrolls past the last full page", () => {
    expect(scrollWindow({ total: 100, height: 10, cursor: 99, previous: 95 })).toBe(90)
  })

  it("starts at the top when everything fits", () => {
    expect(scrollWindow({ total: 3, height: 10, cursor: 2, previous: 5 })).toBe(0)
  })
})
