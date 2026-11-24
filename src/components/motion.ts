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

/**
 * Motion for a component that has a theme: a provided theme's policy is the
 * answer (it already folded in the probe, the TTY, `NO_MOTION` and a screen
 * reader); without a provider the stream Ink draws to is still checked, as
 * before themes existed, and the ambient screen-reader switch still stops it.
 */
export const themedMotion = (
  theme: { provided: boolean; policy: { motion: boolean; screenReader: boolean } },
  animate: boolean,
  stdout: unknown,
): boolean =>
  theme.provided
    ? animate && theme.policy.motion
    : !theme.policy.screenReader && motionAllowed(animate, streamIsTTY(stdout))

/** Ink 8 types stdout as a plain stream; only a TTY carries `isTTY`. */
export const streamIsTTY = (stream: unknown): boolean =>
  (stream as { isTTY?: boolean } | undefined)?.isTTY === true
