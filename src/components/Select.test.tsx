import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { Select } from "./Select.js"

const options = [
  { label: "First", value: "first" },
  { label: "Second", value: "second" },
  { label: "Third", value: "third" },
]

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("Select", () => {
  it("renders all options with the cursor on the first", () => {
    const { lastFrame } = render(<Select options={options} />)
    const frame = lastFrame() ?? ""
    expect(frame).toContain("First")
    expect(frame).toContain("Third")
    expect(frame).toContain("❯ First")
    expect(frame).toContain("✓") // the cursor row carries a trailing tick
  })

  it("moves the cursor with arrow keys and fires onChange", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(
      <Select options={options} onChange={onChange} />,
    )
    stdin.write("\u001B[B") // down arrow
    await delay()
    expect(lastFrame()).toContain("❯ Second")
    expect(onChange).toHaveBeenCalledWith("second")
  })

  it("fires onSubmit with the highlighted value on Enter", async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(<Select options={options} onSubmit={onSubmit} />)
    stdin.write("\u001B[B") // down -> Second
    await delay()
    stdin.write("\r") // Enter
    await delay()
    expect(onSubmit).toHaveBeenCalledWith("second")
  })

  it("wraps from first to last on up arrow", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(
      <Select options={options} onChange={onChange} />,
    )
    stdin.write("\u001B[A") // up from First wraps to Third
    await delay()
    expect(lastFrame()).toContain("❯ Third")
    expect(onChange).toHaveBeenCalledWith("third")
  })
})
