import React from "react"
import { Box, Text } from "ink"
import type { ReactNode } from "react"
import stringWidth from "string-width"
import { useTheme } from "../theme/theme-provider.js"
import type { Theme } from "../theme/theme.js"
import { FocusItem, useFocusable } from "./focus.js"

type FocusRingProps = {
  /** The field's name, drawn in the ring's title row. */
  label?: string
  /** A stable id for `useFocusManager().focus(id)`. */
  id?: string
  /** Skipped by Tab; the label dims and says `disabled`. */
  disabled?: boolean
  /** Take focus when the scope settles. */
  autoFocus?: boolean
  width?: number
  flexGrow?: number
  children: ReactNode
}

export type FocusRingStyle = {
  borderStyle: "round" | "bold" | "classic"
  borderColor: string | undefined
  /** The title row's leading mark: the pointer when focused, a space as wide otherwise. */
  marker: string
}

/**
 * How a ring looks in a given state, as a pure function so the colour choice
 * can be tested (a test frame carries no escape codes).
 *
 * Focus is never colour alone: the pointer leads the title, the label is
 * bold, and on a unicode terminal the border turns heavy. The accent only
 * reinforces it, and disappears with `NO_COLOR` while the rest stays.
 */
export const focusRingStyle = (theme: Theme, focused: boolean): FocusRingStyle => {
  const pointer = theme.glyphs.pointer
  return {
    borderStyle: focused && theme.glyphs.border === "round" ? "bold" : theme.glyphs.border,
    borderColor: focused ? theme.colors.accent : theme.colors.dim,
    marker: focused ? pointer : " ".repeat(pointer.length),
  }
}

/**
 * A bordered region that is one Tab stop. What it wraps inherits its focus,
 * so `<FocusRing label="Name"><TextInput /></FocusRing>` is a single stop
 * whose input listens only while the ring is focused.
 */
export const FocusRing = ({
  label,
  id,
  disabled = false,
  autoFocus = false,
  width,
  flexGrow,
  children,
}: FocusRingProps) => {
  const theme = useTheme()
  const focusable = useFocusable({ id, disabled, autoFocus })
  // Standalone (no scope) a ring is not "focused" — it is simply a frame.
  const focused = focusable.inScope && focusable.isFocused
  const style = focusRingStyle(theme, focused)
  return (
    <Box
      flexDirection="column"
      width={width}
      flexGrow={flexGrow}
      borderStyle={style.borderStyle}
      borderColor={style.borderColor}
      paddingX={1}
    >
      {label !== undefined && (
        <Text
          bold={focused}
          dimColor={disabled}
          color={focused ? theme.colors.accent : undefined}
          aria-label={`${label}${focused ? " (focused)" : ""}${disabled ? " (disabled)" : ""}`}
        >
          {`${style.marker} ${label}`}
          {disabled ? <Text color={theme.colors.muted}>{"  disabled"}</Text> : null}
        </Text>
      )}
      {/* The body sits under the label, past the marker's column. */}
      <Box flexDirection="column" paddingLeft={label === undefined ? 0 : stringWidth(style.marker) + 1}>
        <FocusItem focusable={focusable}>{children}</FocusItem>
      </Box>
    </Box>
  )
}
