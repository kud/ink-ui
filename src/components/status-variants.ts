import { glyphs } from "@kud/glyphs"
import { colors } from "../tokens.js"
import { getIconMode } from "../icon-mode.js"

export type StatusVariant = "success" | "error" | "warning" | "info"

// Unicode glyphs (the safe default — render on any terminal) and their Nerd Font
// counterparts from @kud/glyphs. Each variant is distinguished by shape, not
// colour, so status reads for colourblind users; colour only reinforces.
const UNICODE: Record<StatusVariant, string> = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
}

const NERD: Record<StatusVariant, string> = {
  success: glyphs.check,
  error: glyphs.cross,
  warning: glyphs.warning,
  info: glyphs.info,
}

const COLOR: Record<StatusVariant, string> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
}

// Resolved at render time so it honours the current icon mode.
export const statusVariant = (
  variant: StatusVariant,
): { icon: string; color: string } => ({
  icon: (getIconMode() === "nerd" ? NERD : UNICODE)[variant],
  color: COLOR[variant],
})
