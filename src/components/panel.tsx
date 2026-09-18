import React from "react"
import { Box, Text } from "ink"
import type { ReactNode } from "react"
import { colors } from "../tokens.js"

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
  color = colors.info,
  focused = false,
  width,
  height,
  flexGrow,
  children,
}: PanelProps) => (
  <Box
    flexDirection="column"
    width={width}
    height={height}
    flexGrow={flexGrow}
    borderStyle="round"
    borderColor={focused ? color : colors.muted}
    overflow="hidden"
  >
    {title && (
      <Text color={focused ? color : colors.muted} bold>
        {focused ? `${title} ●` : title}
      </Text>
    )}
    {children}
  </Box>
)
