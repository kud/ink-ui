import React from "react"
import { Text } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { UnorderedList } from "./UnorderedList.js"

describe("UnorderedList", () => {
  it("renders each item with a bullet marker", () => {
    const { lastFrame } = render(
      <UnorderedList>
        <UnorderedList.Item>
          <Text>Alpha</Text>
        </UnorderedList.Item>
        <UnorderedList.Item>
          <Text>Beta</Text>
        </UnorderedList.Item>
      </UnorderedList>,
    )
    const frame = lastFrame()
    expect(frame).toContain("● Alpha")
    expect(frame).toContain("● Beta")
  })

  it("uses a distinct marker when nested", () => {
    const { lastFrame } = render(
      <UnorderedList>
        <UnorderedList.Item>
          <Text>Parent</Text>
          <UnorderedList>
            <UnorderedList.Item>
              <Text>Child</Text>
            </UnorderedList.Item>
          </UnorderedList>
        </UnorderedList.Item>
      </UnorderedList>,
    )
    const frame = lastFrame()
    expect(frame).toContain("● Parent")
    expect(frame).toContain("○ Child")
  })
})
