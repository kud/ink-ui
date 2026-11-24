import { useContext } from "react"
import { useApp, useInput } from "ink"
import { LayerDepthContext } from "./layer-context.js"

type UseAppKeysOptions = {
  /**
   * The host's peel, called on `esc` and `backspace`: close the topmost layer
   * it owns — a focused input, an overlay, a detail screen — and return
   * `true`. Return `false` when there was nothing to pop; `atRoot` then says
   * what happens. A `void` return counts as handled.
   */
  onBack?: () => boolean | void
  /** What `q` does. Defaults to Ink's `exit()`, which restores the terminal. */
  onQuit?: () => void
  /** `esc` with nothing left to pop: nothing (the default) or quit. */
  atRoot?: "ignore" | "quit"
  /** False while a text field has focus — `q` is a letter there and `backspace` deletes. */
  isActive?: boolean
}

/**
 * The three keys that belong to the APP, never to a screen: `q` quits from
 * anywhere, `esc` and `backspace` go back exactly one level. Mounted once, at
 * the root — Ink runs every active `useInput` on every key with no order and
 * no propagation, so "who gets `esc`" is only ever solved by there being one
 * claimant. Not a back stack: a host's layers are a priority order over its
 * own booleans, and that order stays in the host as `onBack`.
 *
 * Inside a `LayerHost` with a layer open, `esc` and `backspace` belong to the
 * host, which closes the topmost layer; the peel resumes once the stack is
 * empty. `q` quits regardless.
 *
 * `esc` at the root does nothing by default. A key that sometimes quits is a
 * key you flinch from; quitting has its own key.
 */
export const useAppKeys = ({
  onBack,
  onQuit,
  atRoot = "ignore",
  isActive = true,
}: UseAppKeysOptions = {}) => {
  const { exit } = useApp()
  const quit = onQuit ?? exit
  const layers = useContext(LayerDepthContext)

  useInput(
    (input, key) => {
      if (input === "q") return quit()
      if (layers > 0) return
      if (key.escape || key.backspace || key.delete) {
        const handled = onBack ? onBack() !== false : false
        if (!handled && atRoot === "quit") quit()
      }
    },
    { isActive },
  )
}
