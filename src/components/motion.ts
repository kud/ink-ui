// Internal: the one motion check shared by every component that animates on
// Ink's clock. Not re-exported from `src/index.ts`.

type Env = Record<string, string | undefined>

/**
 * Whether something may move: the caller asked for it, the output is a
 * terminal that can show it, and the user has not opted out of motion with
 * `NO_MOTION` / `REDUCE_MOTION` — read the way `SkeletonBar` reads them.
 */
export const motionAllowed = (
  animate: boolean,
  isTTY: boolean,
  env: Env = process.env,
): boolean => {
  if (!animate) return false
  if (env["NO_MOTION"] || env["REDUCE_MOTION"]) return false
  return isTTY
}

/** Ink 8 types stdout as a plain stream; only a TTY carries `isTTY`. */
export const streamIsTTY = (stream: unknown): boolean =>
  (stream as { isTTY?: boolean } | undefined)?.isTTY === true
