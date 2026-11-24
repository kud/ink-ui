// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { createContext, useContext } from "react"
import { Box, Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"

// Shape-distinct markers so nesting reads without relying on colour.
const markers = ["●", "○", "▪", "▫"]
// The same four steps in 7-bit, for a locale that cannot draw the shapes.
const asciiMarkers = ["*", "o", "-", "."]
const DepthContext = createContext(0)

type ItemProps = { children: React.ReactNode }

const UnorderedListItem = ({ children }: ItemProps) => {
  const depth = useContext(DepthContext)
  const set = useTheme().icons === "ascii" ? asciiMarkers : markers
  const marker = set[Math.max(0, depth - 1) % set.length]
  return (
    <Box flexDirection="row" aria-role="listitem">
      <Text aria-hidden>{marker} </Text>
      <Box flexDirection="column">{children}</Box>
    </Box>
  )
}

type UnorderedListProps = { children: React.ReactNode }

const UnorderedListRoot = ({ children }: UnorderedListProps) => {
  const depth = useContext(DepthContext)
  return (
    <DepthContext.Provider value={depth + 1}>
      <Box flexDirection="column" aria-role="list">{children}</Box>
    </DepthContext.Provider>
  )
}

export const UnorderedList = Object.assign(UnorderedListRoot, {
  Item: UnorderedListItem,
})
