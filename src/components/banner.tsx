import React from "react"
import { Box, Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"

type BannerProps = {
  title: string
  subtitle?: string
  icon?: string
}

export const Banner = ({ title, subtitle, icon = "◆" }: BannerProps) => {
  const theme = useTheme()
  return (
    <Box gap={1} marginBottom={1}>
      <Text color={theme.colors.accent} aria-hidden>
        {icon}
      </Text>
      <Text bold>{title}</Text>
      {subtitle && <Text dimColor>{subtitle}</Text>}
    </Box>
  )
}
