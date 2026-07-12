// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens and conventions.
import React from "react"
import { Text, useInput } from "ink"

type ConfirmInputProps = {
  // Which choice Enter selects, and which letter is shown capitalised.
  defaultChoice?: "confirm" | "cancel"
  onConfirm?: () => void
  onCancel?: () => void
  isDisabled?: boolean
}

export const ConfirmInput = ({
  defaultChoice = "confirm",
  onConfirm,
  onCancel,
  isDisabled = false,
}: ConfirmInputProps) => {
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
    { isActive: !isDisabled },
  )

  // The default choice is capitalised — a shape/case cue, not a colour one.
  const hint = defaultChoice === "confirm" ? "(Y/n)" : "(y/N)"
  return <Text dimColor>{hint}</Text>
}
