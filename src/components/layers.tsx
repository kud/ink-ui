import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import type { ReactNode, RefObject } from "react"
import { Box, Text, useBoxMetrics, useInput, type DOMElement } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import type { Theme, ThemeColor } from "../theme/theme.js"
import { FocusScope } from "./focus.js"
import { FooterHints, tailHints, type Hint } from "./footer-hints.js"
import { LayerDepthContext, LayerLevelContext } from "./layer-context.js"
import {
  KeyHelpProvider,
  useHasKeyRegistry,
  useKeyGroups,
  useLegendAvailable,
} from "./key-bindings.js"

/**
 * Layers: what floats above a screen — a modal that asks, an overlay that
 * takes the whole frame, a popover anchored beside what opened it.
 *
 * One `LayerHost` at the root draws the main tree and, above it, every open
 * `Layer` in the order they opened. The topmost one owns the keyboard: each
 * layer is a `FocusScope trap`, so Tab stays inside it and focus goes back to
 * where it was when it closes, and the host is the one claimant of `esc` /
 * `backspace` while anything is open — `useAppKeys` stands its peel down
 * until the stack is empty again.
 */

export type LayerKind = "modal" | "overlay" | "popover"

export type LayerProps = {
  /**
   * `modal` (the default): centred, over a backdrop that veils the screen.
   * `overlay`: takes the host's whole frame — a legend, a detail sheet.
   * `popover`: a small box at `top` / `left`, nothing veiled.
   */
  kind?: LayerKind
  /** Drawn bold in the frame's first row. */
  title?: string
  /**
   * Called when `esc` or `backspace` reaches this layer while it is on top.
   * Unmount the layer here — a `Layer` is open for as long as it is mounted.
   */
  onClose?: () => void
  /**
   * False leaves `esc` / `backspace` to the layer's content: a layer holding a
   * text field, where `backspace` deletes and the field's `onCancel` closes.
   */
  dismissible?: boolean
  /** Veil the layers beneath. Defaults to true for a modal, false otherwise. */
  backdrop?: boolean
  /**
   * The frame's width in columns, capped at the host's. A modal defaults to
   * 60, an overlay to the host's width, a popover to its content.
   */
  width?: number
  /** A popover's offset from the host's top-left corner. */
  top?: number
  left?: number
  /**
   * Hints drawn at the foot of the frame, before the tail. Defaults to the
   * footer bindings registered on this layer with `useKeyBindings`.
   */
  hints?: Hint[]
  /** Draw the foot of the frame at all. Defaults to true, false for a popover. */
  footer?: boolean
  children?: ReactNode
}

type Entry = LayerProps

type LayerApi = {
  set: (id: string, entry: Entry) => void
  remove: (id: string) => void
}

const LayerApiContext = createContext<LayerApi | null>(null)

/**
 * How a backdrop veils what is under it, as a pure function so the choice is
 * testable. Ink paints a cell or leaves it; it cannot dim a cell it does not
 * own. So with colour the veil is the `track` ground — the theme's own
 * "ground, not ink" — and without it the veil is the glyph set's empty bar
 * cell, dim: `░`, or `.` on an ASCII terminal. A screen reader gets none.
 */
export type BackdropStyle = {
  char: string
  backgroundColor: ThemeColor
  dim: boolean
} | null

export const backdropStyle = (theme: Theme): BackdropStyle => {
  if (theme.policy.screenReader) return null
  if (theme.policy.color) {
    return { char: " ", backgroundColor: theme.colors.track, dim: false }
  }
  return { char: theme.glyphs.barEmpty, backgroundColor: undefined, dim: true }
}

/** A block of cells painted over whatever was there, so nothing shows through. */
const Fill = ({
  width,
  height,
  char = " ",
  backgroundColor,
  dim = false,
}: {
  width: number
  height: number
  char?: string
  backgroundColor?: ThemeColor
  dim?: boolean
}) =>
  width > 0 && height > 0 ? (
    <Box position="absolute" top={0} left={0} flexDirection="column" width={width} height={height}>
      {Array.from({ length: height }, (_, row) => (
        <Text key={row} backgroundColor={backgroundColor} dimColor={dim} wrap="truncate">
          {char.repeat(width)}
        </Text>
      ))}
    </Box>
  ) : null

