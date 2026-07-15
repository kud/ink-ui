import React, { useEffect, useState } from "react"
import { Box, useStdout } from "ink"
import type { ReactNode } from "react"

type ScreenProps = {
  children: ReactNode
  /**
   * Enter the terminal's alternate buffer so the app owns the whole screen and
   * the previous scrollback is restored on exit. Defaults to true. Set false to
   * render full-height inline instead.
   */
  altScreen?: boolean
}

const ENTER_ALT = "\x1b[?1049h"
const LEAVE_ALT = "\x1b[?1049l"

// A full-screen shell: sizes to the terminal, tracks resize, and (by default)
// swaps into the alternate buffer so the TUI takes over the whole screen and
// restores the prior scrollback on exit. Generalised from cockpit's hand-rolled
// alt-screen shell. NOTE: needs validation in a real TTY before surfaces rely on
// it — alt-screen escapes can't be exercised in a non-interactive context.
export const Screen = ({ children, altScreen = true }: ScreenProps) => {
  const { stdout } = useStdout()
  const [size, setSize] = useState({
    columns: stdout.columns || 80,
    rows: stdout.rows || 24,
  })

  useEffect(() => {
    const restore = () => {
      if (altScreen) stdout.write(LEAVE_ALT)
    }
    if (altScreen) stdout.write(ENTER_ALT)

    const onResize = () =>
      setSize({ columns: stdout.columns || 80, rows: stdout.rows || 24 })
    stdout.on("resize", onResize)
    // Restore the main buffer even on a hard process.exit() (which skips React unmount).
    process.on("exit", restore)

    return () => {
      stdout.off("resize", onResize)
      process.off("exit", restore)
      restore()
    }
  }, [stdout, altScreen])

  return (
    <Box width={size.columns} height={size.rows} flexDirection="column">
      {children}
    </Box>
  )
}
