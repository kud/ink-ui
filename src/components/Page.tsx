import React, { type ReactNode } from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"
import { FooterHints, type Hint } from "./FooterHints.js"

type PageProps = {
  /** The app's name, bold, after its glyph. Constant across every page of the app. */
  title: string
  /** One glyph before the name — the app's mark. */
  icon?: string
  /** What follows the name, dim: counts, scope, freshness — `12 items · @you · updated 2m ago`. */
  facts?: string
  /** The tab strip, only on pages that have one. A detail page passes none and the band is dropped, never left empty. */
  tabs?: ReactNode
  /** Right-aligned, dim, above the hints: `3 of 12`, `↓ 40%`. */
  counter?: string
  /** The host's own hints — navigation, actions, modes. The tail (`⌫ back · ? help · q quit`) is derived from `page`. */
  hints?: Hint[]
  /** Root or nested, which decides whether `⌫ back` is drawn. Defaults to root. */
  page?: "root" | "nested"
  /** Whether the app has a `?` legend; drops `? help` from the tail when false. */
  help?: boolean
  width?: number
  height?: number
  children: ReactNode
}

/**
 * The one frame every screen of an app sits in — list, detail, loading,
 * error, prompt — so the border and the title row never come and go between
 * states. Six bands inside a round border: title row, the blank under it,
 * tabs where the page has them, body, counter, hints. Presentational: it
 * binds no keys, so a host can take the frame without surrendering its own
 * keyboard handling. `Panel` stays for inner regions inside `Columns`.
 *
 * A detail page keeps the app's title row rather than taking the item's key
 * as its title: the title row is how you know which app you are in and how
 * stale it is, and neither changes when you open an item. The item's key
 * belongs in `facts` as a breadcrumb.
 */
export const Page = ({
  title,
  icon,
  facts,
  tabs,
  counter,
  hints,
  page = "root",
  help = true,
  width,
  height,
  children,
}: PageProps) => (
  <Box
    flexDirection="column"
    width={width}
    height={height}
    borderStyle="round"
    borderColor={colors.muted}
    overflow="hidden"
  >
    <Box paddingLeft={1}>
      {icon ? <Text>{icon} </Text> : null}
      <Text bold>{title}</Text>
      {facts ? <Text dimColor>{"   " + facts}</Text> : null}
    </Box>
    {tabs ? (
      <Box paddingLeft={2} marginTop={1}>
        {tabs}
      </Box>
    ) : null}
    <Box flexDirection="column" flexGrow={1} marginTop={1}>
      {children}
    </Box>
    {counter ? (
      <Box justifyContent="flex-end" paddingRight={1}>
        <Text dimColor>{counter}</Text>
      </Box>
    ) : null}
    {hints ? (
      <Box paddingLeft={2}>
        <FooterHints hints={hints} page={page} help={help} />
      </Box>
    ) : null}
  </Box>
)

/** Lines the frame itself spends around the body: two borders, the title row, the blank under it. */
export const PAGE_CHROME = 4
