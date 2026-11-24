import React from "react"
import { Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"

export type BadgeVariant = "success" | "error" | "warning" | "info"

type BadgeProps = {
  children: string
  variant?: BadgeVariant
}

export const Badge = ({ children, variant = "info" }: BadgeProps) => {
  const theme = useTheme()
  return <Text color={theme.colors[variant]}>[{children}]</Text>
}
