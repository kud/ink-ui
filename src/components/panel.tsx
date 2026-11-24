import React from "react"
import { Box, Text } from "ink"
import type { ReactNode } from "react"
import { useTheme } from "../theme/theme-provider.js"

type PanelProps = {
  /** Optional title shown in the panel's header row. */
  title?: string
  /** Accent colour for the border + title when focused. Defaults to the info token. */
  color?: string
  /** When true the border brightens to `color` and the title gains a ● marker. */
  focused?: boolean
  width?: number
  height?: number
  flexGrow?: number
  children: ReactNode
}

// A bordered pane with an optional coloured title header. Border brightens and
// the title gains a ● marker when focused — generalised from @kud/jenkins-ink's
// original, with color/focused made optional so any surface can use it.
export const Panel = ({
  title,
  color,
  focused = false,
  width,
  height,
  flexGrow,
  children,
}: PanelProps) => {
  const theme = useTheme()
  const tint = theme.policy.color ? (color ?? theme.colors.info) : undefined
  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
      borderStyle={theme.glyphs.border}
      borderColor={focused ? tint : theme.colors.muted}
      overflow="hidden"
    >
      {title && (
        <Text
          color={focused ? tint : theme.colors.muted}
          bold
          aria-label={focused ? `${title} (focused)` : undefined}
        >
          {focused ? `${title} ${theme.glyphs.dot}` : title}
        </Text>
      )}
      {children}
    </Box>
  )
}
