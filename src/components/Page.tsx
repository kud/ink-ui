import React, { type ReactNode } from "react"
import { Box, Text } from "ink"
import stringWidth from "string-width"
import { colors } from "../tokens.js"
import { FooterHints, type Hint } from "./FooterHints.js"

/**
 * The title row's live segment. `news` is something to act on (`● 5 new ·
 * 38 moved · r apply`) and draws bold in the accent; `busy` is in flight
 * (`↻ refreshing…`) and draws in the info colour; `quiet` is freshness
 * (`updated 42m ago`) and draws dim.
 */
export type PageStatus = { text: string; tone: "news" | "busy" | "quiet" }

type PageProps = {
  /** The app's name, bold, in the accent. Constant across every page of the app. */
  title: string
  /** One glyph before the name — the app's mark. */
  icon?: string
  /** How many things the page holds; drawn dim as `  127 items  ·  ` with a width-stable count. */
  count?: number
  /** What `count` counts. Defaults to `item`. */
  noun?: string
  /** Whose things these are — `@kud` — drawn plain, never dim: scope is the fact the row exists to state. */
  user?: string
  /** A further scope in the host's words, dim: `work`, or a breadcrumb like `ACME-102 · 3 of 12`. */
  scope?: string
  /** Something worth acting on today — a budget running out — bold in the accent. `critical` turns it red. */
  alert?: string
  critical?: boolean
  /** Freshness or news; see `PageStatus`. */
  status?: PageStatus
  /** Free text after the name, dim — for a host with nothing structured to say (`loading…`). */
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

const STATUS_COLOR: Record<PageStatus["tone"], string | undefined> = {
  news: colors.accent,
  busy: colors.info,
  quiet: undefined,
}

/**
 * The one frame every screen of an app sits in — list, detail, loading,
 * error, prompt — so the border and the title row never come and go between
 * states. Six bands inside a round border: title row, the blank under it,
 * tabs where the page has them, body, counter, hints. Presentational: it
 * binds no keys, so a host can take the frame without surrendering its own
 * keyboard handling. `Panel` stays for inner regions inside `Columns`.
 *
 * The title row is the cockpit's, made general: brand · count · user · scope ·
 * alert · status, then a dotted rule to the edge. The count is padded in
 * front rather than behind so the header does not shuffle as it changes and
 * the digits stay against their noun. Only the status segment changes width
 * from one refresh to the next, and the rule after it absorbs the difference.
 *
 * A detail page keeps the app's title row rather than taking the item's key
 * as its title: the title row is how you know which app you are in and how
 * stale it is, and neither changes when you open an item. The item's key
 * belongs in `scope` as a breadcrumb.
 */
export const Page = ({
  title,
  icon,
  count,
  noun = "item",
  user,
  scope,
  alert,
  critical = false,
  status,
  facts,
  tabs,
  counter,
  hints,
  page = "root",
  help = true,
  width,
  height,
  children,
}: PageProps) => {
  const brand = icon ? `${icon} ${title}` : title
  const countSeg =
    count === undefined
      ? facts
        ? `   ${facts}  `
        : "  "
      : `  ${String(count).padStart(3)} ${noun}${count !== 1 ? "s" : ""}  ·  `
  const userSeg = user ? `@${user}  ` : ""
  const scopeSeg = scope ? `${scope}  ` : ""
  const alertSeg = alert ? `${alert}  ` : ""
  const statusSeg = status ? `${status.text}  ` : ""
  // Two borders, the left padding, and one cell of air before the right border.
  const inner = (width ?? 80) - 4
  const used = stringWidth(
    brand + countSeg + userSeg + scopeSeg + alertSeg + statusSeg,
  )
  const fill = Math.max(4, inner - used)

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={colors.muted}
      overflow="hidden"
    >
      <Box paddingLeft={1}>
        <Text color={colors.accent} bold>
          {brand}
        </Text>
        <Text dimColor>{countSeg}</Text>
        {userSeg ? <Text>{userSeg}</Text> : null}
        {scopeSeg ? <Text dimColor>{scopeSeg}</Text> : null}
        {alertSeg ? (
          <Text bold color={critical ? colors.error : colors.accent}>
            {alertSeg}
          </Text>
        ) : null}
        {statusSeg && status ? (
          <Text
            color={STATUS_COLOR[status.tone]}
            dimColor={status.tone === "quiet"}
            bold={status.tone === "news"}
          >
            {statusSeg}
          </Text>
        ) : null}
        <Text color={colors.info} dimColor>
          {"╌".repeat(fill)}
        </Text>
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
}

/** Lines the frame itself spends around the body: two borders, the title row, the blank under it. */
export const PAGE_CHROME = 4
