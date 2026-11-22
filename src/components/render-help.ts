import { detectHelpColorMode, encodeLines, layoutHelp } from "./help-layout.js"
import type { HelpColorMode, HelpSpec } from "./help-layout.js"

export type RenderHelpOptions = {
  /** Terminal width; clamped to 80. Defaults to the stream's columns, else 80. */
  columns?: number
  /** Forces an encoding; by default it is read from the stream and the env. */
  mode?: HelpColorMode
  /** Where the help will be written — only its `isTTY` and `columns` are read. */
  stream?: { isTTY?: boolean; columns?: number }
  env?: Record<string, string | undefined>
}

/**
 * The shared CLI help layout as a string, ending in a newline — for a CLI that
 * is not an Ink app, and for commander's `formatHelp`. Byte-for-byte the same
 * as the zsh twin for the same input, width and mode.
 */
export const renderHelp = (spec: HelpSpec, options: RenderHelpOptions = {}): string => {
  const stream = options.stream ?? process.stdout
  const mode = options.mode ?? detectHelpColorMode(stream, options.env ?? process.env)
  return encodeLines(layoutHelp(spec, options.columns ?? stream.columns), mode)
}
