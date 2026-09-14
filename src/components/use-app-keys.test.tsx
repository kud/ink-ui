import React from "react"
import { Text, useApp } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect, vi } from "vitest"
import { useAppKeys } from "./use-app-keys.js"

const ESC = String.fromCharCode(27)
const DEL = String.fromCharCode(127) // what the Backspace key sends
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

type Opts = Parameters<typeof useAppKeys>[0]

const Host = ({ opts, onExit }: { opts: Opts; onExit?: () => void }) => {
  const { exit } = useApp()
  useAppKeys({ ...opts, onQuit: opts?.onQuit ?? (() => (onExit?.(), exit())) })
  return <Text>host</Text>
}

describe("useAppKeys", () => {
  it("quits on q from anywhere", async () => {
    const onQuit = vi.fn()
    const { stdin } = render(<Host opts={{ onQuit }} />)
    stdin.write("q")
    await delay()
    expect(onQuit).toHaveBeenCalledOnce()
  })

  it("routes esc and backspace to the host's peel", async () => {
    const onBack = vi.fn(() => true)
    const { stdin } = render(<Host opts={{ onBack }} />)
    stdin.write(ESC)
    await delay()
    stdin.write(DEL)
    await delay()
    expect(onBack).toHaveBeenCalledTimes(2)
  })

  it("does nothing at the root by default, even with nothing to pop", async () => {
    const onQuit = vi.fn()
    const onBack = vi.fn(() => false)
    const { stdin } = render(<Host opts={{ onBack, onQuit }} />)
    stdin.write(ESC)
    await delay()
    expect(onBack).toHaveBeenCalledOnce()
    expect(onQuit).not.toHaveBeenCalled()
  })

  it("quits at the root only when asked to", async () => {
    const onQuit = vi.fn()
    const { stdin } = render(<Host opts={{ onQuit, atRoot: "quit" }} />)
    stdin.write(ESC)
    await delay()
    expect(onQuit).toHaveBeenCalledOnce()
  })

  it("treats a void return from onBack as handled", async () => {
    const onQuit = vi.fn()
    const { stdin } = render(
      <Host opts={{ onBack: () => {}, onQuit, atRoot: "quit" }} />,
    )
    stdin.write(ESC)
    await delay()
    expect(onQuit).not.toHaveBeenCalled()
  })

  it("stands down while a text field has focus, so q types and backspace deletes", async () => {
    const onQuit = vi.fn()
    const onBack = vi.fn()
    const { stdin } = render(
      <Host opts={{ onQuit, onBack, isActive: false }} />,
    )
    stdin.write("q")
    stdin.write(DEL)
    await delay()
    expect(onQuit).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
  })
})
