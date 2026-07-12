import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { ConfirmInput } from "./ConfirmInput.js"

const CR = String.fromCharCode(13) // Enter
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("ConfirmInput", () => {
  it("shows the default choice capitalised", () => {
    expect(
      render(<ConfirmInput defaultChoice="confirm" />).lastFrame(),
    ).toContain("(Y/n)")
    expect(
      render(<ConfirmInput defaultChoice="cancel" />).lastFrame(),
    ).toContain("(y/N)")
  })

  it("calls onConfirm when 'y' is pressed", async () => {
    const onConfirm = vi.fn()
    const { stdin } = render(<ConfirmInput onConfirm={onConfirm} />)
    stdin.write("y")
    await delay()
    expect(onConfirm).toHaveBeenCalled()
  })

  it("calls onCancel when 'n' is pressed", async () => {
    const onCancel = vi.fn()
    const { stdin } = render(<ConfirmInput onCancel={onCancel} />)
    stdin.write("n")
    await delay()
    expect(onCancel).toHaveBeenCalled()
  })

  it("Enter selects the default choice", async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin } = render(
      <ConfirmInput
        defaultChoice="cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    stdin.write(CR)
    await delay()
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
