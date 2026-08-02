import { useState } from "react"
import { useInput } from "ink"

type UseListCursorOptions = {
  initial?: number
  wrap?: boolean
  vimKeys?: boolean
  isActive?: boolean
}

// Extracted from 32 hand-written cursor blocks across 18 files in the CLI fleet.
// Two defaults come straight from what those sites actually wrote rather than
// from taste:
//
//   wrap: false  — 15 of 18 clamped with Math.max(0, c - 1). A list has ends; a
//                  tab bar is a ring, which is why `useTabs` wraps and this does
//                  not. Opt in where the list is genuinely circular.
//   vimKeys      — only 3 of 18 accepted k/j, so the same list answered `k` in
//                  some CLIs and ignored it in others. Defaulting to ON settles
//                  it one way; the flag exists for surfaces where k/j must stay
//                  free for something else (a filter buffer, a command key).
export const useListCursor = (
  length: number,
  {
    initial = 0,
    wrap = false,
    vimKeys = true,
    isActive = true,
  }: UseListCursorOptions = {},
) => {
  const [cursor, setCursor] = useState(initial)

  const moveCursor = (delta: number) => {
    if (length === 0) return
    setCursor((current) => {
      const next = current + delta
      // Same signed-modulo trap as useTabs: `next % length` yields -1 rather than
      // wrapping when next is -1, so the length is added before the modulo.
      if (wrap) return (next + length) % length
      return Math.min(length - 1, Math.max(0, next))
    })
  }

  useInput(
    (input, key) => {
      if (key.upArrow || (vimKeys && input === "k")) moveCursor(-1)
      if (key.downArrow || (vimKeys && input === "j")) moveCursor(1)
    },
    { isActive },
  )

  return { cursor, setCursor, moveCursor }
}
