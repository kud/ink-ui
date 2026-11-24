import React from "react"
import { Box, Text } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Divider, Spacer, dividerLine } from "./divider.js"

describe("dividerLine", () => {
  it("draws each weight from box-drawing", () => {
    expect(dividerLine(4)).toBe("────")
    expect(dividerLine(4, { variant: "heavy" })).toBe("━━━━")
    expect(dividerLine(4, { variant: "double" })).toBe("════")
    expect(dividerLine(4, { variant: "dashed" })).toBe("╌╌╌╌")
  })

  it("centres a label and keeps the total width exact", () => {
    const line = dividerLine(20, { label: "Done" })
    expect(line).toBe("─────── Done ───────")
    expect([...line].length).toBe(20)
    expect(line.indexOf(" Done ")).toBe(7)
  })

  it("aligns a label left or right with a short lead of rule", () => {
    expect(dividerLine(12, { label: "A", align: "left" })).toBe("── A ───────")
    expect(dividerLine(12, { label: "A", align: "right" })).toBe("─────── A ──")
  })

  it("drops a label that cannot fit rather than overflowing", () => {
    expect(dividerLine(5, { label: "Too long" })).toBe("─────")
  })
})

describe("Divider", () => {
  it("fills its parent when no width is given", () => {
    const { lastFrame } = render(
      <Box width={10}>
        <Divider />
      </Box>,
    )
    expect(lastFrame()).toBe("──────────")
  })

  it("sets a label into a fluid rule", () => {
    const { lastFrame } = render(
      <Box width={16}>
        <Divider label="Log" variant="heavy" />
      </Box>,
    )
    expect(lastFrame()).toBe("━━━━━━ Log ━━━━━")
  })

  it("renders an exact width when asked", () => {
    const { lastFrame } = render(<Divider width={12} label="A" align="left" variant="double" />)
    expect(lastFrame()).toBe("══ A ═══════")
  })
})

describe("Spacer", () => {
  it("pushes siblings apart when bare", () => {
    const { lastFrame } = render(
      <Box width={10}>
        <Text>a</Text>
        <Spacer />
        <Text>b</Text>
      </Box>,
    )
    expect(lastFrame()).toBe("a        b")
  })

  it("holds a fixed gap from the spacing scale", () => {
    const { lastFrame } = render(
      <Box flexDirection="column">
        <Text>a</Text>
        <Spacer size="sm" />
        <Text>b</Text>
      </Box>,
    )
    expect(lastFrame()).toBe("a\n\n\nb")
  })

  it("holds a fixed horizontal gap in a row", () => {
    const { lastFrame } = render(
      <Box>
        <Text>a</Text>
        <Spacer size={3} axis="horizontal" />
        <Text>b</Text>
      </Box>,
    )
    expect(lastFrame()).toBe("a   b")
  })
})
