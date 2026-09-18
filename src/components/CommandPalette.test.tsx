import React, { useState } from "react"
import { Text } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { CommandPalette, type PaletteItem } from "./CommandPalette.js"
import { fuzzyFilter } from "./fuzzy-filter.js"
import { colors } from "../tokens.js"

// Under FORCE_COLOR the frame carries escape codes between a glyph and its
// text; assertions read the plain text so the file passes with colour on or off.
const plain = (frame?: string) => (frame ?? "").replace(/\u001b\[[0-9;]*m/g, "")
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))
const ESC = "\u001B"
const DOWN = "\u001B[B"
const UP = "\u001B[A"

const tree: PaletteItem[] = [
  { id: "sync", title: "sync", group: "daily", hint: "pull the machine" },
  { id: "doctor", title: "doctor", group: "daily", hint: "check health" },
  { id: "config", title: "config", group: "setup", hint: "edit config" },
  { id: "wipe", title: "wipe", group: "danger", hint: "erase", marker: "!" },
]

/** A host that narrows a fixed tree — the static-list shape. */
const StaticHost = ({
  onSelect = () => {},
  onClose,
}: {
  onSelect?: (id: string) => void
  onClose?: () => void
}) => {
  const [query, setQuery] = useState("")
  return (
    <CommandPalette
      items={fuzzyFilter(tree, query)}
      query={query}
      onQueryChange={setQuery}
      onSelect={onSelect}
      onClose={onClose}
      placeholder="type to search"
    />
  )
}

/** A host that derives rows from the query — the launcher shape. */
const DerivingHost = ({ onSelect = () => {} }) => {
  const [query, setQuery] = useState("")
  const key = /^[A-Z]+-\d+$/i.test(query.trim())
    ? query.trim().toUpperCase()
    : null
  const items: PaletteItem[] = key
    ? [
        {
          id: "here",
          title: `Open ${key} here`,
          label: (
            <Text>
              Open <Text color={colors.accent}>{key}</Text>{" "}
              <Text color={colors.info}>here</Text>
            </Text>
          ),
        },
        { id: "browser", title: `Open ${key} in the browser` },
      ]
    : []
  return (
    <CommandPalette
      items={items}
      query={query}
      onQueryChange={setQuery}
      onSelect={onSelect}
      message={query ? `no ticket matches "${query}"` : undefined}
      placeholder="ticket key…"
    />
  )
}

