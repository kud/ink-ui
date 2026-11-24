import { spawnSync } from "node:child_process"

// The stdin a secure read needs: a real terminal, reachable by descriptor so
// `stty` can change the same line discipline Ink reads from.
export type SecureStdin = NodeJS.ReadStream & { fd?: number }

const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const

const stty = (fd: number, args: string[], capture = false) => {
  const result = spawnSync("stty", args, {
    stdio: [fd, capture ? "pipe" : "ignore", "ignore"],
    encoding: "utf8",
  })
  if (result.error || result.status !== 0) return undefined
  return capture ? String(result.stdout).trim() : ""
}

/**
 * Whether a secure read can start now. It cannot without a terminal, and it
 * cannot while another `useInput` holds raw mode: the terminal would stay
 * non-canonical and Ink would read the keystrokes first.
 */
export const canReadSecurely = (stdin: SecureStdin) =>
  Boolean(stdin.isTTY) && typeof stdin.fd === "number" && !stdin.isRaw

/**
 * Reads lines from the terminal with echo off and canonical mode on, the
 * state `read -s` and `sudo` leave it in, which is what a terminal's secure
 * input detection looks for. Each line is passed to `onLine` without its line
 * ending. Returns the release function, or `undefined` when the terminal
 * could not be switched, in which case nothing was changed.
 *
 * The release restores the exact settings `stty -g` saved (plain `stty echo`
 * if that snapshot failed), and runs on its own on SIGINT, SIGTERM, SIGHUP and
 * process exit, so a dying process never leaves the shell without echo.
 */
export const readSecureLines = (
  stdin: SecureStdin,
  onLine: (line: string) => void,
): (() => void) | undefined => {
  if (!canReadSecurely(stdin)) return undefined
  const fd = stdin.fd as number

  const saved = stty(fd, ["-g"], true)
  if (stty(fd, ["-echo"]) === undefined) return undefined

  const decoder = new TextDecoder()
  let buffer = ""
  let released = false

  const onData = (chunk: Buffer | string) => {
    buffer +=
      typeof chunk === "string"
        ? chunk
        : decoder.decode(chunk, { stream: true })
    let end = buffer.indexOf("\n")
    while (end !== -1) {
      const line = buffer.slice(0, end).replace(/\r$/, "")
      buffer = buffer.slice(end + 1)
      onLine(line)
      if (released) return
      end = buffer.indexOf("\n")
    }
  }

  const release = () => {
    if (released) return
    released = true
    buffer = ""
    stdin.removeListener("data", onData)
    for (const signal of SIGNALS) process.removeListener(signal, onSignal)
    process.removeListener("exit", release)
    // Ink's own reader listens on `readable`; leave the stream flowing for it.
    if (
      stdin.listenerCount("data") === 0 &&
      stdin.listenerCount("readable") === 0
    )
      stdin.pause()
    if (!(saved && stty(fd, [saved]) !== undefined)) stty(fd, ["echo"])
  }

  // Restore, then hand the signal back as if no handler had been here, so
  // Ink's own exit hook unmounts and the process ends the way it would have.
  function onSignal(signal: NodeJS.Signals) {
    release()
    process.kill(process.pid, signal)
  }

  for (const signal of SIGNALS) process.once(signal, onSignal)
  process.once("exit", release)

  stdin.ref?.()
  stdin.on("data", onData)
  stdin.resume()

  return release
}
