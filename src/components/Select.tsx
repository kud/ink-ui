// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens, glyph vocabulary, and conventions.
import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import { SelectableRow } from "./SelectableRow.js"
import { colors } from "../tokens.js"

export type SelectOption<T extends string = string> = {
  label: string
  value: T
}

type SelectProps<T extends string> = {
  options: SelectOption<T>[]
  // Fires as the highlighted option changes (live).
  onChange?: (value: T) => void
  // Fires when the user confirms the highlighted option with Enter.
  onSubmit?: (value: T) => void
  defaultValue?: T
  isDisabled?: boolean
  visibleOptionCount?: number
}

// A window of `count` options centred on the cursor, clamped to the ends — the
// same scrolling shape the inbox's RepoPicker uses.
const windowStart = (cursor: number, total: number, count: number): number => {
  if (total <= count) return 0
  return Math.max(0, Math.min(cursor - Math.floor(count / 2), total - count))
}

export const Select = <T extends string>({
  options,
  onChange,
  onSubmit,
  defaultValue,
  isDisabled = false,
  visibleOptionCount,
}: SelectProps<T>) => {
  const initial = options.findIndex((o) => o.value === defaultValue)
  const [cursor, setCursor] = useState(initial === -1 ? 0 : initial)

  const move = (delta: 1 | -1) => {
    const next = (cursor + delta + options.length) % options.length
    setCursor(next)
    onChange?.(options[next]!.value)
  }

  useInput(
    (_input, key) => {
      if (key.upArrow) move(-1)
      if (key.downArrow) move(1)
      if (key.return) onSubmit?.(options[cursor]!.value)
    },
    { isActive: !isDisabled && options.length > 0 },
  )

  const count = visibleOptionCount ?? options.length
  const start = windowStart(cursor, options.length, count)
  const visible = options.slice(start, start + count)

  return (
    <Box flexDirection="column">
      {visible.map((option, i) => {
        const active = start + i === cursor
        return (
          <SelectableRow key={option.value} active={active}>
            <Text bold={active} color={active ? colors.info : undefined}>
              {option.label}
            </Text>
            {active ? <Text color={colors.success}>{" ✓"}</Text> : null}
          </SelectableRow>
        )
      })}
      {options.length > count && (
        <Text dimColor>{`  … ${options.length} total`}</Text>
      )}
    </Box>
  )
}
