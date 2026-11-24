// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { useEffect, useRef, useState } from "react"
import { Text, useInput, useStdin } from "ink"
import { useFocusable } from "./focus.js"
import { canReadSecurely, readSecureLines, type SecureStdin } from "./secure-line.js"

type PasswordInputProps = {
  placeholder?: string
  /**
   * Read the line the way `sudo` does: echo off, canonical mode on, nothing
   * drawn as you type. That is the state a terminal's secure input detection
   * looks for (iTerm2's "engage at password prompts" lock). Defaults to
   * `true`. Needs a terminal on stdin and no other active `useInput` while
   * focused; without them it falls back to the masked field. `false` always
   * draws the masked field.
   */
  secure?: boolean
  // Single character shown in place of each real one (masked field only).
  mask?: string
  /** Every keystroke in the masked field; once, with the whole line, in secure mode. */
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  isDisabled?: boolean
  /** Id for `useFocusManager().focus(id)` when inside a `FocusScope`. */
  focusId?: string
  /** Take focus first when inside a `FocusScope`. */
  autoFocus?: boolean
}

type FieldProps = Omit<PasswordInputProps, "secure" | "isDisabled" | "focusId" | "autoFocus"> & {
  isFocused: boolean
  // In a scope and not focused, the field draws no caret: the block is how
  // a reader sees which field their typing lands in.
  caret: boolean
}

// A sibling releasing raw mode in the same update lets go on a microtask, so
// a secure read gives it a few frames before settling for the masked field.
const ENGAGE_ATTEMPTS = 3
const ENGAGE_RETRY_MS = 16

export const PasswordInput = ({
  secure = true,
  isDisabled = false,
  focusId,
  autoFocus,
  ...props
}: PasswordInputProps) => {
  // One focus stop whichever field is drawn, so falling back never adds a second.
  const { isFocused, inScope } = useFocusable({ id: focusId, disabled: isDisabled, autoFocus })
  const [unavailable, setUnavailable] = useState(false)
  const field = { ...props, isFocused, caret: !inScope || isFocused }
  return secure && !unavailable ? (
    <SecureField {...field} onUnavailable={() => setUnavailable(true)} />
  ) : (
    <MaskedField {...field} />
  )
}

const SecureField = ({
  placeholder = "",
  onChange,
  onSubmit,
  isFocused,
  caret,
  onUnavailable,
}: FieldProps & { onUnavailable: () => void }) => {
  // Ink types stdin as any readable; a secure read needs the terminal behind it.
  const stdin = useStdin().stdin as SecureStdin
  const handlers = useRef({ onChange, onSubmit, onUnavailable })
  handlers.current = { onChange, onSubmit, onUnavailable }

  useEffect(() => {
    if (!isFocused) return
    let release: (() => void) | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const isTerminal = Boolean(stdin.isTTY) && typeof stdin.fd === "number"

    const engage = () => {
      attempts++
      if (canReadSecurely(stdin)) {
        release = readSecureLines(stdin, (line) => {
          handlers.current.onChange?.(line)
          handlers.current.onSubmit?.(line)
        })
        if (!release) handlers.current.onUnavailable()
        return
      }
      if (isTerminal && attempts < ENGAGE_ATTEMPTS) {
        timer = setTimeout(engage, ENGAGE_RETRY_MS)
        return
      }
      handlers.current.onUnavailable()
    }

    const first = setImmediate(engage)
    return () => {
      clearImmediate(first)
      if (timer) clearTimeout(timer)
      release?.()
    }
  }, [isFocused, stdin])

  // Nothing typed is drawn, not even a count: the dim note says why the
  // field stays still.
  return (
    <Text>
      <Text inverse={caret}> </Text>
      {placeholder ? <Text dimColor>{placeholder}</Text> : null}
      <Text dimColor>{placeholder ? "  · input hidden" : "input hidden"}</Text>
    </Text>
  )
}

const MaskedField = ({
  placeholder = "",
  mask = "*",
  onChange,
  onSubmit,
  isFocused,
  caret,
}: FieldProps) => {
  const [value, setValue] = useState("")
  const [cursor, setCursor] = useState(0)

  const update = (nextValue: string, nextCursor: number) => {
    setValue(nextValue)
    setCursor(nextCursor)
    onChange?.(nextValue)
  }

  useInput(
    (input, key) => {
      if (key.return) {
        onSubmit?.(value)
        return
      }
      if (key.leftArrow) {
        setCursor((c) => Math.max(0, c - 1))
        return
      }
      if (key.rightArrow) {
        setCursor((c) => Math.min(value.length, c + 1))
        return
      }
      if (key.backspace || key.delete) {
        if (cursor === 0) return
        update(value.slice(0, cursor - 1) + value.slice(cursor), cursor - 1)
        return
      }
      if (input && !key.ctrl && !key.meta && !key.tab) {
        update(
          value.slice(0, cursor) + input + value.slice(cursor),
          cursor + input.length,
        )
      }
    },
    { isActive: isFocused },
  )

  // Empty: a cursor block followed by the dim placeholder.
  if (value.length === 0) {
    return (
      <Text>
        <Text inverse={caret}> </Text>
        {placeholder ? <Text dimColor>{placeholder}</Text> : null}
      </Text>
    )
  }

  // Display is masked; onChange/onSubmit still carry the real value.
  const masked = mask.repeat(value.length)
  const before = masked.slice(0, cursor)
  const at = masked.slice(cursor, cursor + 1) || " "
  const after = masked.slice(cursor + 1)
  return (
    <Text>
      {before}
      <Text inverse={caret}>{at}</Text>
      {after}
    </Text>
  )
}
