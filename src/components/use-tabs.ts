import { useState } from "react"
import { useInput } from "ink"
import type { TabItem } from "./Tabs.js"

type UseTabsOptions<T extends string> = {
  initial?: T
  isActive?: boolean
}

// `Tabs` is deliberately controlled — it takes `active` and renders, owning no
// state. That split is right, but it left every consumer to write the cycle
// themselves, and each one wrote `(i + 1) % n`: forward-only, no Shift+Tab. Four
// call sites across ambre's TUIs had the identical gap. Anything a consumer can
// only implement one correct way is a chore being delegated, not a choice being
// offered, so the behaviour ships here while `Tabs` stays presentational.
export const useTabs = <T extends string>(
  items: TabItem<T>[],
  { initial, isActive = true }: UseTabsOptions<T> = {},
) => {
  const [active, setActive] = useState<T | undefined>(
    initial ?? items[0]?.value,
  )

  useInput(
    (_input, key) => {
      if (!key.tab || items.length === 0) return
      const current = items.findIndex((item) => item.value === active)
      // JS `%` takes the sign of the dividend, so a bare `(i - 1) % n` returns -1
      // on the first tab rather than wrapping to the last — Shift+Tab would blank
      // the panel instead of cycling. Adding `items.length` before the modulo is
      // what makes the backward direction wrap at all.
      const next =
        (current + (key.shift ? -1 : 1) + items.length) % items.length
      setActive(items[next]!.value)
    },
    { isActive },
  )

  return { active, setActive }
}
