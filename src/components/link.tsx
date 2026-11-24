import React from "react"
import { Text, useStdout } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import { supportsHyperlinks } from "../theme/terminal.js"
import { streamIsTTY } from "./motion.js"

const OSC = "\u001b]"
const BEL = "\u0007"
// Every C0 control, DEL and the C1 range: any one of them inside the URL or
// the label could close the OSC 8 early and smuggle a sequence of its own.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g

// Detection lives with the rest of the terminal capabilities, so the probe
// and `Link` can never disagree about what this terminal draws.
export { supportsHyperlinks } from "../theme/terminal.js"

/**
 * The OSC 8 sequence around `text`, with control characters stripped from
 * both halves so neither can end the sequence early.
 */
export const hyperlink = (url: string, text: string): string =>
  `${OSC}8;;${url.replace(CONTROL, "")}${BEL}${text.replace(CONTROL, "")}${OSC}8;;${BEL}`

type LinkProps = {
  /** Where the link goes. */
  url: string
  /** The visible text. Defaults to the URL itself. */
  children?: string
  /**
   * Override detection: `true` always emits OSC 8, `false` always prints the
   * `text (url)` fallback. Omit it to follow the terminal.
   */
  hyperlink?: boolean
}

/**
 * A clickable reference: OSC 8 in a terminal that draws it, with the visible
 * text in the `link` token and underlined. Where hyperlinks cannot show —
 * piped output, CI, a terminal that does not draw them — it prints
 * `text (url)` with the URL muted, so the address is never lost; a link whose
 * text is the URL prints once.
 */
export const Link = ({ url, children, hyperlink: force }: LinkProps) => {
  const { stdout } = useStdout()
  const theme = useTheme()
  const colors = theme.colors
  const text = children ?? url
  // Inside a ThemeProvider the probe's answer decides; without one, the same
  // detection runs against the stream Ink is drawing to.
  const live = force ?? (theme.provided
    ? theme.policy.hyperlinks
    : supportsHyperlinks(streamIsTTY(stdout)))
  if (live)
    return (
      <Text color={colors.link} underline>
        {hyperlink(url, text)}
      </Text>
    )
  return (
    <Text>
      <Text color={colors.link} underline>
        {text.replace(CONTROL, "")}
      </Text>
      {text === url ? null : (
        <Text color={colors.muted}> ({url.replace(CONTROL, "")})</Text>
      )}
    </Text>
  )
}
