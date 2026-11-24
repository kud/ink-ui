import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"
import { LayerLevelContext } from "./layer-context.js"

/**
 * One key a screen answers to, as the reader sees it. Descriptive only: the
 * registry never binds a key, so the hook or `useInput` that handles it stays
 * the one claimant and nothing fires twice.
 */
export type KeyBinding = {
  /** The key as drawn — `o`, `⏎`, `↑↓`, `ctrl+k`. */
  key: string
  /** What it does, in a word or two. */
  label: string
  /** The legend group. Defaults to the `group` given to `useKeyBindings`. */
  group?: string
  /** Show it in the compact footer too. Defaults to true; false keeps it to the legend. */
  footer?: boolean
}

export type KeyGroup = { title: string; bindings: KeyBinding[] }

type Registration = {
  id: string
  level: number
  group: string
  bindings: readonly KeyBinding[]
}

type RegistryApi = {
  register: (registration: Registration) => void
  unregister: (id: string) => void
  /** Counts mounted `KeyHelp` legends, so a layer's footer knows whether `? help` exists. */
  legend: (delta: 1 | -1) => void
}

type RegistryState = { registrations: readonly Registration[]; legends: number }

const RegistryApiContext = createContext<RegistryApi | null>(null)
const RegistryStateContext = createContext<RegistryState>({
  registrations: [],
  legends: 0,
})

const sameBindings = (a: readonly KeyBinding[], b: readonly KeyBinding[]) =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      x.key === b[i]!.key &&
      x.label === b[i]!.label &&
      x.group === b[i]!.group &&
      x.footer === b[i]!.footer,
  )

/**
 * Holds the key bindings every mounted screen registered. `LayerHost` mounts
 * one for you when there is none above it; mount your own only to share one
 * registry across several hosts.
 */
export const KeyHelpProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<RegistryState>({
    registrations: [],
    legends: 0,
  })
  const api = useMemo<RegistryApi>(
    () => ({
      register: (next) =>
        setState((prev) => {
          const at = prev.registrations.findIndex((r) => r.id === next.id)
          if (at === -1) {
            return { ...prev, registrations: [...prev.registrations, next] }
          }
          const current = prev.registrations[at]!
          if (
            current.level === next.level &&
            current.group === next.group &&
            sameBindings(current.bindings, next.bindings)
          ) {
            return prev
          }
          // Re-registering keeps its place, so a group never jumps in the legend.
          const registrations = [...prev.registrations]
          registrations[at] = next
          return { ...prev, registrations }
        }),
      unregister: (id) =>
        setState((prev) =>
          prev.registrations.some((r) => r.id === id)
            ? { ...prev, registrations: prev.registrations.filter((r) => r.id !== id) }
            : prev,
        ),
      legend: (delta) =>
        setState((prev) => ({ ...prev, legends: prev.legends + delta })),
    }),
    [],
  )
  return (
    <RegistryApiContext.Provider value={api}>
      <RegistryStateContext.Provider value={state}>
        {children}
      </RegistryStateContext.Provider>
    </RegistryApiContext.Provider>
  )
}

/** True inside a `KeyHelpProvider` (or a `LayerHost`, which mounts one). */
export const useHasKeyRegistry = () => useContext(RegistryApiContext) !== null

type UseKeyBindingsOptions = {
  /** The legend group these fall under. Defaults to `Keys`. */
  group?: string
  /** False withdraws them — the screen is mounted but not listening. */
  isActive?: boolean
}

/**
 * Declare the keys this screen answers to, for `KeyHelp`'s footer and its `?`
 * legend. Registered on the layer the caller sits on, so a dialog's keys
 * replace the page's while it is up, and withdrawn on unmount. It binds
 * nothing: keep handling the keys where you already do.
 */
export const useKeyBindings = (
  bindings: readonly KeyBinding[],
  { group = "Keys", isActive = true }: UseKeyBindingsOptions = {},
) => {
  const api = useContext(RegistryApiContext)
  const level = useContext(LayerLevelContext)
  const id = useId()
  // An inline array is a new object every render; the registry compares
  // contents and drops a no-op, so a caller never has to memoise.
  useEffect(() => {
    if (!api) return
    if (isActive) api.register({ id, level, group, bindings })
    else api.unregister(id)
  })
  useEffect(() => () => api?.unregister(id), [api, id])
}

/** Count a mounted legend, so layer footers offer `? help` only when it exists. */
export const useLegendPresence = (present: boolean) => {
  const api = useContext(RegistryApiContext)
  useEffect(() => {
    if (!api || !present) return
    api.legend(1)
    return () => api.legend(-1)
  }, [api, present])
}

/** Whether a `KeyHelp` legend is mounted under this registry. */
export const useLegendAvailable = () => useContext(RegistryStateContext).legends > 0

/**
 * The bindings registered on one level, grouped in first-registered order.
 * A key registered twice with the same label is drawn once.
 */
export const useKeyGroups = (level: number): KeyGroup[] => {
  const { registrations } = useContext(RegistryStateContext)
  return useMemo(() => groupBindings(registrations, level), [registrations, level])
}

export const groupBindings = (
  registrations: readonly Registration[],
  level: number,
): KeyGroup[] => {
  const groups = new Map<string, KeyBinding[]>()
  const seen = new Set<string>()
  for (const registration of registrations) {
    if (registration.level !== level) continue
    for (const binding of registration.bindings) {
      const title = binding.group ?? registration.group
      const key = `${binding.key}\u0000${binding.label}`
      if (seen.has(key)) continue
      seen.add(key)
      const list = groups.get(title) ?? []
      list.push(binding)
      groups.set(title, list)
    }
  }
  return [...groups].map(([title, bindings]) => ({ title, bindings }))
}
