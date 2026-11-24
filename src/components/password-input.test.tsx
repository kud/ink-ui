import React from "react"
import { EventEmitter } from "node:events"
import { render as inkRender, Text, useInput } from "ink"
import { render } from "ink-testing-library"
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }))

const { spawnSync } = await import("node:child_process")
const { PasswordInput } = await import("./password-input.js")

const CR = String.fromCharCode(13) // Enter
const DEL = String.fromCharCode(127) // Backspace
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

describe("PasswordInput (masked)", () => {
  it("shows the placeholder when empty", () => {
    const { lastFrame } = render(
      <PasswordInput secure={false} placeholder="Password" />,
    )
    expect(lastFrame()).toContain("Password")
  })

  it("masks typed characters but reports the real value", async () => {
    const onChange = vi.fn()
    const { stdin, lastFrame } = render(
      <PasswordInput secure={false} onChange={onChange} />,
    )
    stdin.write("secret")
    await delay()
    expect(lastFrame()).not.toContain("secret")
    expect(lastFrame()).toContain("******")
    expect(onChange).toHaveBeenLastCalledWith("secret")
  })

  it("removes the character before the cursor on backspace", async () => {
    const onChange = vi.fn()
    const { stdin } = render(
      <PasswordInput secure={false} onChange={onChange} />,
    )
    stdin.write("abc")
    await delay()
    stdin.write(DEL)
    await delay()
    expect(onChange).toHaveBeenLastCalledWith("ab")
  })

  it("submits the real value on Enter", async () => {
    const onSubmit = vi.fn()
    const { stdin } = render(
      <PasswordInput secure={false} onSubmit={onSubmit} />,
    )
    stdin.write("hunter2")
    await delay()
    stdin.write(CR)
    await delay()
    expect(onSubmit).toHaveBeenCalledWith("hunter2")
  })
})

// A terminal on fd 0 that records raw mode, as a real tty.ReadStream does.
class FakeTty extends EventEmitter {
  isTTY = true
  fd = 0
  isRaw = false
  setRawMode = vi.fn((on: boolean) => {
    this.isRaw = on
    return this
  })
  setEncoding() {}
  ref() {}
  unref() {}
  resume = vi.fn()
  pause = vi.fn()
  read() {
    return null
  }
}

class FakeStdout extends EventEmitter {
  columns = 100
  rows = 24
  lastFrame = ""
  write = (frame: string) => {
    this.lastFrame = frame
    return true
  }
}

const mount = (node: React.ReactElement) => {
  const stdin = new FakeTty()
  const stdout = new FakeStdout()
  const instance = inkRender(node, {
    stdin: stdin as unknown as NodeJS.ReadStream,
    stdout: stdout as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  })
  return { stdin, stdout, instance }
}

const sttyCalls = () =>
  vi
    .mocked(spawnSync)
    .mock.calls.map(([, args]) => (args as string[]).join(" "))

describe("PasswordInput (secure)", () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation(((
      _cmd: string,
      args: string[],
    ) => ({
      status: 0,
      stdout: args[0] === "-g" ? "saved-settings\n" : "",
    })) as unknown as typeof spawnSync)
  })
  afterEach(() => {
    vi.mocked(spawnSync).mockReset()
  })

  it("turns echo off without raw mode, and restores the saved settings on unmount", async () => {
    const { stdin, instance } = mount(<PasswordInput placeholder="Password" />)
    await delay()
    expect(sttyCalls()).toEqual(["-g", "-echo"])
    expect(stdin.setRawMode).not.toHaveBeenCalledWith(true)
    expect(stdin.isRaw).toBe(false)
    instance.unmount()
    expect(sttyCalls()).toEqual(["-g", "-echo", "saved-settings"])
  })

  it("runs stty against the terminal Ink reads from", async () => {
    const { instance } = mount(<PasswordInput />)
    await delay()
    const [cmd, , options] = vi.mocked(spawnSync).mock.calls[1]!
    expect(cmd).toBe("stty")
    expect((options as { stdio: unknown[] }).stdio[0]).toBe(0)
    instance.unmount()
  })

  it("submits the line without its ending and draws none of it", async () => {
    const onSubmit = vi.fn()
    const onChange = vi.fn()
    const { stdin, stdout, instance } = mount(
      <PasswordInput
        placeholder="Password"
        onSubmit={onSubmit}
        onChange={onChange}
      />,
    )
    await delay()
    stdin.emit("data", Buffer.from("hunter2\r\n"))
    await delay()
    expect(onSubmit).toHaveBeenCalledWith("hunter2")
    expect(onChange).toHaveBeenCalledWith("hunter2")
    expect(stdout.lastFrame).not.toContain("hunter2")
    expect(stdout.lastFrame).not.toContain("*")
    expect(stdout.lastFrame).toContain("input hidden")
    instance.unmount()
  })

  it("restores echo and re-raises the signal on Ctrl-C", async () => {
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true)
    const { instance } = mount(<PasswordInput />)
    await delay()
    process.emit("SIGINT", "SIGINT")
    expect(sttyCalls()).toEqual(["-g", "-echo", "saved-settings"])
    expect(kill).toHaveBeenCalledWith(process.pid, "SIGINT")
    kill.mockRestore()
    instance.unmount()
    expect(sttyCalls()).toHaveLength(3)
  })

  it("falls back to plain `stty echo` when the snapshot failed", async () => {
    vi.mocked(spawnSync).mockImplementation(((
      _cmd: string,
      args: string[],
    ) => ({
      status: args[0] === "-g" ? 1 : 0,
      stdout: "",
    })) as unknown as typeof spawnSync)
    const { instance } = mount(<PasswordInput />)
    await delay()
    instance.unmount()
    expect(sttyCalls()).toEqual(["-g", "-echo", "echo"])
  })

  it("leaves the terminal alone while disabled", async () => {
    const { instance } = mount(<PasswordInput isDisabled />)
    await delay()
    expect(spawnSync).not.toHaveBeenCalled()
    instance.unmount()
  })

  it("falls back to the masked field while another input holds raw mode", async () => {
    const Other = () => {
      useInput(() => {})
      return <Text>other</Text>
    }
    const { stdout, instance } = mount(
      <>
        <Other />
        <PasswordInput />
      </>,
    )
    await delay(200)
    expect(spawnSync).not.toHaveBeenCalled()
    expect(stdout.lastFrame).not.toContain("input hidden")
    instance.unmount()
  })

  it("falls back to the masked field when echo cannot be turned off", async () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: "" } as never)
    const onChange = vi.fn()
    const { stdin, instance } = mount(<PasswordInput onChange={onChange} />)
    await delay()
    stdin.emit("readable")
    expect(sttyCalls()).toEqual(["-g", "-echo"])
    await delay()
    expect(stdin.setRawMode).toHaveBeenCalledWith(true)
    instance.unmount()
  })
})
