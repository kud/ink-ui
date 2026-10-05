import React, { useState } from "react"
import { Box, Text } from "ink"
import { render } from "ink-testing-library"
import stringWidth from "string-width"
import { describe, it, expect, vi } from "vitest"
import { CommandPalette, type PaletteItem } from "./command-palette.js"
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

describe("CommandPalette overlay paint", () => {
  // The palette floats over host content, and Ink only paints the cells a
  // line writes — a short line leaves the rows underneath showing through
  // (a stray letter before the prompt, old text between the hints). The host
  // below pulls the palette up over its own rows with a negative margin, so
  // the frame is the true composite: every cell the palette does not paint
  // still holds the host's character. Every line inside the box must
  // therefore carry no host character at all.
  const ROWS_ABOVE = 16
  const OverHost = ({
    width,
    char = "X",
    children,
  }: {
    width: number
    char?: string
    children: React.ReactNode
  }) => (
    <Box flexDirection="column">
      {Array.from({ length: ROWS_ABOVE }, (_, index) => (
        <Text key={index}>{char.repeat(width + 10)}</Text>
      ))}
      <Box marginTop={-ROWS_ABOVE}>{children}</Box>
      <Text>{char.repeat(width + 10)}</Text>
    </Box>
  )
  const boxLines = (frame: string) => {
    const lines = plain(frame).split("\n")
    const top = lines.findIndex((line) => line.startsWith("╭"))
    const bottom = lines.findIndex((line) => line.startsWith("╰"))
    return lines.slice(top, bottom + 1)
  }
  const expectSealed = (frame: string | undefined, width: number) => {
    const lines = boxLines(plain(frame))
    expect(lines.length).toBeGreaterThan(2)
    for (const line of lines) {
      // The box is the only border on screen, so the first closing border
      // past the opening one ends its columns; the host fills the rest.
      const end = 1 + line.slice(1).search(/[╮│╯]/)
      const box = line.slice(0, end + 1)
      expect(box).not.toContain("X") // no host row shows through
      expect(stringWidth(box)).toBe(width) // every cell painted
    }
  }

  it("seals the prompt, rules, grouped rows and hints with items", () => {
    const frame = render(
      <OverHost width={60}>
        <StaticHost />
      </OverHost>,
    ).lastFrame()
    expectSealed(frame, 60)
    expect(plain(frame)).toMatch(/↑↓ move {2}⏎ select {2}esc close/)
  })

  it("seals short rows at a narrow width", () => {
    const frame = render(
      <OverHost width={40}>
        <CommandPalette
          items={[
            { id: "a", title: "a" },
            { id: "b", title: "bb", hint: "c" },
          ]}
          query=""
          onQueryChange={() => {}}
          onSelect={() => {}}
          width={40}
        />
      </OverHost>,
    ).lastFrame()
    expectSealed(frame, 40)
  })

  it("seals the flattened rows while typing", async () => {
    const { stdin, lastFrame } = render(
      <OverHost width={60}>
        <StaticHost />
      </OverHost>,
    )
    stdin.write("co")
    await delay()
    const frame = plain(lastFrame())
    expect(frame).toContain("❯ config")
    expectSealed(frame, 60)
  })

  it("seals the message slot and the counter while scrolling", async () => {
    const many: PaletteItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: `item-${i}`,
      title: `item ${i}`,
    }))
    const scrolled = render(
      <OverHost width={60}>
        <CommandPalette
          items={many}
          query=""
          onQueryChange={() => {}}
          onSelect={() => {}}
          maxRows={5}
        />
      </OverHost>,
    ).lastFrame()
    expect(plain(scrolled)).toContain("1 of 30")
    expectSealed(scrolled, 60)

    const { stdin, lastFrame } = render(
      <OverHost width={60}>
        <DerivingHost />
      </OverHost>,
    )
    stdin.write("nope")
    await delay()
    const frame = plain(lastFrame())
    expect(frame).toContain('no ticket matches "nope"')
    expectSealed(frame, 60)
  })

  it("draws emptyHint once, dimmed, while waiting for the first query", async () => {
    const idle = render(
      <OverHost width={60}>
        <CommandPalette
          items={[]}
          query=""
          onQueryChange={() => {}}
          onSelect={() => {}}
          emptyHint="type a ticket key"
        />
      </OverHost>,
    ).lastFrame()
    expect(plain(idle)).toContain("type a ticket key")
    expectSealed(idle, 60)
  })

  it("hides emptyHint once there is a query, rows, or a message", async () => {
    const Host = ({ initial }: { initial: string }) => {
      const [value, setValue] = useState(initial)
      const items = value === "a" ? [{ id: "a", title: "a hit" }] : []
      return (
        <CommandPalette
          items={items}
          query={value}
          onQueryChange={setValue}
          onSelect={() => {}}
          message={
            value && !items.length ? `nothing for "${value}"` : undefined
          }
          emptyHint="type a ticket key"
        />
      )
    }
    const idle = render(
      <OverHost width={60}>
        <Host initial="" />
      </OverHost>,
    ).lastFrame()
    expect(plain(idle)).toContain("type a ticket key")

    const rows = render(
      <OverHost width={60}>
        <Host initial="a" />
      </OverHost>,
    ).lastFrame()
    expect(plain(rows)).toContain("a hit")
    expect(plain(rows)).not.toContain("type a ticket key")
    expectSealed(rows, 60)

    const { stdin, lastFrame } = render(
      <OverHost width={60}>
        <Host initial="" />
      </OverHost>,
    )
    stdin.write("z")
    await delay()
    const frame = plain(lastFrame())
    expect(frame).toContain('nothing for "z"') // the message wins
    expect(frame).not.toContain("type a ticket key")
    expectSealed(frame, 60)
  })

  it("keeps a string message muted, with no glyph", () => {
    const frame = render(
      <CommandPalette
        items={[]}
        query="x"
        onQueryChange={() => {}}
        onSelect={() => {}}
        message={{ text: 'nothing for "x"', tone: "muted" }}
      />,
    ).lastFrame()
    expect(plain(frame)).toContain('nothing for "x"')
    expect(plain(frame)).not.toContain("✗")
  })

  it("draws an error-toned message behind the error glyph, sealed", () => {
    const frame = render(
      <OverHost width={60}>
        <CommandPalette
          items={[]}
          query="acme/api#12"
          onQueryChange={() => {}}
          onSelect={() => {}}
          message={{ text: "couldn't look up acme/api#12", tone: "error" }}
        />
      </OverHost>,
    ).lastFrame()
    expect(plain(frame)).toContain("✗ couldn't look up acme/api#12")
    expectSealed(frame, 60)
  })

  it("runs the message's onSubmit on Enter when there are no rows", async () => {
    const onSubmit = vi.fn()
    const onSelect = vi.fn()
    const { stdin } = render(
      <CommandPalette
        items={[]}
        query="acme/api#12"
        onQueryChange={() => {}}
        onSelect={onSelect}
        message={{ text: "failed", tone: "error", onSubmit }}
      />,
    )
    await delay()
    stdin.write("\r")
    await delay()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
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
