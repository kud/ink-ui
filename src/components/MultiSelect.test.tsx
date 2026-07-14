import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { MultiSelect } from "./MultiSelect.js"

const options = [
  { label: "First", value: "first" },
  { label: "Second", value: "second" },
  { label: "Third", value: "third" },
]

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("MultiSelect", () => {
  it("renders every option unselected (no tick) by default", () => {
    const { lastFrame } = render(<MultiSelect options={options} />)
    const frame = lastFrame() ?? ""
    expect(frame).not.toContain("✓")
  })

  it("reflects defaultValue as selected (✓)", () => {
    const { lastFrame } = render(
      <MultiSelect options={options} defaultValue={["second"]} />,
    )
    expect(lastFrame()).toContain("✓")
  })

  it("toggles selection with space and fires onChange", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(
      <MultiSelect options={options} onChange={onChange} />,
    )
    stdin.write(" ") // toggle First on
    await delay()
    expect(lastFrame()).toContain("✓")
    expect(onChange).toHaveBeenCalledWith(["first"])
  })

  it("submits the selected values on Enter", async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(
      <MultiSelect options={options} onSubmit={onSubmit} />,
    )
    stdin.write(" ") // First on
    await delay()
    stdin.write("\u001B[B") // down to Second
    await delay()
    stdin.write(" ") // Second on
    await delay()
    stdin.write("\r") // Enter
    await delay()
    expect(onSubmit).toHaveBeenCalledWith(["first", "second"])
  })
})
