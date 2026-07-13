import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { EmailInput } from "./EmailInput.js"

const CR = String.fromCharCode(13) // Enter
const TAB = String.fromCharCode(9)
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("EmailInput", () => {
  it("shows the placeholder when empty", () => {
    const { lastFrame } = render(<EmailInput placeholder="you@example.com" />)
    expect(lastFrame()).toContain("you@example.com")
  })

  it("previews a domain completion after @", async () => {
    const { stdin, lastFrame } = render(<EmailInput />)
    stdin.write("a@gm")
    await delay()
    // The cursor highlights the first ghost char ("a"); the rest of the
    // completion is a contiguous dim tail.
    expect(lastFrame()).toContain("il.com")
  })

  it("accepts the suggestion on Tab", async () => {
    const onChange = vi.fn()
    const { stdin } = render(<EmailInput onChange={onChange} />)
    stdin.write("a@gm")
    await delay()
    stdin.write(TAB)
    await delay()
    expect(onChange).toHaveBeenLastCalledWith("a@gmail.com")
  })

  it("submits the current value on Enter", async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(<EmailInput onSubmit={onSubmit} />)
    stdin.write("me@proton.me")
    await delay()
    stdin.write(CR)
    await delay()
    expect(onSubmit).toHaveBeenCalledWith("me@proton.me")
  })
})
