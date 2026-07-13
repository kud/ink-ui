import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { PasswordInput } from "./PasswordInput.js"

const CR = String.fromCharCode(13) // Enter
const DEL = String.fromCharCode(127) // Backspace
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("PasswordInput", () => {
  it("shows the placeholder when empty", () => {
    const { lastFrame } = render(<PasswordInput placeholder="Password" />)
    expect(lastFrame()).toContain("Password")
  })

  it("masks typed characters but reports the real value", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(<PasswordInput onChange={onChange} />)
    stdin.write("secret")
    await delay()
    expect(lastFrame()).not.toContain("secret")
    expect(lastFrame()).toContain("******")
    expect(onChange).toHaveBeenLastCalledWith("secret")
  })

  it("removes the character before the cursor on backspace", async () => {
    const onChange = vi.fn()
    const { stdin } = render(<PasswordInput onChange={onChange} />)
    stdin.write("abc")
    await delay()
    stdin.write(DEL)
    await delay()
    expect(onChange).toHaveBeenLastCalledWith("ab")
  })

  it("submits the real value on Enter", async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(<PasswordInput onSubmit={onSubmit} />)
    stdin.write("hunter2")
    await delay()
    stdin.write(CR)
    await delay()
    expect(onSubmit).toHaveBeenCalledWith("hunter2")
  })
})
