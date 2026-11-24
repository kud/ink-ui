import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
} from "react"
import type { ReactNode } from "react"
import { useInput } from "ink"

/**
 * Focus for a screen with more than one thing that listens for keys — a form
 * with three fields, a list beside a filter, a dialog over a page.
 *
 * One `FocusScope` at the root of the region owns the registry and the only
 * Tab / Shift+Tab handler. Every interactive component inside it joins with
 * `useFocusable` and listens only while it holds focus, so "who gets this
 * key" has one answer. A nested `FocusScope trap` keeps Tab inside itself
 * while it is mounted and hands focus back to whatever had it when it goes.
 *
 * Outside any scope nothing changes: `useFocusable` reports focused (unless
 * disabled), so a component that joined still behaves exactly as it did
 * before focus existed.
 */

type Entry = {
  id: string
  disabled: boolean
  autoFocus: boolean
  /** The scope ids from the root down to the scope it registered in. */
  scopes: readonly string[]
}

type Trap = { scope: string; restore: string | undefined }

type Store = {
  entries: Map<string, Entry>
  traps: Trap[]
  focused: string | undefined
  /** Set by `blur()`: no implicit focus until something asks for focus again. */
  idle: boolean
}

export type FocusManager = {
  /** The id holding focus, or `undefined` when nothing does. */
  focused: string | undefined
  /** Focus an id. Ignored if it is disabled, unknown or outside the active trap. */
  focus: (id: string) => void
  /** Move to the next enabled focusable, wrapping. What Tab does. */
  focusNext: () => void
  /** Move to the previous enabled focusable, wrapping. What Shift+Tab does. */
  focusPrevious: () => void
  /** Drop focus; nothing listens until focus is given again. */
  blur: () => void
}

type Root = FocusManager & {
  register: (entry: Entry) => void
  update: (id: string, patch: Partial<Omit<Entry, "id" | "scopes">>) => void
  unregister: (id: string) => void
  pushTrap: (scope: string) => void
  popTrap: (scope: string) => void
}

type ScopeValue = { root: Root; path: readonly string[] }

const ScopeContext = createContext<ScopeValue | null>(null)

/** Lets a wrapper that already joined (a `FocusRing`) lend its focus to what it wraps. */
type ItemValue = { id: string; isFocused: boolean; focus: () => void }

const ItemContext = createContext<ItemValue | null>(null)

/** Entries Tab can reach now: enabled, inside the innermost trap, in mount order. */
const eligible = (store: Store): Entry[] => {
  const trap = store.traps[store.traps.length - 1]
  const out: Entry[] = []
  for (const entry of store.entries.values()) {
    if (entry.disabled) continue
    if (trap && !entry.scopes.includes(trap.scope)) continue
    out.push(entry)
  }
  return out
}

/**
 * After any change, make `focused` point at something that can hold it.
 * A focused entry that was disabled hands focus to the next one after it, so
 * disabling the field you are on moves you forward rather than to the top.
 */
const reconcile = (store: Store, autoFocus: boolean, lostFrom?: string) => {
  const reachable = eligible(store)
  if (store.focused && reachable.some((e) => e.id === store.focused)) return
  if (lostFrom) {
    const order = [...store.entries.keys()]
    const from = order.indexOf(lostFrom)
    if (from !== -1) {
      for (let step = 1; step <= order.length; step += 1) {
        const id = order[(from + step) % order.length]!
        if (reachable.some((e) => e.id === id)) {
          store.focused = id
          return
        }
      }
    }
  }
  const wanted = reachable.find((e) => e.autoFocus)
  if (wanted) {
    store.focused = wanted.id
    return
  }
  // Inside a trap something must listen, or the dialog is a dead end.
  const implicit = (autoFocus || store.traps.length > 0) && !store.idle
  store.focused = implicit ? reachable[0]?.id : undefined
}

const step = (store: Store, delta: 1 | -1) => {
  const reachable = eligible(store)
  if (reachable.length === 0) return
  const at = reachable.findIndex((e) => e.id === store.focused)
  const next =
    at === -1
      ? delta === 1
        ? 0
        : reachable.length - 1
      : (at + delta + reachable.length) % reachable.length
  store.focused = reachable[next]!.id
  store.idle = false
}

