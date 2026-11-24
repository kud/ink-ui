// Ported from @inkjs/ui (MIT, Vadim Demedes — https://github.com/vadimdemedes/ink-ui)
// and adapted to @kud/ink-ui tokens, glyph vocabulary, and conventions.
import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import { SelectableRow } from "./selectable-row.js"
import { useTheme } from "../theme/theme-provider.js"
import { useFocusable } from "./focus.js"
import type { SelectOption } from "./select.js"

type MultiSelectProps<T extends string> = {
  options: SelectOption<T>[]
  // Fires whenever the selected set changes (toggle).
  onChange?: (values: T[]) => void
  // Fires when the user confirms the current selection with Enter.
  onSubmit?: (values: T[]) => void
  defaultValue?: T[]
  isDisabled?: boolean
  visibleOptionCount?: number
  /** Id for `useFocusManager().focus(id)` when inside a `FocusScope`. */
  focusId?: string
  /** Take focus first when inside a `FocusScope`. */
  autoFocus?: boolean
}

const windowStart = (cursor: number, total: number, count: number): number => {
  if (total <= count) return 0
  return Math.max(0, Math.min(cursor - Math.floor(count / 2), total - count))
}

// Selection is shown by a trailing ✓ (a shape cue, not colour alone) so it reads
// for colourblind users and in greyscale; the cursor is the ❯ marker from
// SelectableRow.
export const MultiSelect = <T extends string>({
  options,
  onChange,
  onSubmit,
  defaultValue = [],
  isDisabled = false,
  visibleOptionCount,
  focusId,
  autoFocus,
}: MultiSelectProps<T>) => {
  const { isFocused } = useFocusable({ id: focusId, disabled: isDisabled, autoFocus })
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Set<T>>(new Set(defaultValue))

  useInput(
    (input, key) => {
      if (key.upArrow)
        setCursor((i) => (i - 1 + options.length) % options.length)
      if (key.downArrow) setCursor((i) => (i + 1) % options.length)
      if (input === " ") {
        const value = options[cursor]!.value
        const next = new Set(selected)
        if (next.has(value)) next.delete(value)
        else next.add(value)
        setSelected(next)
        onChange?.([...next])
      }
      if (key.return) onSubmit?.([...selected])
    },
    { isActive: isFocused && options.length > 0 },
  )

  const theme = useTheme()
  const colors = theme.colors
  const count = visibleOptionCount ?? options.length
  const start = windowStart(cursor, options.length, count)
  const visible = options.slice(start, start + count)

  return (
    <Box flexDirection="column">
      {visible.map((option, i) => {
        const active = start + i === cursor
        const on = selected.has(option.value)
        return (
          <SelectableRow key={option.value} active={active}>
            <Text bold={active} color={active ? colors.info : undefined}>
              {option.label}
            </Text>
            {on ? <Text color={colors.success}>{` ${theme.glyphs.success}`}</Text> : null}
          </SelectableRow>
        )
      })}
      {options.length > count && (
        <Text dimColor>{`  ${theme.glyphs.ellipsis} ${options.length} total`}</Text>
      )}
    </Box>
  )
}
