import React from "react"
import { Text } from "ink"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { OrderedList } from "./OrderedList.js"

describe("OrderedList", () => {
  it("numbers items sequentially", () => {
    const { lastFrame } = render(
      <OrderedList>
        <OrderedList.Item>
          <Text>First</Text>
        </OrderedList.Item>
        <OrderedList.Item>
          <Text>Second</Text>
        </OrderedList.Item>
        <OrderedList.Item>
          <Text>Third</Text>
        </OrderedList.Item>
      </OrderedList>,
    )
    const frame = lastFrame()
    expect(frame).toContain("1. First")
    expect(frame).toContain("2. Second")
    expect(frame).toContain("3. Third")
  })

  it("restarts numbering for a nested list", () => {
    const { lastFrame } = render(
      <OrderedList>
        <OrderedList.Item>
          <Text>Parent</Text>
          <OrderedList>
            <OrderedList.Item>
              <Text>Nested</Text>
            </OrderedList.Item>
          </OrderedList>
        </OrderedList.Item>
      </OrderedList>,
    )
    const frame = lastFrame()
    expect(frame).toContain("1. Parent")
    expect(frame).toContain("1. Nested")
  })
})
