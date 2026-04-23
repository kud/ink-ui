import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

type BannerProps = {
  title: string
  subtitle?: string
  icon?: string
}

export const Banner = ({ title, subtitle, icon = "◆" }: BannerProps) => (
  <Box gap={1} marginBottom={1}>
    <Text color={colors.accent}>{icon}</Text>
    <Text bold>{title}</Text>
    {subtitle && <Text dimColor>{subtitle}</Text>}
  </Box>
)
