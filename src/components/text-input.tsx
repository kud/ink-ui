// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React, { useState } from "react"
import { Text, useInput } from "ink"
import { useFocusable } from "./focus.js"

type TextInputProps = {
  placeholder?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  /**
   * Called on `esc`. The value is kept — cancelling blurs the field, it does
   * not clear it — so the host can drop focus and let its own back key
   * take over, without a second `useInput` around the box.
   */
  onCancel?: () => void
  isDisabled?: boolean
  /** Id for `useFocusManager().focus(id)` when inside a `FocusScope`. */
  focusId?: string
  /** Take focus first when inside a `FocusScope`. */
  autoFocus?: boolean
}

export const TextInput = ({
  placeholder = "",
  defaultValue = "",
  onChange,
  onSubmit,
  onCancel,
  isDisabled = false,
  focusId,
  autoFocus,
}: TextInputProps) => {
  const { isFocused, inScope } = useFocusable({ id: focusId, disabled: isDisabled, autoFocus })
  // In a scope and not focused, the field draws no caret: the block is how
  // a reader sees which field their typing lands in.
  const caret = !inScope || isFocused

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
      if (key.escape) {
        onCancel?.()
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

  // The character under the cursor is inverted; at the end, a trailing block.
  const before = value.slice(0, cursor)
  const at = value.slice(cursor, cursor + 1) || " "
  const after = value.slice(cursor + 1)
  return (
    <Text>
      {before}
      <Text inverse={caret}>{at}</Text>
      {after}
    </Text>
  )
}
