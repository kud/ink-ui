import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import cliSpinners from "cli-spinners"
import { colors } from "../tokens.js"

type SpinnerProps = {
  label?: string
}

const dots = cliSpinners.dots

export const Spinner = ({ label }: SpinnerProps) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % dots.frames.length)
    }, dots.interval)
    return () => clearInterval(timer)
  }, [])

  return (
    <Box gap={1}>
      <Text color={colors.accent}>{dots.frames[frame]}</Text>
      {label && <Text dimColor>{label}</Text>}
    </Box>
  )
}