type FocusScopeProps = {
  /**
   * Keep Tab inside this scope while it is mounted, and give focus back to
   * whatever held it when it unmounts. For a dialog, a confirm, an overlay.
   * Ignored on the outermost scope, which already contains everything.
   */
  trap?: boolean
  /**
   * Root only: focus the first enabled focusable when nothing is focused.
   * Defaults to true. A focusable's own `autoFocus` wins over first-in-order.
   */
  autoFocus?: boolean
  /**
   * Root only: bind Tab / Shift+Tab. Pass false on a screen where Tab already
   * means something (a `useTabs` bar) and drive focus from `useFocusManager`.
   */
  keys?: boolean
  /** Root only: stand the Tab handler down, e.g. while a `CommandPalette` is open. */
  isActive?: boolean
  children: ReactNode
}

const RootScope = ({
  autoFocus = true,
  keys = true,
  isActive = true,
  children,
}: Omit<FocusScopeProps, "trap">) => {
  const scope = useId()
  const path = useMemo(() => [scope], [scope])
  const storeRef = useRef<Store>({
    entries: new Map(),
    traps: [],
    focused: undefined,
    idle: false,
  })
  const [version, bump] = useReducer((n: number) => n + 1, 0)
  const autoFocusRef = useRef(autoFocus)
  autoFocusRef.current = autoFocus

  // Every mutation goes through here: change the store, settle focus, and
  // re-render only if who holds focus (or what is reachable) moved.
  const commit = useCallback((mutate: (store: Store) => string | void) => {
    const store = storeRef.current
    const lostFrom = mutate(store) ?? undefined
    reconcile(store, autoFocusRef.current, lostFrom)
    bump()
  }, [])

  const root = useMemo<Root>(
    () => ({
      get focused() {
        return storeRef.current.focused
      },
      focus: (id) =>
        commit((store) => {
          if (eligible(store).some((e) => e.id === id)) {
            store.focused = id
            store.idle = false
          }
        }),
      focusNext: () => commit((store) => step(store, 1)),
      focusPrevious: () => commit((store) => step(store, -1)),
      blur: () =>
        commit((store) => {
          store.focused = undefined
          store.idle = true
        }),
      register: (entry) =>
        commit((store) => {
          store.entries.set(entry.id, entry)
          // A later sibling asking for focus wins over the first-in-order
          // default that an earlier sibling's registration already settled.
          if (entry.autoFocus && eligible(store).some((e) => e.id === entry.id)) {
            store.focused = entry.id
          }
        }),
      update: (id, patch) =>
        commit((store) => {
          const entry = store.entries.get(id)
          if (!entry) return
          store.entries.set(id, { ...entry, ...patch })
          if (patch.disabled && store.focused === id) return id
        }),
      unregister: (id) =>
        commit((store) => {
          store.entries.delete(id)
        }),
      pushTrap: (trapScope) =>
        commit((store) => {
          store.traps.push({ scope: trapScope, restore: store.focused })
          store.focused = undefined
          store.idle = false
        }),
      popTrap: (trapScope) =>
        commit((store) => {
          const at = store.traps.findIndex((t) => t.scope === trapScope)
          if (at === -1) return
          const [trap] = store.traps.splice(at, 1)
          // Only the innermost trap leaving hands focus back; an outer one
          // closing under a still-open inner one leaves focus where it is.
          if (at === store.traps.length) store.focused = trap!.restore
        }),
    }),
    [commit],
  )

  // Settle once after the first commit of children, so the first focusable
  // is focused on mount without anyone pressing Tab.
  useEffect(() => {
    commit(() => undefined)
  }, [commit, autoFocus])

  useInput(
    (_input, key) => {
      if (!key.tab) return
      if (key.shift) root.focusPrevious()
      else root.focusNext()
    },
    { isActive: keys && isActive },
  )

  // A new object per version so consumers re-render when focus moves.
  const value = useMemo<ScopeValue>(
    () => ({ root: { ...root, focused: storeRef.current.focused }, path }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, path, version],
  )
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

const NestedScope = ({
  parent,
  trap = false,
  children,
}: { parent: ScopeValue } & Pick<FocusScopeProps, "trap" | "children">) => {
  const scope = useId()
  const { root } = parent
  // Children register in their own effects, which run before this one, so
  // the trap is pushed with its focusables already known.
  useEffect(() => {
    if (!trap) return
    root.pushTrap(scope)
    return () => root.popTrap(scope)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trap, scope])
  // The path keeps its identity across focus changes: registration is keyed
  // on it, and a new array would re-register (and re-order) every stop.
  const path = useMemo(() => [...parent.path, scope], [parent.path, scope])
  const value = useMemo<ScopeValue>(() => ({ root, path }), [root, path])
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

/**
 * A focus region. The outermost one owns the registry and binds Tab /
 * Shift+Tab; a nested one groups its focusables and, with `trap`, keeps Tab
 * inside them until it unmounts. Draws nothing.
 */
export const FocusScope = (props: FocusScopeProps) => {
  const parent = useContext(ScopeContext)
  if (parent) return <NestedScope parent={parent} trap={props.trap}>{props.children}</NestedScope>
  return <RootScope {...props} />
}

export type UseFocusableOptions = {
  /** A stable id for `useFocusManager().focus(id)`. Defaults to a generated one. */
  id?: string
  /** Skipped by Tab and never focused. A focused one going disabled moves focus on. */
  disabled?: boolean
  /** Take focus when the scope settles, ahead of first-in-order. */
  autoFocus?: boolean
}

export type Focusable = {
  id: string
  /** True while this holds focus — and always (unless disabled) outside a scope. */
  isFocused: boolean
  /** True when a `FocusScope` is managing this; false means standalone behaviour. */
  inScope: boolean
  /** Ask for focus. A no-op outside a scope. */
  focus: () => void
}

/**
 * Join the nearest `FocusScope`. Gate your `useInput` on `isFocused`. Inside a
 * `FocusRing` (or anything else that already joined and lends its focus),
 * this inherits that focus instead of registering a second stop.
 */
export const useFocusable = ({
  id: given,
  disabled = false,
  autoFocus = false,
}: UseFocusableOptions = {}): Focusable => {
  const generated = useId()
  const id = given ?? generated
  const scope = useContext(ScopeContext)
  const item = useContext(ItemContext)
  const joins = scope !== null && item === null
  const root = scope?.root
  const path = scope?.path

  useEffect(() => {
    if (!joins || !root || !path) return
    root.register({ id, disabled, autoFocus, scopes: path })
    return () => root.unregister(id)
    // Registration is keyed on identity; flags are kept current below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joins, root?.register, id, path])

  useEffect(() => {
    if (!joins || !root) return
    root.update(id, { disabled, autoFocus })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joins, disabled, autoFocus, id])

  if (item) {
    return { id: item.id, isFocused: item.isFocused && !disabled, inScope: true, focus: item.focus }
  }
  if (!root) return { id, isFocused: !disabled, inScope: false, focus: () => {} }
  return {
    id,
    isFocused: !disabled && root.focused === id,
    inScope: true,
    focus: () => root.focus(id),
  }
}

/**
 * Hand a focusable's state to what it wraps, so the wrapped component's own
 * `useFocusable` inherits it rather than adding a second Tab stop.
 */
export const FocusItem = ({
  focusable,
  children,
}: {
  focusable: Focusable
  children: ReactNode
}) => {
  const value = useMemo<ItemValue>(
    () => ({ id: focusable.id, isFocused: focusable.isFocused, focus: focusable.focus }),
    [focusable.id, focusable.isFocused, focusable.focus],
  )
  if (!focusable.inScope) return <>{children}</>
  return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>
}

const NO_SCOPE: FocusManager = {
  focused: undefined,
  focus: () => {},
  focusNext: () => {},
  focusPrevious: () => {},
  blur: () => {},
}

/** Drive focus from code: `focus(id)`, `focusNext()`, `blur()`. Inert outside a scope. */
export const useFocusManager = (): FocusManager => {
  const scope = useContext(ScopeContext)
  if (!scope) return NO_SCOPE
  const { root } = scope
  return {
    focused: root.focused,
    focus: root.focus,
    focusNext: root.focusNext,
    focusPrevious: root.focusPrevious,
    blur: root.blur,
  }
}
