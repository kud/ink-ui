// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Text, useInput } from "ink"
import { useFocusable } from "./focus.js"

type ConfirmInputProps = {
  // Which choice Enter selects, and which letter is shown capitalised.
  defaultChoice?: "confirm" | "cancel"
  onConfirm?: () => void
  onCancel?: () => void
  isDisabled?: boolean
  /** Id for `useFocusManager().focus(id)` when inside a `FocusScope`. */
  focusId?: string
  /** Take focus first when inside a `FocusScope`. */
  autoFocus?: boolean
}

export const ConfirmInput = ({
  defaultChoice = "confirm",
  onConfirm,
  onCancel,
  isDisabled = false,
  focusId,
  autoFocus,
}: ConfirmInputProps) => {
  const { isFocused } = useFocusable({ id: focusId, disabled: isDisabled, autoFocus })
  useInput(
    (input, key) => {
      if (input.toLowerCase() === "y") {
        onConfirm?.()
        return
      }
      if (input.toLowerCase() === "n") {
        onCancel?.()
        return
      }
      if (key.return) {
        if (defaultChoice === "confirm") onConfirm?.()
        else onCancel?.()
      }
    },
    { isActive: isFocused },
  )

  // The default choice is capitalised — a shape/case cue, not a colour one.
  const hint = defaultChoice === "confirm" ? "(Y/n)" : "(y/N)"
  return <Text dimColor>{hint}</Text>
}
