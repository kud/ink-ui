// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { useState } from "react"
import { Text, useInput } from "ink"

type PasswordInputProps = {
  placeholder?: string
  // Single character shown in place of each real one.
  mask?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  isDisabled?: boolean
}

export const PasswordInput = ({
  placeholder = "",
  mask = "*",
  onChange,
  onSubmit,
  isDisabled = false,
}: PasswordInputProps) => {
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

  // Display is masked; onChange/onSubmit still carry the real value.
  const masked = mask.repeat(value.length)
  const before = masked.slice(0, cursor)
  const at = masked.slice(cursor, cursor + 1) || " "
  const after = masked.slice(cursor + 1)
  return (
    <Text>
      {before}
      <Text inverse>{at}</Text>
      {after}
    </Text>
  )
}
