import { useEffect, useRef, useState } from "react"
import { useInput } from "ink"
import type { Hint } from "./footer-hints.js"

type UseFilterModeOptions = {
  /** False while something above the list owns the keyboard — an overlay, a palette. */
  isActive?: boolean
  /** Called after the term changes, with the new one. Typically `setCursor(0)`. */
  onChange?: (term: string | null) => void
}

/**
 * A list filter with two modes, vim's split between inserting and acting.
 *
 * TYPING: `/` opens the field and every printable key goes into the term.
 * `↵` leaves typing and KEEPS the filter; `esc` clears the term and leaves.
 * ↑↓ are not taken, so a host's `useListCursor` still walks the matches while
 * the field is open — pass it `vimKeys: !typing` so `j`/`k` type instead.
 *
 * KEPT: the filter stays applied and the letter keys are the host's hotkeys
 * again. `/` goes back INTO the term rather than starting over — the whole
 * point of keeping it is being able to refine it. `esc` here is not this
 * hook's: a kept filter is the bottom layer of the host's peel, so the host's
 * `onBack` clears it through `clear()`, after every layer pushed above it.
 *
 * Owns its own `useInput`, like `useListCursor`. The host stands its other
 * handlers down while `typing` is true — `useAppKeys({ isActive: !typing })`
 * and an early return in its hotkey handler — because inside the field `q` is
 * a letter, and Ink hands every key to every active hook.
 *
 * Extracted from gh-cockpit's inbox, where `/` used to clear on the way back
 * in, so refining a kept query meant typing it again from scratch.
 */
export const useFilterMode = ({
  isActive = true,
  onChange,
}: UseFilterModeOptions = {}) => {
  // `null` is no filter; `""` is the field open with nothing typed yet.
  const [term, setTerm] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)

  // Functional updates below, so a burst of keys between two renders appends
  // to the latest term rather than to the one this closure saw. The callback
  // therefore fires from an effect, once the term has settled, and not on mount.
  const previous = useRef(term)
  useEffect(() => {
    if (previous.current === term) return
    previous.current = term
    onChange?.(term)
  }, [term, onChange])

  const clear = () => {
    setTerm(null)
    setTyping(false)
  }

  useInput(
    (input, key) => {
      if (!typing) {
        if (input === "/") {
          setTerm((t) => t ?? "")
          setTyping(true)
        }
        return
      }
      if (key.upArrow || key.downArrow) return
      // An empty term accepted is no filter at all, not a filter matching
      // everything that still needs an `esc` to get rid of.
      if (key.return) {
        setTerm((t) => (t ? t : null))
        return setTyping(false)
      }
      if (key.escape) return clear()
      if (key.backspace || key.delete)
        return setTerm((t) => (t ?? "").slice(0, -1))
      if (input && !key.ctrl && !key.meta && !key.tab)
        setTerm((t) => (t ?? "") + input)
    },
    { isActive },
  )

  // While typing, these are the ONLY keys that do anything, so a host shows
  // them in place of its own rather than alongside.
  const hints: Hint[] = typing
    ? [
        ["↑↓", "move"],
        ["↵", "keep"],
        ["esc", "clear"],
      ]
    : term !== null
      ? [
          ["/", "edit"],
          ["esc", "clear"],
        ]
      : [["/", "filter"]]

  return { term, typing, active: term !== null, clear, hints }
}
