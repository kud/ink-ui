import React from "react"
import { Box } from "ink"
import type { ReactNode } from "react"

type ColumnsProps = {
  /** Horizontal gap between columns (character cells). Defaults to 1. */
  gap?: number
  children: ReactNode
}

// A horizontal flex layout — lays its children out side by side, each sizing
// itself via its own width / flexGrow (e.g. a row of <Panel>s). This is the
// jobs│builds│logs grid pattern, promoted out of @kud/jenkins-ink.
export const Columns = ({ gap = 1, children }: ColumnsProps) => (
  <Box flexDirection="row" gap={gap} flexGrow={1}>
    {children}
  </Box>
)
