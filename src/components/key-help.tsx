import React, { useContext, useState } from "react"
import { Box, Text, useInput } from "ink"
import stringWidth from "string-width"
import { useTheme } from "../theme/theme-provider.js"
import { FooterHints, keyLabel, type Hint } from "./footer-hints.js"
import { LayerDepthContext } from "./layer-context.js"
import { Layer, type LayerKind } from "./layers.js"
import {
  useKeyGroups,
  useLegendPresence,
  type KeyBinding,
  type KeyGroup,
} from "./key-bindings.js"

type KeyLegendProps = {
  groups: readonly KeyGroup[]
}

/**
 * The full legend, presentational: each group's title, then its keys in an
 * aligned column, the groups side by side and wrapping. The key is the answer and is bold; the title is context in
 * `secondary`. `KeyHelp` draws it in its `?` layer; draw it yourself to put a
 * legend somewhere else.
 */
export const KeyLegend = ({ groups }: KeyLegendProps) => {
  const theme = useTheme()
  const ascii = theme.icons === "ascii"
  // Groups sit side by side and wrap, so a legend stays short enough to fit
  // over a short screen; keys align within each group.
  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={4} rowGap={1}>
      {groups.map((group) => {
        const keyWidth = Math.max(
          0,
          ...group.bindings.map((binding) => stringWidth(keyLabel(binding.key, ascii))),
        )
        return (
          <Box key={group.title} flexDirection="column" flexShrink={0}>
            <Text bold color={theme.colors.secondary}>
              {group.title}
            </Text>
            {group.bindings.map((binding) => (
              <Box key={`${binding.key}:${binding.label}`}>
                <Box width={keyWidth + 2} flexShrink={0}>
                  <Text bold>{keyLabel(binding.key, ascii)}</Text>
                </Box>
                <Text>{binding.label}</Text>
              </Box>
            ))}
          </Box>
        )
      })}
    </Box>
  )
}

/** The keys every page answers to, in the legend's last group. */
export const appBindings = (nested: boolean): KeyBinding[] => [
  ...(nested ? [{ key: "esc ⌫", label: "back" }] : []),
  { key: "?", label: "this legend" },
  { key: "q", label: "quit" },
]

type KeyHelpProps = {
  /**
   * Where the main screen sits, for the footer's tail: `⌫ back` on a nested
   * page. Inside a layer the footer is always nested.
   */
  page?: "root" | "nested"
  /** Offer the `?` legend: bind `?` and end the footer with `? help`. Defaults to true. */
  help?: boolean
  /** False stands `?` down — while a text field has focus, where `?` is a letter. */
  isActive?: boolean
  /** The legend's title. */
  title?: string
  /** How the legend opens. Defaults to `modal`. */
  legend?: LayerKind
  /** The legend's width; a modal defaults to 60 columns. */
  width?: number
  /** The title of the group the app's own keys (back, legend, quit) fall under. */
  appGroup?: string
}

/**
 * The keys that work right now, drawn from what screens registered with
 * `useKeyBindings`: a compact footer of the topmost layer's footer bindings
 * followed by the fixed tail, and a full legend, grouped, that `?` opens on
 * the layer stack and `?`, `esc` or `backspace` closes. Mount it once, in the
 * main tree, inside a `LayerHost`.
 */
export const KeyHelp = ({
  page = "root",
  help = true,
  isActive = true,
  title = "Keys",
  legend = "modal",
  width,
  appGroup = "App",
}: KeyHelpProps) => {
  const depth = useContext(LayerDepthContext)
  // The level the legend describes, frozen when `?` is pressed: the top of
  // the stack at that moment, so the legend's own layer never shifts it.
  const [openedOver, setOpenedOver] = useState<number | null>(null)
  const open = openedOver !== null
  useLegendPresence(help)

  const target = openedOver ?? depth
  const nested = target > 0 || page === "nested"
  const groups = useKeyGroups(target)

  useInput(
    (input) => {
      if (input === "?") setOpenedOver((was) => (was === null ? depth : null))
    },
    { isActive: help && isActive },
  )

  const footer: Hint[] = groups.flatMap((group) =>
    group.bindings
      .filter((binding) => binding.footer !== false)
      .map((binding): Hint => [binding.key, binding.label]),
  )

  return (
    <>
      <FooterHints hints={footer} page={nested ? "nested" : "root"} help={help} />
      {open ? (
        <Layer kind={legend} title={title} width={width} onClose={() => setOpenedOver(null)}>
          <KeyLegend
            groups={[...groups, { title: appGroup, bindings: appBindings(nested) }]}
          />
        </Layer>
      ) : null}
    </>
  )
}