/** Measure a box after layout, following every later layout pass. */
const useSize = (ref: RefObject<DOMElement | null>) => {
  const metrics = useBoxMetrics(ref)
  return { width: metrics.width, height: metrics.height, measured: metrics.hasMeasured }
}

/** The bordered, opaque body of a layer, with its title and its foot. */
const Frame = ({
  title,
  width,
  height,
  hints,
  footer,
  children,
}: {
  title?: string
  width?: number
  height?: number
  hints?: Hint[]
  footer: boolean
  children?: ReactNode
}) => {
  const theme = useTheme()
  const ref = useRef<DOMElement>(null)
  const size = useSize(ref)
  const level = useContext(LayerLevelContext)
  const registered = useKeyGroups(level)
  const legend = useLegendAvailable()
  const own: Hint[] =
    hints ??
    registered.flatMap((group) =>
      group.bindings
        .filter((binding) => binding.footer !== false)
        .map((binding): Hint => [binding.key, binding.label]),
    )
  return (
    <Box ref={ref} width={width} height={height} flexDirection="column" flexShrink={0}>
      {size.measured ? <Fill width={size.width} height={size.height} /> : null}
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle={theme.glyphs.border}
        borderColor={theme.colors.info}
        paddingX={1}
      >
        {title !== undefined ? <Text bold>{title}</Text> : null}
        <Box flexDirection="column" flexGrow={1} marginTop={title !== undefined ? 1 : 0}>
          {children}
        </Box>
        {footer ? (
          <Box marginTop={1}>
            <FooterHints hints={[...own, ...tailHints("nested", legend)]} />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

const LayerSlot = ({
  id,
  level,
  entries,
  listeners,
  width,
  height,
}: {
  id: string
  level: number
  entries: RefObject<Map<string, Entry>>
  listeners: RefObject<Map<string, () => void>>
  width: number
  height: number
}) => {
  const theme = useTheme()
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const entry = entries.current.get(id)
  const drawn = useRef(entry)
  drawn.current = entry
  useEffect(() => {
    listeners.current.set(id, rerender)
    // A layer that updated in the same commit this slot mounted wrote to the
    // ref before the listener existed; catch up once.
    if (entries.current.get(id) !== drawn.current) rerender()
    return () => {
      listeners.current.delete(id)
    }
  }, [id, listeners, entries])
  if (!entry || width === 0) return null

  const kind = entry.kind ?? "modal"
  const veil = (entry.backdrop ?? kind === "modal") ? backdropStyle(theme) : null
  const footer = entry.footer ?? kind !== "popover"
  const frameWidth =
    kind === "overlay"
      ? Math.min(entry.width ?? width, width)
      : entry.width === undefined
        ? kind === "modal"
          ? Math.min(60, width)
          : undefined
        : Math.min(entry.width, width)

  const frame = (
    <Frame
      title={entry.title}
      width={frameWidth}
      height={kind === "overlay" ? height : undefined}
      hints={entry.hints}
      footer={footer}
    >
      {entry.children}
    </Frame>
  )

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width={width}
      height={height}
      flexDirection="column"
      justifyContent={kind === "modal" ? "center" : "flex-start"}
      alignItems={kind === "modal" ? "center" : "flex-start"}
    >
      {veil ? (
        <Fill
          width={width}
          height={height}
          char={veil.char}
          backgroundColor={veil.backgroundColor}
          dim={veil.dim}
        />
      ) : null}
      <LayerLevelContext.Provider value={level}>
        <FocusScope trap>
          {kind === "popover" ? (
            <Box position="absolute" top={entry.top ?? 0} left={entry.left ?? 0}>
              {frame}
            </Box>
          ) : (
            frame
          )}
        </FocusScope>
      </LayerLevelContext.Provider>
    </Box>
  )
}

type LayerHostProps = {
  /** Fix the host's size. Defaults to whatever the main tree takes. */
  width?: number
  height?: number
  /**
   * Stand the host's `esc` / `backspace` down — while a `CommandPalette`
   * that is not a `Layer` is up, say. Layers stay drawn.
   */
  isActive?: boolean
  /**
   * Bind Tab / Shift+Tab in the `FocusScope` the host mounts when there is
   * none above it. Pass false where `useTabs` owns Tab. Ignored under an
   * existing scope, which already decided.
   */
  focusKeys?: boolean
  children: ReactNode
}

/**
 * The root of an app with layers. Draws `children` as the main tree and every
 * open `Layer` above it, binds `esc` / `backspace` to close the topmost while
 * any is open, and supplies the `FocusScope` and key registry the layers need
 * when nothing above it already does.
 *
 * A layer's content is drawn here, not where its `Layer` is mounted: give it
 * the contexts it reads by mounting the host inside their providers.
 */
export const LayerHost = (props: LayerHostProps) => {
  const hasRegistry = useHasKeyRegistry()
  const host = <Host {...props} />
  return hasRegistry ? host : <KeyHelpProvider>{host}</KeyHelpProvider>
}

const Host = ({
  width,
  height,
  isActive = true,
  focusKeys = true,
  children,
}: LayerHostProps) => {
  const entries = useRef(new Map<string, Entry>())
  const listeners = useRef(new Map<string, () => void>())
  const [order, setOrder] = useState<readonly string[]>([])
  const orderRef = useRef(order)
  orderRef.current = order

  // The stack's shape lives in state; each layer's content lives in a ref and
  // re-renders only its own slot. A layer whose parent re-renders on every
  // depth change would otherwise re-render the host, which re-renders the
  // parent, without end.
  const api = useMemo<LayerApi>(
    () => ({
      set: (id, entry) => {
        const known = entries.current.has(id)
        entries.current.set(id, entry)
        if (!known) setOrder((prev) => [...prev, id])
        else listeners.current.get(id)?.()
      },
      remove: (id) => {
        entries.current.delete(id)
        setOrder((prev) => prev.filter((other) => other !== id))
      },
    }),
    [],
  )

  useInput(
    (_input, key) => {
      if (!(key.escape || key.backspace || key.delete)) return
      const top = entries.current.get(orderRef.current[orderRef.current.length - 1] ?? "")
      if (top && top.dismissible !== false) top.onClose?.()
    },
    { isActive: isActive && order.length > 0 },
  )

  const ref = useRef<DOMElement>(null)
  const size = useSize(ref)

  return (
    <FocusScope keys={focusKeys}>
      <LayerApiContext.Provider value={api}>
        <LayerDepthContext.Provider value={order.length}>
          <Box ref={ref} flexDirection="column" width={width} height={height}>
            {children}
            {order.map((id, index) => (
              <LayerSlot
                key={id}
                id={id}
                level={index + 1}
                entries={entries}
                listeners={listeners}
                width={size.width}
                height={size.height}
              />
            ))}
          </Box>
        </LayerDepthContext.Provider>
      </LayerApiContext.Provider>
    </FocusScope>
  )
}

/**
 * Something drawn above the screen while it is mounted: mount it to open,
 * unmount it (from `onClose`) to close. Inside a `LayerHost` it draws nothing
 * where it stands and appears on the host's stack instead; without one it
 * draws its frame in place and still traps focus.
 */
export const Layer = (props: LayerProps) => {
  const api = useContext(LayerApiContext)
  const id = useId()
  useEffect(() => {
    api?.set(id, props)
  })
  useEffect(() => {
    if (!api) return
    return () => api.remove(id)
  }, [api, id])
  if (api) return null
  return (
    <FocusScope trap>
      <Frame
        title={props.title}
        width={props.width}
        hints={props.hints}
        footer={props.footer ?? (props.kind ?? "modal") !== "popover"}
      >
        {props.children}
      </Frame>
    </FocusScope>
  )
}

export type LayerState = {
  /** The level this component sits on: 0 for the main tree, n inside the nth layer. */
  level: number
  /** How many layers are open. */
  depth: number
  /** True when nothing is open above this component — the only place keys should go. */
  isTop: boolean
}

/**
 * Where this component sits in the stack. Gate your own hotkeys on `isTop`,
 * so a screen under a dialog stops answering while the dialog is up:
 * `useInput(handler, { isActive: useLayer().isTop })`.
 */
export const useLayer = (): LayerState => {
  const depth = useContext(LayerDepthContext)
  const level = useContext(LayerLevelContext)
  return { level, depth, isTop: level >= depth }
}
