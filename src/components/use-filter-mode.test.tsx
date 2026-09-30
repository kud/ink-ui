import React from "react"
import { Text, useInput } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { useFilterMode } from "./use-filter-mode.js"
import { FilterBar } from "./filter-bar.js"
import { useListCursor } from "./use-list-cursor.js"

const ESC = String.fromCharCode(27)
const DEL = String.fromCharCode(127)
const DOWN = `${ESC}[B`
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

/*
 * A host wired the way AGENTS.md says to wire one: the filter owns typing, the
 * cursor keeps the arrows but gives up j/k while typing, and a hotkey handler
 * stands down while the field is open. `c` is the stand-in for any letter
 * command — the whole reason the kept mode exists is that it fires there and
 * types here.
 */
const Host = ({
  onHotkey,
  onChange,
}: {
  onHotkey?: (key: string) => void
  onChange?: (term: string | null) => void
}) => {
  const filter = useFilterMode({ onChange })
  const { cursor } = useListCursor(5, { vimKeys: !filter.typing })
  useInput(
    (input) => {
      if (input === "c") onHotkey?.(input)
    },
    { isActive: !filter.typing },
  )
  return (
    <>
      <FilterBar term={filter.term} typing={filter.typing} matches={2} />
      <Text>{`cursor ${cursor} · ${filter.hints.map(([k, l]) => `${k} ${l}`).join(" · ")}`}</Text>
    </>
  )
}

const press = async (
  stdin: { write: (s: string) => void },
  ...keys: string[]
) => {
  for (const k of keys) {
    stdin.write(k)
    await delay()
  }
}

describe("useFilterMode", () => {
  it("types letters into the term while the field is open, hotkeys included", async () => {
    const onHotkey = vi.fn()
    const { stdin, lastFrame } = render(<Host onHotkey={onHotkey} />)
    await press(stdin, "/", "c", "j")
    expect(lastFrame()).toContain("/ cj▏")
    expect(onHotkey).not.toHaveBeenCalled()
  })

  it("keeps the filter on ↵ and hands the letters back to the host", async () => {
    const onHotkey = vi.fn()
    const { stdin, lastFrame } = render(<Host onHotkey={onHotkey} />)
    await press(stdin, "/", "p", "\r", "c")
    expect(lastFrame()).toContain("/ p")
    expect(lastFrame()).not.toContain("▏")
    expect(lastFrame()).toContain("/ edit")
    expect(onHotkey).toHaveBeenCalledOnce()
  })

  /*
   * The regression this hook was extracted to end: `/` over a kept filter used
   * to open an empty field, so changing the query meant typing it again.
   */
  it("resumes the kept term on / instead of starting over", async () => {
    const { stdin, lastFrame } = render(<Host />)
    await press(stdin, "/", "p", "\r", "/", "u")
    expect(lastFrame()).toContain("/ pu▏")
  })

  it("clears the term and leaves the field on esc while typing", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(<Host onChange={onChange} />)
    await press(stdin, "/", "p", ESC)
    expect(lastFrame()).not.toContain("/ p")
    expect(lastFrame()).toContain("/ filter")
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it("deletes on backspace", async () => {
    const { stdin, lastFrame } = render(<Host />)
    await press(stdin, "/", "a", "b", DEL)
    expect(lastFrame()).toContain("/ a▏")
  })

  it("drops an empty term on ↵ rather than keeping a filter of nothing", async () => {
    const { stdin, lastFrame } = render(<Host />)
    await press(stdin, "/", "\r")
    expect(lastFrame()).toContain("/ filter")
  })

  // The arrows still walk the list from inside the field; j/k do not.
  it("leaves ↑↓ to the list cursor while typing", async () => {
    const { stdin, lastFrame } = render(<Host />)
    await press(stdin, "/", DOWN, "j")
    expect(lastFrame()).toContain("cursor 1")
    expect(lastFrame()).toContain("/ j▏")
  })
})
