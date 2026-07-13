// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { createContext, useContext } from "react"
import { Box, Text } from "ink"

// Shape-distinct markers so nesting reads without relying on colour.
const markers = ["●", "○", "▪", "▫"]
const DepthContext = createContext(0)

type ItemProps = { children: React.ReactNode }

const UnorderedListItem = ({ children }: ItemProps) => {
  const depth = useContext(DepthContext)
  const marker = markers[Math.max(0, depth - 1) % markers.length]
  return (
    <Box flexDirection="row">
      <Text>{marker} </Text>
      <Box flexDirection="column">{children}</Box>
    </Box>
  )
}

type UnorderedListProps = { children: React.ReactNode }

const UnorderedListRoot = ({ children }: UnorderedListProps) => {
  const depth = useContext(DepthContext)
  return (
    <DepthContext.Provider value={depth + 1}>
      <Box flexDirection="column">{children}</Box>
    </DepthContext.Provider>
  )
}

export const UnorderedList = Object.assign(UnorderedListRoot, {
  Item: UnorderedListItem,
})
