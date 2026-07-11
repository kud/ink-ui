import React, { useState, useRef, useLayoutEffect } from "react"
import { Box, Text, useInput, measureElement, type DOMElement } from "ink"

// One rendered line of scrollable content. Consumers flatten their content into
// these (headers coloured/bold, body plain) and hand the array to ScrollView,
// which windows it by the *measured* viewport height and owns the scroll keys
// (↑↓/j/k/space/b/g/G).
export type StyledLine = {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
}

type ScrollViewProps = {
  lines: StyledLine[]
  // Show the "N–M / total" position indicator when content overflows.
  showIndicator?: boolean
}

export const ScrollView = ({
  lines,
  showIndicator = true,
}: ScrollViewProps) => {
  const ref = useRef<DOMElement | null>(null)
  const [height, setHeight] = useState(1)
  const [start, setStart] = useState(0)

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
        {visible.map((l, i) => (
          <Text
            key={i}
            color={l.color}
            bold={l.bold}
            dimColor={l.dim}
            wrap="truncate-end"
          >
            {l.text || " "}
          </Text>
        ))}
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
