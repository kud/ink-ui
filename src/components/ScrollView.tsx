import React, { useState, useRef, useLayoutEffect, useEffect } from "react"
import { Box, Text, useInput, measureElement, type DOMElement } from "ink"

// An inline run within a line — lets a single line mix styles (e.g. bold words,
// coloured `code`) the way glow renders markdown.
export type Span = {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
  italic?: boolean
}

// One rendered line of scrollable content. Consumers flatten their content into
// these (headers coloured/bold, body plain) and hand the array to ScrollView,
// which windows it by the *measured* viewport height and owns the scroll keys
// (↑↓/j/k/space/b/g/G). `spans`, when present, renders inline-styled runs.
export type StyledLine = {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
  spans?: Span[]
}

type ScrollViewProps = {
  lines: StyledLine[]
  // Show the "N–M / total" position indicator when content overflows.
  showIndicator?: boolean
  // Initial scroll offset — e.g. a log that resolves and wants to open on its
  // first error rather than the top.
  initialStart?: number
}

export const ScrollView = ({
  lines,
  showIndicator = true,
  initialStart = 0,
}: ScrollViewProps) => {
  const ref = useRef<DOMElement | null>(null)
  const [height, setHeight] = useState(1)
  const [start, setStart] = useState(initialStart)

  // Honour a changed initial position after mount — useState ignores prop
  // changes once initialised.
  useEffect(() => setStart(initialStart), [initialStart])

  // Measure the space the viewport actually gets from its flex parent rather
  // than guessing chrome with a constant — this is what stops content from
  // drawing taller than the terminal (which ghosts in alternate-screen mode).
  useLayoutEffect(() => {
    if (!ref.current) return
    const { height: h } = measureElement(ref.current)
    if (h > 0 && h !== height) setHeight(h)
  })

  const maxStart = Math.max(0, lines.length - height)
  const clamped = Math.min(start, maxStart)

  useInput((input, key) => {
    if (key.downArrow || input === "j")
      setStart((s) => Math.min(maxStart, s + 1))
    if (key.upArrow || input === "k") setStart((s) => Math.max(0, s - 1))
    if (input === " " || key.pageDown || input === "f")
      setStart((s) => Math.min(maxStart, s + height))
    if (key.pageUp || input === "b") setStart((s) => Math.max(0, s - height))
    if (input === "g") setStart(0)
    if (input === "G") setStart(maxStart)
  })

  const visible = lines.slice(clamped, clamped + height)
  const hasMore = lines.length > height
  const atEnd = clamped >= maxStart

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box ref={ref} flexDirection="column" flexGrow={1} overflow="hidden">
        {visible.map((l, i) =>
          l.spans ? (
            <Text key={i} wrap="truncate-end">
              {l.spans.map((s, j) => (
                <Text
                  key={j}
                  color={s.color}
                  bold={s.bold}
                  dimColor={s.dim}
                  italic={s.italic}
                >
                  {s.text}
                </Text>
              ))}
              {l.spans.length === 0 ? " " : ""}
            </Text>
          ) : (
            <Text
              key={i}
              color={l.color}
              bold={l.bold}
              dimColor={l.dim}
              wrap="truncate-end"
            >
              {l.text || " "}
            </Text>
          ),
        )}
      </Box>
      {showIndicator && hasMore && (
        <Text dimColor>
          {`  ${clamped + 1}–${clamped + visible.length} / ${lines.length}` +
            (atEnd ? "  (end)" : "  ↓ j/space")}
        </Text>
      )}
    </Box>
  )
}
