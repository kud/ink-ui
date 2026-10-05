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
 * `↵` and `esc` both leave typing and KEEP the filter (an empty term leaves
 * no filter); `ctrl+u` clears the term and stays in the field.
 * ↑↓ are not taken, so a host's `useListCursor` still walks the matches while
 * the field is open — pass it `vimKeys: !typing` so `j`/`k` type instead.
 *
 * KEPT: the filter stays applied and the letter keys are the host's hotkeys
 * again. `/` goes back INTO the term rather than starting over — the whole
 * point of keeping it is being able to refine it. `esc` here is not this
 * hook's: a kept filter is the bottom layer of the host's peel, so the host's
 * `onBack` clears it through `clear()`, after every layer pushed above it.
 * `esc` twice therefore clears a filter from anywhere.
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
  // Term and caret live in one object so a burst of keys between two renders
  // reads and writes the latest pair rather than the one this closure saw.
  const [state, setState] = useState<{ term: string | null; caret: number }>({
    term: null,
    caret: 0,
  })
  const [typing, setTyping] = useState(false)
  const { term, caret } = state

  // The callback fires from an effect, once the term has settled, and not on
  // mount.
  const previous = useRef(term)
  useEffect(() => {
    if (previous.current === term) return
    previous.current = term
    onChange?.(term)
  }, [term, onChange])

  const clear = () => {
    setState({ term: null, caret: 0 })
    setTyping(false)
  }

  useInput(
    (input, key) => {
      if (!typing) {
        if (input === "/") {
          // Resume a kept term, or open empty — either way the caret starts
          // at the end, the way a field you just opened does.
          setState((s) => {
            const next = s.term ?? ""
            return { term: next, caret: next.length }
          })
          setTyping(true)
        }
        return
      }
      if (key.upArrow || key.downArrow) return
      // An empty term left behind is no filter at all, not a filter matching
      // everything that still needs an `esc` to get rid of.
      if (key.return || key.escape) {
        setState((s) => (!s.term ? { term: null, caret: 0 } : s))
        return setTyping(false)
      }
      if (key.ctrl && (input === "u" || input === "U"))
        return setState({ term: "", caret: 0 })
      if (key.leftArrow)
        return setState((s) => ({ ...s, caret: Math.max(0, s.caret - 1) }))
      if (key.rightArrow)
        return setState((s) => ({
          ...s,
          caret: Math.min((s.term ?? "").length, s.caret + 1),
        }))
      if (key.ctrl && (input === "a" || input === "A"))
        return setState((s) => ({ ...s, caret: 0 }))
      if (key.ctrl && (input === "e" || input === "E"))
        return setState((s) => ({ ...s, caret: (s.term ?? "").length }))
      // Both backspace and delete remove the character before the caret —
      // macOS sends DEL (127) for the key some terminals report as BS (8),
      // and forward-delete isn't worth the ambiguity for a single-line field.
      if (key.backspace || key.delete)
        return setState((s) => {
          const current = s.term ?? ""
          if (s.caret === 0) return { term: current, caret: 0 }
          return {
            term: current.slice(0, s.caret - 1) + current.slice(s.caret),
            caret: s.caret - 1,
          }
        })
      if (input && !key.ctrl && !key.meta && !key.tab)
        return setState((s) => {
          const current = s.term ?? ""
          const at = Math.min(s.caret, current.length)
          return {
            term: current.slice(0, at) + input + current.slice(at),
            caret: at + input.length,
          }
        })
    },
    { isActive },
  )

  // While typing, these are the ONLY keys that do anything, so a host shows
  // them in place of its own rather than alongside.
  const hints: Hint[] = typing
    ? [
        ["↑↓", "move"],
        ["↵/esc", "done"],
        ["⌃u", "clear"],
      ]
    : term !== null
      ? [
          ["/", "edit"],
          ["esc", "clear"],
        ]
      : [["/", "filter"]]

  return { term, typing, caret, active: term !== null, clear, hints }
}
