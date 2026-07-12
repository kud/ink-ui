import { describe, it, expect } from "vitest"
import { buildAppleScript } from "./notify.js"

describe("buildAppleScript", () => {
  it("builds a bare notification", () => {
    expect(buildAppleScript("hello")).toBe('display notification "hello"')
  })

  it("adds title, subtitle, and a named sound", () => {
    expect(
      buildAppleScript("msg", {
        title: "Title",
        subtitle: "Sub",
        sound: "Glass",
      }),
    ).toBe(
      'display notification "msg" with title "Title" subtitle "Sub" sound name "Glass"',
    )
  })

  it("uses the default sound name when sound is true", () => {
    expect(buildAppleScript("m", { sound: true })).toContain(
      'sound name "default"',
    )
  })

  it("escapes quotes and backslashes", () => {
    expect(buildAppleScript('say "hi"')).toBe(
      'display notification "say \\"hi\\""',
    )
  })
})
