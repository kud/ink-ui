import type { Theme } from "../theme/theme.js"

export type StatusVariant = "success" | "error" | "warning" | "info"

/**
 * A status variant's mark and colour, from the theme. Each variant is
 * distinguished by shape, not colour, so status reads for colourblind users;
 * colour only reinforces. The mark follows the theme's glyph set — unicode
 * (`✓ ✗ ⚠ ℹ`), the Nerd Font forms from `@kud/glyphs` in `nerd` icon mode,
 * or shui's 7-bit `+ x ! i` where the locale cannot draw either — and the
 * colour is `undefined` when the theme draws none.
 */
export const statusVariant = (
  theme: Theme,
  variant: StatusVariant,
): { icon: string; color: string | undefined } => ({
  icon: theme.glyphs[variant],
  color: theme.colors[variant],
})
