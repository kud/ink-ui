import React, { useState } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { Header, FooterHints, SelectableRow, type Hint } from "../index.js"
import { entries } from "./entries.js"

export const Gallery = () => {
  const { exit } = useApp()
  const [index, setIndex] = useState(0)
  const [focused, setFocused] = useState(false)
  const current = entries[index]!

  // Navigation owns input only while nothing is focused, so the previewed
  // component can take over cleanly on Enter.
  useInput(
    (input, key) => {
      if (input === "q") return exit()
      if (key.upArrow || input === "k")
        setIndex((i) => (i - 1 + entries.length) % entries.length)
      if (key.downArrow || input === "j")
        setIndex((i) => (i + 1) % entries.length)
      if (key.return && current.interactive) setFocused(true)
    },
    { isActive: !focused },
  )

  // While focused, only Esc is ours — everything else flows to the component.
  useInput(
    (_input, key) => {
      if (key.escape) setFocused(false)
    },
    { isActive: focused },
  )

  const navHints: Hint[] = [
    ["↑↓", "navigate"],
    ...(current.interactive ? ([["⏎", "focus"]] as Hint[]) : []),
    ["q", "quit"],
  ]
  const focusHints: Hint[] = [
    ["esc", "back"],
    ["q", "quit"],
  ]

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header subtitle={`${index + 1}/${entries.length} · ${current.category}`}>
        ink-ui · demo
      </Header>
      <Box flexDirection="row" marginTop={1}>
        <Box flexDirection="column" width={20} marginRight={2}>
          {entries.map((entry, i) => {
            const showHeader =
              i === 0 || entries[i - 1]!.category !== entry.category
            return (
              <Box key={entry.name} flexDirection="column">
                {showHeader ? (
                  <Text dimColor bold>
                    {entry.category}
                  </Text>
                ) : null}
                <SelectableRow active={i === index}>
                  <Text>{entry.name}</Text>
                </SelectableRow>
              </Box>
            )
          })}
        </Box>
        <Box flexGrow={1} flexDirection="column">
          <Text dimColor>
            {current.name}
            {focused
              ? "  ● focused"
              : current.interactive
                ? "  ⏎ to interact"
                : ""}
          </Text>
          <Box marginTop={1} flexDirection="column">
            {current.render(focused)}
          </Box>
        </Box>
      </Box>
      <Box marginTop={1}>
        <FooterHints hints={focused ? focusHints : navHints} />
      </Box>
    </Box>
  )
}
