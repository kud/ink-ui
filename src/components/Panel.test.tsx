import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Text } from "ink"
import { Panel } from "./Panel.js"

describe("Panel", () => {
  it("renders its title and children inside a rounded border", () => {
    const { lastFrame } = render(
      <Panel title="Jobs">
        <Text>content</Text>
      </Panel>,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Jobs")
    expect(frame).toContain("content")
    expect(frame).toMatch(/[╭╮╰╯]/) // rounded border corners drawn
  })

  it("adds a ● marker to the title when focused", () => {
    const { lastFrame } = render(
      <Panel title="Jobs" focused>
        <Text>x</Text>
      </Panel>,
    )
    expect(lastFrame() ?? "").toContain("Jobs ●")
  })

  it("omits the header row when no title is given", () => {
    const { lastFrame } = render(
      <Panel>
        <Text>bare</Text>
      </Panel>,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("bare")
    expect(frame).not.toContain("●")
  })
})
