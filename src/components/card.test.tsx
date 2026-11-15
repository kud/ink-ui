import React from "react"
import { render } from "ink-testing-library"
import { describe, it, expect } from "vitest"
import { Card, CARD_HEIGHT } from "./card.js"

const frameOf = (node: React.ReactElement) => render(node).lastFrame() ?? ""

describe("Card", () => {
  const baseProps = {
    title: "Service Alpha",
    status: { glyph: "●", word: "outage", color: "#FF6B6B" },
    body: "Database connection pool exhausted",
    footnote: "Investigating since 14:22",
    meta: "for 1h 12m",
    width: 46,
  }

  it("renders title, status, body, footnote and meta in the frame", () => {
    const frame = frameOf(<Card {...baseProps} />)
    expect(frame).toContain("Service Alpha")
    expect(frame).toContain("● outage")
    expect(frame).toContain("Database connection pool exhausted")
    expect(frame).toContain("Investigating since 14:22")
    expect(frame).toContain("for 1h 12m")
  })

  it("uses round border when unselected", () => {
    const frame = frameOf(<Card {...baseProps} selected={false} />)
    expect(frame).toContain("╭")
    expect(frame).not.toContain("┏")
  })

  it("uses bold border when selected", () => {
    const frame = frameOf(<Card {...baseProps} selected={true} />)
    expect(frame).toContain("┏")
    expect(frame).toContain("━")
    expect(frame).not.toContain("╭")
  })

  it("selected with focused={false} still draws bold border", () => {
    const frame = frameOf(<Card {...baseProps} selected={true} focused={false} />)
    expect(frame).toContain("┏")
    expect(frame).toContain("━")
    expect(frame).not.toContain("╭")
  })

  it("frame is exactly CARD_HEIGHT lines tall with all content", () => {
    const frame = frameOf(<Card {...baseProps} />)
    const lines = frame.split("\n")
    expect(lines.length).toBe(CARD_HEIGHT)
  })

  it("frame is exactly CARD_HEIGHT lines tall without optional content", () => {
    const frame = frameOf(
      <Card title="Service" status={{ glyph: "●", word: "ok" }} width={46} />,
    )
    const lines = frame.split("\n")
    expect(lines.length).toBe(CARD_HEIGHT)
  })

  it("every frame line is exactly width columns wide", () => {
    const frame = frameOf(<Card {...baseProps} />)
    const lines = frame.split("\n")
    for (const line of lines) {
      expect([...line].length).toBe(baseProps.width)
    }
  })

  it("long title truncates rather than wrapping", () => {
    const longTitle = "This is a very long service title that should definitely truncate"
    const frame = frameOf(<Card {...baseProps} title={longTitle} />)
    const lines = frame.split("\n")
    expect(lines.length).toBe(CARD_HEIGHT)
    expect(frame).toContain("…")
  })

  it("omitting meta leaves the footnote line intact", () => {
    const frame = frameOf(<Card {...baseProps} meta={undefined} />)
    expect(frame).toContain("Investigating since 14:22")
    const lines = frame.split("\n")
    expect(lines.length).toBe(CARD_HEIGHT)
  })

  it("exports CARD_HEIGHT as 6", () => {
    expect(CARD_HEIGHT).toBe(6)
  })
})