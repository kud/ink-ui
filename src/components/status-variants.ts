import { colors } from "../tokens.js"

export type StatusVariant = "success" | "error" | "warning" | "info"

// Each variant carries a distinct glyph (shape), so status reads without relying
// on colour — colour only reinforces. Shared by StatusMessage, Alert, and Toast.
export const STATUS_VARIANTS: Record<
  StatusVariant,
  { icon: string; color: string }
> = {
  success: { icon: "✓", color: colors.success },
  error: { icon: "✗", color: colors.error },
  warning: { icon: "⚠", color: colors.warning },
  info: { icon: "ℹ", color: colors.info },
}
