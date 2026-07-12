import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { TextInput } from "./TextInput.js"

const CR = String.fromCharCode(13) // Enter
const DEL = String.fromCharCode(127) // Backspace
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("TextInput", () => {
  it("shows the placeholder when empty", () => {
    const { lastFrame } = render(<TextInput placeholder="Search…" />)
    expect(lastFrame()).toContain("Search…")
  })

  it("inserts typed characters and fires onChange", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(<TextInput onChange={onChange} />)
    stdin.write("hi")
    await delay()
    expect(lastFrame()).toContain("hi")
    expect(onChange).toHaveBeenLastCalledWith("hi")
  })

  it("removes the character before the cursor on backspace", async () => {
    const onChange = vi.fn()
    const { stdin } = render(
      <TextInput defaultValue="hi" onChange={onChange} />,
    )
    stdin.write(DEL)
    await delay()
    expect(onChange).toHaveBeenLastCalledWith("h")
  })

  it("submits the current value on Enter", async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(
      <TextInput defaultValue="ready" onSubmit={onSubmit} />,
    )
    stdin.write(CR)
    await delay()
    expect(onSubmit).toHaveBeenCalledWith("ready")
  })
})
