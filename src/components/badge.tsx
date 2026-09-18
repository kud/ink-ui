import React from "react"
import { Text } from "ink"
import { colors } from "../tokens.js"

export type BadgeVariant = "success" | "error" | "warning" | "info"

type BadgeProps = {
  children: string
  variant?: BadgeVariant
}

const variantColor: Record<BadgeVariant, string> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
}

export const Badge = ({ children, variant = "info" }: BadgeProps) => (
  <Text color={variantColor[variant]}>[{children}]</Text>
)
