import React, { useState } from "react"
import { Text, Box } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { Table, type Column } from "./table.js"
import { useTable } from "./use-table.js"

type Row = { name: string; size: number }

const data: Row[] = [
  { name: "delta", size: 4 },
  { name: "alpha", size: 1 },
  { name: "charlie", size: 3 },
  { name: "bravo", size: 2 },
]

const columns: Column<Row>[] = [
  { key: "name", header: "Name" },
  { key: "size", header: "Size", align: "right" },
]

const ESC = String.fromCharCode(27)
const DOWN = `${ESC}[B`
const UP = `${ESC}[A`
const RIGHT = `${ESC}[C`
const SHIFT_DOWN = `${ESC}[1;2B`

const tick = () => new Promise((resolve) => setTimeout(resolve, 60))

const press = async (stdin: { write: (data: string) => void }, ...keys: string[]) => {
  for (const key of keys) {
    stdin.write(key)
    await tick()
  }
}

const Host = (props: Partial<Parameters<typeof useTable<Row>>[0]>) => {
  const table = useTable<Row>({
    data,
    columns,
    rowKey: (row) => row.name,
    ...props,
  })
  return (
    <Box flexDirection="column">
      <Table maxWidth={30} {...table.tableProps} />
      <Text>{`row:${table.row?.name ?? "-"} selected:${table.selected.join(",")}`}</Text>
    </Box>
  )
}

const status = (frame: string | undefined) =>
  (frame ?? "").split("\n").at(-1) ?? ""

describe("useTable", () => {
  it("moves the cursor with the arrows and j/k, clamped at the ends", async () => {
    const { lastFrame, stdin } = render(<Host />)
    await press(stdin, UP)
    expect(status(lastFrame())).toContain("row:delta")
    await press(stdin, DOWN, "j")
    expect(status(lastFrame())).toContain("row:charlie")
    await press(stdin, "j", "j", "j")
    expect(status(lastFrame())).toContain("row:bravo")
    await press(stdin, "k")
    expect(status(lastFrame())).toContain("row:charlie")
  })

  it("cycles the sort on the focused column with s, and the cursor follows its row", async () => {
    const { lastFrame, stdin } = render(<Host />)
    await press(stdin, "s")
    expect(lastFrame()).toContain("Name ↑")
    // The cursor was on delta, which is last once sorted by name.
    expect(status(lastFrame())).toContain("row:delta")
    expect(lastFrame()!.split("\n")[4]).toContain("❯ delta")
    await press(stdin, "s")
    expect(lastFrame()).toContain("Name ↓")
    await press(stdin, "s")
    expect(lastFrame()).not.toMatch(/[↑↓]/)
  })

  it("moves the focused column with ←→ and sorts that one", async () => {
    const { lastFrame, stdin } = render(<Host />)
    await press(stdin, RIGHT, "s")
    expect(lastFrame()).toContain("Size ↑")
    const body = lastFrame()!.split("\n").slice(1, 5)
    expect(body.map((line) => line.replace("❯", " ").trim().split(/\s+/)[0])).toEqual([
      "alpha",
      "bravo",
      "charlie",
      "delta",
    ])
  })

  it("skips a column that opts out of sorting", async () => {
    const { lastFrame, stdin } = render(
      <Host columns={[{ ...columns[0]!, sortable: false }, columns[1]!]} />,
    )
    await press(stdin, "s")
    expect(lastFrame()).not.toMatch(/[↑↓]/)
  })

  it("toggles rows with space, selects all with a, and clears with a again", async () => {
    const { lastFrame, stdin } = render(<Host selection="multiple" />)
    await press(stdin, " ", "j", " ")
    expect(status(lastFrame())).toContain("selected:delta,alpha")
    await press(stdin, " ")
    expect(status(lastFrame())).toContain("selected:delta")
    await press(stdin, "a")
    expect(status(lastFrame())).toContain("selected:delta,alpha,charlie,bravo")
    await press(stdin, "a")
    expect(status(lastFrame())).toMatch(/selected:$/)
  })

  it("extends a range with shift, and shrinks it again", async () => {
    const { lastFrame, stdin } = render(<Host selection="multiple" />)
    await press(stdin, SHIFT_DOWN, SHIFT_DOWN)
    expect(status(lastFrame())).toContain("selected:delta,alpha,charlie")
    await press(stdin, "K")
    expect(status(lastFrame())).toContain("selected:delta,alpha")
    expect(status(lastFrame())).not.toContain("charlie")
  })

  it("keeps one row at most in single mode", async () => {
    const { lastFrame, stdin } = render(<Host selection="single" />)
    await press(stdin, " ", "j", " ")
    expect(status(lastFrame())).toContain("selected:alpha")
    await press(stdin, " ")
    expect(status(lastFrame())).toMatch(/selected:$/)
  })

  it("reports selection changes when controlled, and draws only what it is given", async () => {
    const onSelectedChange = vi.fn()
    const Controlled = () => {
      const [selected, setSelected] = useState<string[]>(["bravo"])
      return (
        <Host
          selection="multiple"
          selected={selected}
          onSelectedChange={(keys) => {
            onSelectedChange(keys)
            setSelected(keys)
          }}
        />
      )
    }
    const { lastFrame, stdin } = render(<Controlled />)
    expect(status(lastFrame())).toContain("selected:bravo")
    await press(stdin, " ")
    expect(onSelectedChange).toHaveBeenLastCalledWith(["bravo", "delta"])
    expect(status(lastFrame())).toContain("selected:bravo,delta")
  })

  it("honours a controlled sort and reports the next one", async () => {
    const onSortChange = vi.fn()
    const { lastFrame, stdin } = render(
      <Host sort={{ key: "size", direction: "desc" }} onSortChange={onSortChange} />,
    )
    expect(lastFrame()).toContain("Size ↓")
    await press(stdin, "s")
    expect(onSortChange).toHaveBeenLastCalledWith({ key: "name", direction: "asc" })
    // Controlled: nothing changes until the host passes the new sort back.
    expect(lastFrame()).toContain("Size ↓")
  })

  it("never binds q, esc or backspace", async () => {
    const { lastFrame, stdin } = render(<Host selection="multiple" />)
    await press(stdin, " ")
    const before = lastFrame()
    await press(stdin, "q", ESC, String.fromCharCode(127))
    expect(lastFrame()).toBe(before)
  })

  it("stands down when inactive", async () => {
    const { lastFrame, stdin } = render(<Host isActive={false} />)
    await press(stdin, "j", "s")
    expect(status(lastFrame())).toContain("row:delta")
    expect(lastFrame()).not.toMatch(/[↑↓]/)
  })

  it("leaves the letters alone with vimKeys off, for a typing filter", async () => {
    const { lastFrame, stdin } = render(<Host vimKeys={false} />)
    await press(stdin, "j")
    expect(status(lastFrame())).toContain("row:delta")
    await press(stdin, DOWN)
    expect(status(lastFrame())).toContain("row:alpha")
  })

  it("pages through a virtualised window and jumps to the ends", async () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ name: `row-${i}`, size: i }))
    const Big = () => {
      const table = useTable({ data: many, columns, height: 5 })
      return <Table maxWidth={30} {...table.tableProps} />
    }
    const { lastFrame, stdin } = render(<Big />)
    await press(stdin, "G")
    expect(lastFrame()).toContain("❯ row-999")
    expect(lastFrame()!.split("\n")).toHaveLength(6)
    await press(stdin, "g")
    expect(lastFrame()).toContain("❯ row-0")
    await press(stdin, `${ESC}[6~`)
    expect(lastFrame()).toContain("❯ row-4")
  })
})
