// Interactive component gallery — run with `npm run demo`.
// Dev-only: not part of the published package (tsup bundles src/index.ts).
//
// The app shape every consumer follows: probe the terminal BEFORE Ink takes
// stdin, then hand the answer to one ThemeProvider around the whole tree.
// `INK_UI_THEME=minimal|plain` and `INK_UI_BACKGROUND=light|dark` override
// what the probe chose, to look at the other levels on one terminal.
import React from "react"
import { render } from "ink"
import {
  ThemeProvider,
  probeTerminal,
  detectTheme,
  THEME_NAMES,
  type ThemeName,
  type TerminalBackground,
} from "../index.js"
import { Gallery } from "./gallery.js"

const capabilities = await probeTerminal()
const requested = process.env["INK_UI_THEME"] as ThemeName | undefined
const name = requested && THEME_NAMES.includes(requested) ? requested : undefined
const background =
  (process.env["INK_UI_BACKGROUND"] as TerminalBackground | undefined) ??
  detectTheme(capabilities)

render(
  <ThemeProvider capabilities={capabilities} name={name} background={background}>
    <Gallery />
  </ThemeProvider>,
)
