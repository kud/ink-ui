// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { useState } from "react"
import { Text, useInput } from "ink"

const defaultDomains = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
]

type EmailInputProps = {
  placeholder?: string
  defaultValue?: string
  domains?: string[]
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  isDisabled?: boolean
}

export const EmailInput = ({
  placeholder = "",
  defaultValue = "",
  domains = defaultDomains,
  onChange,
  onSubmit,
  isDisabled = false,
}: EmailInputProps) => {
  const [value, setValue] = useState(defaultValue)
  const [cursor, setCursor] = useState(defaultValue.length)

  // The domain fragment after "@", and the completion the best match implies.
  const at = value.indexOf("@")
  const domainFragment = at === -1 ? "" : value.slice(at + 1)
  const match =
    at !== -1 && domainFragment.length > 0
      ? domains.find(
          (d) => d.startsWith(domainFragment) && d !== domainFragment,
        )
      : undefined
  const suggestion = match ? match.slice(domainFragment.length) : ""
  // Only offer the completion when appending is unambiguous — cursor at the end.
  const showSuggestion = suggestion.length > 0 && cursor === value.length

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
      // Tab accepts the domain completion, if one is showing.
      if (key.tab && showSuggestion) {
        update(value + suggestion, value.length + suggestion.length)
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
    { isActive: !isDisabled },
  )

  // Empty: a cursor block followed by the dim placeholder.
  if (value.length === 0) {
    return (
      <Text>
        <Text inverse> </Text>
        {placeholder ? <Text dimColor>{placeholder}</Text> : null}
      </Text>
    )
  }

  // When a completion is showing, the cursor lands on its first character so
  // the address reads as one continuous string; otherwise it inverts the
  // character it sits on.
  if (showSuggestion) {
    return (
      <Text>
        {value}
        <Text inverse>{suggestion.slice(0, 1)}</Text>
        <Text dimColor>{suggestion.slice(1)}</Text>
      </Text>
    )
  }

  const before = value.slice(0, cursor)
  const atChar = value.slice(cursor, cursor + 1) || " "
  const after = value.slice(cursor + 1)
  return (
    <Text>
      {before}
      <Text inverse>{atChar}</Text>
      {after}
    </Text>
  )
}
