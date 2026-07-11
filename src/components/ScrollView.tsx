import React, { useEffect, useState } from "react"
import { Box, Text, useInput, useStdout } from "ink"

// Track terminal height via ink's useStdout (works across ink versions, and
// avoids depending on useWindowSize or the node `process` global).
const useTerminalRows = (): number => {
  const { stdout } = useStdout()
  const [rows, setRows] = useState(stdout?.rows || 24)
  useEffect(() => {
    if (!stdout) return
    const onResize = () => setRows(stdout.rows || 24)
    stdout.on("resize", onResize)
    return () => {
      stdout.off("resize", onResize)
    }
  }, [stdout])
  return rows
}

// One rendered line of scrollable content. Consumers flatten their content into
// these (headers coloured/bold, body plain) and hand the array to ScrollView,
// which windows it by height and owns the scroll keys (↑↓/j/k/space/b/g/G).
export type StyledLine = {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
}

type ScrollViewProps = {
  lines: StyledLine[]
  // Explicit content height in rows. When omitted, fills the terminal minus
  // `reserveRows` (space for the consumer's own header/footer chrome).
  height?: number
  reserveRows?: number
  // Show the "N–M / total" position indicator when content overflows.
  showIndicator?: boolean
}

export const ScrollView = ({
  lines,
  height,
  reserveRows = 0,
  showIndicator = true,
}: ScrollViewProps) => {
  const rows = useTerminalRows()
  const viewHeight = Math.max(3, height ?? rows - reserveRows)
  const [start, setStart] = useState(0)

  const maxStart = Math.max(0, lines.length - viewHeight)
  const clamped = Math.min(start, maxStart)

  useInput((input, key) => {
    if (key.downArrow || input === "j")
      setStart((s) => Math.min(maxStart, s + 1))
    if (key.upArrow || input === "k") setStart((s) => Math.max(0, s - 1))
    if (input === " " || key.pageDown || input === "f")
      setStart((s) => Math.min(maxStart, s + viewHeight))
    if (key.pageUp || input === "b")
      setStart((s) => Math.max(0, s - viewHeight))
    if (input === "g") setStart(0)
    if (input === "G") setStart(maxStart)
  })

  const visible = lines.slice(clamped, clamped + viewHeight)
  const hasMore = lines.length > viewHeight
  const atEnd = clamped >= maxStart

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
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
