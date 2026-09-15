import { useState } from "react"
import { useInput } from "ink"
import type { TabItem } from "./Tabs.js"

type UseTabsOptions<T extends string> = {
  initial?: T
  isActive?: boolean
  /**
   * Whether ←→ move between tabs as well as Tab / Shift+Tab. On by default:
   * a screen whose ←→ mean something else — a yes/no toggle, a horizontal
   * scroll — turns them off here rather than fighting the hook for the keys.
   */
  arrows?: boolean
}

// `Tabs` is deliberately controlled — it takes `active` and renders, owning no
// state. That split is right, but it left every consumer to write the cycle
// themselves, and each one wrote `(i + 1) % n`: forward-only, no Shift+Tab. Four
// call sites across ambre's TUIs had the identical gap. Anything a consumer can
// only implement one correct way is a chore being delegated, not a choice being
// offered, so the behaviour ships here while `Tabs` stays presentational.
//
// ←→ joined Tab for the same reason, one key over. With the hook binding Tab
// alone, five consumers hand-bound the arrows — two wrapping, two clamping, one
// toggling — and a sixth wrote `←→ section` into its footer and bound nothing,
// so the arrows were dead exactly where the hint promised them. Both gestures
// wrap: a tab bar is a ring, and Tab already wrapped on the very screens whose
// arrows clamped, which was two end behaviours for one bar.
export const useTabs = <T extends string>(
  items: TabItem<T>[],
  { initial, isActive = true, arrows = true }: UseTabsOptions<T> = {},
) => {
  const [active, setActive] = useState<T | undefined>(
    initial ?? items[0]?.value,
  )

  useInput(
    (_input, key) => {
      if (items.length === 0) return
      const backward = key.tab ? key.shift : arrows && key.leftArrow
      const forward = key.tab ? !key.shift : arrows && key.rightArrow
      if (!backward && !forward) return
      const current = items.findIndex((item) => item.value === active)
      // JS `%` takes the sign of the dividend, so a bare `(i - 1) % n` returns -1
      // on the first tab rather than wrapping to the last — Shift+Tab would blank
      // the panel instead of cycling. Adding `items.length` before the modulo is
      // what makes the backward direction wrap at all.
      const next = (current + (backward ? -1 : 1) + items.length) % items.length
      setActive(items[next]!.value)
    },
    { isActive },
  )

  return { active, setActive }
}
