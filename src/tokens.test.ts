import { describe, it, expect } from "vitest"
import { palette, colors, priorityColors } from "./tokens.js"

// Mirrors ansi-styles 6 `rgbToAnsi256`, which chalk (and so Ink) uses to
// downsample a hex on a 256-colour terminal: an exact grey goes to the
// 24-step ramp, anything else rounds each channel onto the 6×6×6 cube.
const toAnsi256 = (hex: string): number => {
  const [red, green, blue] = [1, 3, 5].map((at) =>
    parseInt(hex.slice(at, at + 2), 16),
  ) as [number, number, number]

  if (red === green && green === blue) {
    if (red < 8) return 16
    if (red > 248) return 231
    return Math.round(((red - 8) / 247) * 24) + 232
  }

  return (
    16 +
    36 * Math.round((red / 255) * 5) +
    6 * Math.round((green / 255) * 5) +
    Math.round((blue / 255) * 5)
  )
}

const isNeutral256 = (index: number): boolean => {
  if (index >= 232) return true
  const cube = index - 16
  const [r, g, b] = [Math.floor(cube / 36), Math.floor(cube / 6) % 6, cube % 6]
  return r === g && g === b
}

const status = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
}
const identifiers = { ticket: colors.ticket, pr: colors.pr }
const hues = {
  accent: colors.accent,
  ...identifiers,
  ...status,
  link: colors.link,
  group: colors.group,
}

const expectApartAt256 = (
  left: Record<string, string>,
  right: Record<string, string>,
) => {
  for (const [leftName, leftHex] of Object.entries(left)) {
    for (const [rightName, rightHex] of Object.entries(right)) {
      expect(
        toAnsi256(leftHex),
        `${leftName} ${leftHex} vs ${rightName} ${rightHex}`,
      ).not.toBe(toAnsi256(rightHex))
    }
  }
}

describe("toAnsi256", () => {
  it("matches known xterm-256 indices", () => {
    expect(toAnsi256("#FF8C00")).toBe(214)
    expect(toAnsi256("#999999")).toBe(246)
    expect(toAnsi256("#000000")).toBe(16)
    expect(toAnsi256("#FFFFFF")).toBe(231)
  })
})

describe("the never-share-a-hue pairs survive 256-colour downsampling", () => {
  it("accent and ticket", () => {
    expectApartAt256({ accent: colors.accent }, { ticket: colors.ticket })
  })

  it("identifiers and status", () => {
    expectApartAt256(identifiers, status)
  })

  it("priority and status", () => {
    expectApartAt256(priorityColors, status)
  })

  it("ticket and pr", () => {
    expectApartAt256({ ticket: colors.ticket }, { pr: colors.pr })
  })

  it("success and warning", () => {
    expectApartAt256({ success: colors.success }, { warning: colors.warning })
  })

  it("pending and every hue", () => {
    expectApartAt256({ pending: colors.pending }, hues)
  })

  it("pending stays neutral", () => {
    expect(isNeutral256(toAnsi256(colors.pending))).toBe(true)
  })

  it("warning amber against both the pr orange and the ticket yellow", () => {
    expectApartAt256(
      { warning: colors.warning },
      { pr: colors.pr, ticket: colors.ticket },
    )
  })
})

describe("colors", () => {
  it("keeps every pre-0.36 key", () => {
    for (const key of [
      "accent",
      "secondary",
      "muted",
      "success",
      "error",
      "warning",
      "info",
      "group",
      "track",
      "trackHighlight",
    ]) {
      expect(colors).toHaveProperty(key)
    }
  })

  it("is hex only and every value comes from the palette", () => {
    const paletteHexes = new Set<string>(Object.values(palette))
    for (const [key, value] of Object.entries(colors)) {
      expect(value, key).toMatch(/^#[0-9A-F]{6}$/)
      expect(paletteHexes.has(value), key).toBe(true)
    }
  })
})
