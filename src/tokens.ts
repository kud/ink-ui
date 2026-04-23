export const colors = {
  accent: "#FF8C00",
  muted: "gray",
  success: "green",
  error: "red",
  warning: "yellow",
  info: "cyan",
} as const

export type Color = (typeof colors)[keyof typeof colors]

export const spacing = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
} as const

export type Spacing = (typeof spacing)[keyof typeof spacing]