describe("CommandPalette", () => {
  it("shows the placeholder and the grouped tree while idle", () => {
    const frame = plain(render(<StaticHost />).lastFrame())
    expect(frame).toContain("type to search")
    expect(frame).toMatch(/── DAILY ─/)
    expect(frame).toMatch(/── SETUP ─/)
    expect(frame).toMatch(/── DANGER ─/)
    expect(frame).toContain("❯ ")
    expect(frame).toMatch(/❯ {3}sync/) // marker cell reserved on every row
    expect(frame).toMatch(/! wipe/)
    expect(frame).toMatch(/↑↓ move.*⏎ select.*esc close/)
  })

  it("flattens the list while typing and keeps the cursor on the first hit", async () => {
    const { stdin, lastFrame } = render(<StaticHost />)
    stdin.write("co")
    await delay()
    const frame = plain(lastFrame())
    expect(frame).not.toMatch(/── SETUP ─/)
    expect(frame).toContain("❯ config")
    expect(frame).not.toContain("sync")
  })

  it("moves the cursor with the arrows and never with j/k", async () => {
    const { stdin, lastFrame } = render(<StaticHost />)
    stdin.write(DOWN)
    await delay()
    expect(plain(lastFrame())).toContain("❯   doctor")
    stdin.write(UP)
    await delay()
    expect(plain(lastFrame())).toContain("❯   sync")
    stdin.write("j")
    await delay()
    // `j` typed into the query, so the list narrowed rather than the cursor moving.
    expect(plain(lastFrame())).not.toContain("❯   doctor")
  })

  it("selects the row under the cursor on Enter", async () => {
    const onSelect = vi.fn()
    const { stdin } = render(<StaticHost onSelect={onSelect} />)
    stdin.write(DOWN)
    await delay()
    stdin.write("\r")
    await delay()
    expect(onSelect).toHaveBeenCalledWith("doctor")
  })

  it("closes on esc without touching the query", async () => {
    const onClose = vi.fn()
    const { stdin, lastFrame } = render(<StaticHost onClose={onClose} />)
    stdin.write("doc")
    await delay()
    stdin.write(ESC)
    await delay()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(plain(lastFrame())).toContain("doc")
  })

  it("derives rows from the query and draws a rich label", async () => {
    const onSelect = vi.fn()
    const { stdin, lastFrame } = render(<DerivingHost onSelect={onSelect} />)
    expect(plain(lastFrame())).toContain("ticket key…")
    stdin.write("shop-12")
    await delay()
    const frame = plain(lastFrame())
    expect(frame).toContain("❯ Open SHOP-12 here")
    expect(frame).toContain("Open SHOP-12 in the browser")
    stdin.write("\r")
    await delay()
    expect(onSelect).toHaveBeenCalledWith("here")
  })

  it("shows the message instead of rows and makes Enter a no-op", async () => {
    const onSelect = vi.fn()
    const { stdin, lastFrame } = render(<DerivingHost onSelect={onSelect} />)
    stdin.write("nope")
    await delay()
    expect(plain(lastFrame())).toContain('no ticket matches "nope"')
    expect(plain(lastFrame())).not.toContain("❯")
    stdin.write("\r")
    await delay()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("stands the keyboard down when isActive is false", async () => {
    const onQueryChange = vi.fn()
    const onSelect = vi.fn()
    const { stdin, lastFrame } = render(
      <CommandPalette
        items={tree}
        query=""
        onQueryChange={onQueryChange}
        onSelect={onSelect}
        isActive={false}
      />,
    )
    stdin.write(DOWN)
    stdin.write("x")
    stdin.write("\r")
    await delay()
    expect(onQueryChange).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    expect(plain(lastFrame())).toMatch(/❯ {3}sync/) // cursor never left the first row
  })

  it("resets the cursor to the first hit when the query changes after moving it", async () => {
    const { stdin, lastFrame } = render(<StaticHost />)
    stdin.write(DOWN)
    await delay()
    expect(plain(lastFrame())).toContain("❯   doctor")
    stdin.write("wip")
    await delay()
    const frame = plain(lastFrame())
    expect(frame).toContain("❯ ! wipe")
    expect(frame).not.toContain("doctor")
  })

  it("draws the hint dimmed after the title", () => {
    const frame = plain(render(<StaticHost />).lastFrame())
    expect(frame).toMatch(/sync {2}pull the machine/)
  })

  it("scrolls a long list and reports the position only then", () => {
    const many: PaletteItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: `item-${i}`,
      title: `item ${i}`,
    }))
    const frame = plain(
      render(
        <CommandPalette
          items={many}
          query=""
          onQueryChange={() => {}}
          onSelect={() => {}}
          maxRows={5}
        />,
      ).lastFrame(),
    )
    expect(frame).toContain("1 of 30")
    expect(frame).not.toContain("item 29")
    const short = plain(render(<StaticHost />).lastFrame())
    expect(short).not.toMatch(/\d+ of \d+/)
  })
})

describe("fuzzyFilter", () => {
  it("returns everything for an empty query", () => {
    expect(fuzzyFilter(tree, "  ")).toEqual(tree)
  })

  it("ranks substring hits above subsequence hits", () => {
    const ids = fuzzyFilter(tree, "cfg").map((item) => item.id)
    expect(ids).toEqual(["config"])
    const mixed = fuzzyFilter(
      [
        { id: "a", title: "scaffold" },
        { id: "b", title: "sca" },
      ],
      "sca",
    ).map((item) => item.id)
    expect(mixed).toEqual(["a", "b"])
  })

  it("matches on group, hint and keywords, case-insensitively", () => {
    expect(fuzzyFilter(tree, "DANGER").map((i) => i.id)).toEqual(["wipe"])
    expect(fuzzyFilter(tree, "health").map((i) => i.id)).toEqual(["doctor"])
    const keyed = [{ id: "k", title: "sync", keywords: ["pull", "update"] }]
    expect(fuzzyFilter(keyed, "upd")).toHaveLength(1)
  })
})
