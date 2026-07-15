import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Text } from "ink"
import { Columns } from "./Columns.js"

describe("Columns", () => {
  it("lays its children out side by side on the same row", () => {
    const { lastFrame } = render(
      <Columns>
        <Text>left</Text>
        <Text>right</Text>
      </Columns>,
    )
    // Side by side means both land on the first rendered line, not stacked.
    const firstLine = (lastFrame() ?? "").split("\n")[0]
    expect(firstLine).toContain("left")
    expect(firstLine).toContain("right")
  })
})
