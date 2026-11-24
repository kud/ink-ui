import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import cliSpinners from "cli-spinners"
import { useTheme } from "../theme/theme-provider.js"

type SpinnerProps = {
  label?: string
}

const INTERVAL = cliSpinners.dots.interval

/**
 * A busy mark and its label. It turns only where motion can show and is
 * wanted: with the theme's policy saying no motion — reduced motion, piped
 * output, a screen reader — it draws its first frame and stays still, so a
 * log never fills with frames and a screen reader is not re-read ten times
 * a second. The label carries the meaning either way.
 */
export const Spinner = ({ label }: SpinnerProps) => {
  const theme = useTheme()
  const frames = theme.glyphs.spinner
  const motion = theme.policy.motion
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!motion) return
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length)
    }, INTERVAL)
    return () => clearInterval(timer)
  }, [motion, frames.length])

  return (
    <Box gap={1}>
      <Text color={theme.colors.accent} aria-hidden>
        {frames[motion ? frame % frames.length : 0]}
      </Text>
      {label && <Text dimColor>{label}</Text>}
    </Box>
  )
}
