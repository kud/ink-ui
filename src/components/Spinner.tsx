import React from "react"
import { Box, Text } from "ink"
import InkSpinner from "ink-spinner"
import { colors } from "../tokens.js"

type SpinnerProps = {
  label?: string
}

export const Spinner = ({ label }: SpinnerProps) => (
  <Box gap={1}>
    <Text color={colors.accent}>
      <InkSpinner type="dots" />
    </Text>
    {label && <Text dimColor>{label}</Text>}
  </Box>
)
