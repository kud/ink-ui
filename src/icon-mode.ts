export type IconMode = "text" | "nerd"

let current: IconMode = "text"

// Set once at startup — e.g. from a user preference or an env check for a Nerd
// Font. Components read this at render time, so set it before mounting the app.
// "text" (unicode) is the safe default; "nerd" swaps in @kud/glyphs Nerd glyphs.
export const setIconMode = (mode: IconMode): void => {
  current = mode
}

export const getIconMode = (): IconMode => current
