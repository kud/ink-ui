// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Box, Text } from "ink"

// _index is injected by the parent list; consumers never set it.
type ItemProps = { children: React.ReactNode; _index?: number }

const OrderedListItem = ({ children, _index = 1 }: ItemProps) => (
  <Box flexDirection="row">
    <Text>{_index}. </Text>
    <Box flexDirection="column">{children}</Box>
  </Box>
)

type OrderedListProps = { children: React.ReactNode }

const OrderedListRoot = ({ children }: OrderedListProps) => {
  // Number only direct Item children; a nested list restarts its own count.
  let n = 0
  const numbered = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === OrderedListItem) {
      n += 1
      return React.cloneElement(child as React.ReactElement<ItemProps>, {
        _index: n,
      })
    }
    return child
  })
  return <Box flexDirection="column">{numbered}</Box>
}

export const OrderedList = Object.assign(OrderedListRoot, {
  Item: OrderedListItem,
})
