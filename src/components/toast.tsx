import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import { statusVariant, type StatusVariant } from "./status-variants.js"
import { useTheme } from "../theme/theme-provider.js"

type ToastProps = {
  message: string
  variant?: StatusVariant
  // Milliseconds before the toast dismisses itself.
  duration?: number
  onDone?: () => void
}

// A self-dismissing inline message — the in-TUI counterpart to a native
// notification. Renders nothing once dismissed. Consolidates the ad-hoc
// "showFlash" pattern used across CLIs.
export const Toast = ({
  message,
  variant = "info",
  duration = 2000,
  onDone,
}: ToastProps) => {
  const theme = useTheme()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!visible) return null

  const { icon, color } = statusVariant(theme, variant)
  return (
    <Box gap={1}>
      <Text color={color} aria-label={`${variant}:`}>
        {icon}
      </Text>
      <Text>{message}</Text>
    </Box>
  )
}
