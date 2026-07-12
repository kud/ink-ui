import { spawn } from "child_process"

export type NotifyOptions = {
  title?: string
  subtitle?: string
  // `true` uses the default sound; a string names a specific system sound.
  sound?: boolean | string
}

const escape = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

// Builds the AppleScript for `osascript -e`. Exported for testing; not part of
// the public surface.
export const buildAppleScript = (
  message: string,
  options: NotifyOptions = {},
): string => {
  const clauses = [
    options.title && `title "${escape(options.title)}"`,
    options.subtitle && `subtitle "${escape(options.subtitle)}"`,
    options.sound &&
      `sound name "${escape(typeof options.sound === "string" ? options.sound : "default")}"`,
  ].filter(Boolean)
  const suffix = clauses.length > 0 ? ` with ${clauses.join(" ")}` : ""
  return `display notification "${escape(message)}"${suffix}`
}

// Posts a macOS Notification Center notification. Send-only and fire-and-forget;
// a no-op on non-macOS platforms. Click-actions/replies would need
// terminal-notifier — a deliberate future extension point.
export const notify = (message: string, options: NotifyOptions = {}): void => {
  if (process.platform !== "darwin") return
  const child = spawn("osascript", ["-e", buildAppleScript(message, options)], {
    stdio: "ignore",
  })
  child.on("error", () => {})
  child.unref()
}
