import { describe, it, expect } from "vitest"
import { Box, Text } from "ink"
import { render } from "ink-testing-library"
import { SelectableRow } from "./SelectableRow.js"

describe("SelectableRow", () => {
  it("marks the active row and leaves the others plain", () => {
    const { lastFrame } = render(
      <Box flexDirection="column">
        <SelectableRow active>one</SelectableRow>
        <SelectableRow>two</SelectableRow>
      </Box>,
    )
    const [first, second] = (lastFrame() ?? "").split("\n")
    expect(first).toContain("❯")
    expect(second).not.toContain("❯")
  })

  // A row long enough to overflow its container compresses every flexible
  // child, and the gutter is only four characters wide — so it used to lose a
  // column and drag the whole row one place left. Short fixtures never overflow
  // and so never caught it; the narrow wrapper here is load-bearing.
  it("keeps its gutter width when the content overflows the container", () => {
    const WIDTH = 40
    const { lastFrame } = render(
      <Box width={WIDTH} flexDirection="column">
        <SelectableRow>
          <Text wrap="truncate-end">short</Text>
        </SelectableRow>
        <SelectableRow>
          <Text wrap="truncate-end">{"x".repeat(200)}</Text>
        </SelectableRow>
      </Box>,
    )

    const lines = (lastFrame() ?? "").split("\n").filter(Boolean)
    const indents = lines.map((line) => line.length - line.trimStart().length)
    expect(new Set(indents).size).toBe(1)
  })

  it("keeps the active gutter aligned with inactive ones when overflowing", () => {
    const WIDTH = 40
    const { lastFrame } = render(
      <Box width={WIDTH} flexDirection="column">
        <SelectableRow active>
          <Text wrap="truncate-end">{"y".repeat(200)}</Text>
        </SelectableRow>
        <SelectableRow>
          <Text wrap="truncate-end">{"z".repeat(200)}</Text>
        </SelectableRow>
      </Box>,
    )

    const lines = (lastFrame() ?? "").split("\n").filter(Boolean)
    // The active row spends two of its four gutter cells on "  ❯ ", so its
    // content starts at the same column as an inactive row's four spaces.
    const contentAt = lines.map((line) => line.search(/[yz]/))
    expect(contentAt.every((at) => at > 0)).toBe(true)
    expect(new Set(contentAt).size).toBe(1)
  })
})
