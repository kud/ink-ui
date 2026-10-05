import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

type FilterBarProps = {
  /** From `useFilterMode`. `null` draws nothing. */
  term: string | null
  /** From `useFilterMode`. Draws the caret. */
  typing: boolean
  /** From `useFilterMode`. Where the caret sits; defaults to end-of-term. */
  caret?: number
  /** How many rows survive the filter. Omit to draw no count. */
  matches?: number
}

/**
 * The line a `useFilterMode` filter draws: `/ term▏   3 matches`. The caret
 * is there only while typing, which is the one visible difference between a
 * field that takes your keys and a filter that is merely standing — so it is
 * the thing that tells you whether `c` is a letter or a command.
 *
 * Presentational and keyless. It sits in the `Page`'s `filter` slot, band two,
 * so every app draws its filter in the same place.
 */
export const FilterBar = ({ term, typing, caret, matches }: FilterBarProps) => {
  if (term === null) return null
  const at = Math.max(0, Math.min(caret ?? term.length, term.length))
  return (
    <Box>
      <Text color={colors.info}>{"/ "}</Text>
      <Text>{term.slice(0, at)}</Text>
      {typing ? <Text color={colors.info}>▏</Text> : null}
      <Text>{term.slice(at)}</Text>
      {matches === undefined ? null : (
        <Text
          dimColor
        >{`   ${matches} match${matches !== 1 ? "es" : ""}`}</Text>
      )}
    </Box>
  )
}
