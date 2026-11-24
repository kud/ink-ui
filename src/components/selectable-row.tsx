import React from "react"
import { Box, Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"

type SelectableRowProps = {
  active?: boolean
  /** The active row's pointer. Defaults to the theme's (`❯`, or `>` in ASCII). */
  marker?: string
  children: React.ReactNode
}

const isTextValue = (value: React.ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number"

export const SelectableRow = ({
  active = false,
  marker,
  children,
}: SelectableRowProps) => {
  const theme = useTheme()
  const pointer = marker ?? theme.glyphs.pointer
  return (
    <Box aria-role="option" aria-state={{ selected: active }}>
      {/* The gutter must never shrink. A row whose content overflows its
          container compresses every flexible child, and this one is four
          characters wide — losing a single column to that shifts the whole row
          left and breaks alignment with its neighbours, but only for rows long
          enough to overflow, which is why it survives short test fixtures. */}
      <Box flexShrink={0}>
        <Text color={theme.colors.info} aria-hidden>
          {active ? `  ${pointer} ` : "    "}
        </Text>
      </Box>
      {isTextValue(children) ? <Text bold={active}>{children}</Text> : children}
    </Box>
  )
}
