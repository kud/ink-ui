// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { useState } from "react"
import { Text, useInput } from "ink"

type TextInputProps = {
  placeholder?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  isDisabled?: boolean
}

export const TextInput = ({
  placeholder = "",
  defaultValue = "",
  onChange,
  onSubmit,
  isDisabled = false,
}: TextInputProps) => {
  const [value, setValue] = useState(defaultValue)
  const [cursor, setCursor] = useState(defaultValue.length)

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
      // Both backspace and delete remove the character before the cursor —
      // forward-delete isn't worth the ambiguity of which flag the terminal
      // sets for a single-line field.
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

  // The character under the cursor is inverted; at the end, a trailing block.
  const before = value.slice(0, cursor)
  const at = value.slice(cursor, cursor + 1) || " "
  const after = value.slice(cursor + 1)
  return (
    <Text>
      {before}
      <Text inverse>{at}</Text>
      {after}
    </Text>
  )
}
