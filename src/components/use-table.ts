import { useMemo, useRef, useState } from "react"
import { useInput } from "ink"
import type { Hint } from "./footer-hints.js"
import { sortIndices, nextSort, type SortState } from "./table-sort.js"
import { defaultRowKey, type Column, type TableSelection } from "./table.js"

type UseTableOptions<T extends Record<string, unknown>> = {
  data: T[]
  columns: Column<T>[]
  rowKey?: (row: T, index: number) => string
  // Leave unset for a table you move through but never pick from.
  selection?: TableSelection
  // Controlled selection: pass `selected` and update it from
  // `onSelectedChange`. Uncontrolled: pass `defaultSelected`, or nothing.
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (keys: string[]) => void
  // Controlled sort: pass `sort` (null for unsorted) with `onSortChange`.
  sort?: SortState | null
  defaultSort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  // Body rows on screen: the window the table renders and the page that
  // PgUp/PgDn move by.
  height?: number
  // k/j/h/l/g/G as well as the arrows, as `useListCursor` does. Turn off
  // while a filter is typing so the letters reach it.
  vimKeys?: boolean
  isActive?: boolean
}

// Controlled when a value is passed, uncontrolled otherwise — the same shape
// as a React input, so a host can start uncontrolled and lift the state later
// without changing anything else.
const useControllable = <V>(
  value: V | undefined,
  initial: V,
  onChange: ((next: V) => void) | undefined,
) => {
  const [own, setOwn] = useState(initial)
  const controlled = value !== undefined
  const current = controlled ? value : own
  const set = (next: V) => {
    if (!controlled) setOwn(next)
    onChange?.(next)
  }
  return [current, set] as const
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

// The keyboard for `Table`, which itself stays presentational. It owns the
// row cursor, the focused column, the sort and the selection, and hands back
// `tableProps` to spread onto `<Table>`. It never binds `q`, `esc` or
// `backspace`: those are the app's. A host whose peel should drop a
// selection on `esc` calls `clearSelection` from it.
export const useTable = <T extends Record<string, unknown>>({
  data,
  columns,
  rowKey = defaultRowKey,
  selection,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  height,
  vimKeys = true,
  isActive = true,
}: UseTableOptions<T>) => {
  const [sort, setSortState] = useControllable(
    sortProp,
    defaultSort,
    onSortChange,
  )
  const [selected, setSelected] = useControllable(
    selectedProp,
    defaultSelected,
    onSelectedChange,
  )
  const [rawCursor, setCursorState] = useState(0)
  // Mirrors the cursor synchronously: a held arrow key can deliver the next
  // keystroke before React re-renders, and reading the rendered value then
  // would drop moves.
  const cursorRef = useRef(0)
  const setCursor = (position: number) => {
    cursorRef.current = position
    setCursorState(position)
  }
  const [rawColumn, setFocusedColumn] = useState(0)
  // Shift-range state: the row the range grows from, and the selection that
  // existed before it began, so shrinking the range gives rows back.
  const anchor = useRef<{ position: number; base: Set<string> } | null>(null)

  const order = useMemo(
    () => sortIndices(data, columns, sort),
    [data, columns, sort],
  )
  const total = order.length
  const cursor = clamp(rawCursor, 0, Math.max(total - 1, 0))
  const focusedColumn = clamp(rawColumn, 0, Math.max(columns.length - 1, 0))
  const keyAt = (position: number) => {
    const index = order[position]!
    return rowKey(data[index]!, index)
  }
  const page = Math.max((height ?? 10) - 1, 1)

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const live = () => clamp(cursorRef.current, 0, Math.max(total - 1, 0))

  const moveTo = (target: number, extend: boolean) => {
    if (total === 0) return
    const cursor = live()
    const next = clamp(target, 0, total - 1)
    if (extend && selection === "multiple") {
      if (!anchor.current)
        anchor.current = { position: cursor, base: new Set(selectedSet) }
      const { position, base } = anchor.current
      const range = new Set(base)
      const [from, to] = position <= next ? [position, next] : [next, position]
      for (let p = from; p <= to; p += 1) range.add(keyAt(p))
      setSelected([...range])
    } else {
      anchor.current = null
    }
    setCursor(next)
  }

  const setSort = (next: SortState | null) => {
    // The cursor follows its row through a re-sort: losing your place every
    // time you reorder is how a sortable table stops being used.
    const current = total > 0 ? order[live()] : undefined
    setSortState(next)
    anchor.current = null
    if (current === undefined) return
    const reordered = sortIndices(data, columns, next)
    setCursor(Math.max(reordered.indexOf(current), 0))
  }

  const toggleCurrent = () => {
    if (!selection || total === 0) return
    anchor.current = null
    const key = keyAt(live())
    if (selection === "single") {
      setSelected(selectedSet.has(key) ? [] : [key])
      return
    }
    setSelected(
      selectedSet.has(key)
        ? selected.filter((candidate) => candidate !== key)
        : [...selected, key],
    )
  }

  const toggleAll = () => {
    if (selection !== "multiple") return
    anchor.current = null
    const every = order.map((_, position) => keyAt(position))
    const all = every.length > 0 && every.every((key) => selectedSet.has(key))
    setSelected(all ? [] : every)
  }

  useInput(
    (input, key) => {
      const up = key.upArrow || (vimKeys && (input === "k" || input === "K"))
      const down =
        key.downArrow || (vimKeys && (input === "j" || input === "J"))
      const at = live()
      if (up) return moveTo(at - 1, key.shift)
      if (down) return moveTo(at + 1, key.shift)
      if (key.pageUp) return moveTo(at - page, key.shift)
      if (key.pageDown) return moveTo(at + page, key.shift)
      if (key.home || (vimKeys && input === "g")) return moveTo(0, key.shift)
      if (key.end || (vimKeys && input === "G"))
        return moveTo(total - 1, key.shift && input !== "G")
      if (key.leftArrow || (vimKeys && input === "h"))
        return setFocusedColumn(Math.max(focusedColumn - 1, 0))
      if (key.rightArrow || (vimKeys && input === "l"))
        return setFocusedColumn(Math.min(focusedColumn + 1, columns.length - 1))
      if (input === "s") {
        const column = columns[focusedColumn]
        if (column && column.sortable !== false)
          setSort(nextSort(sort, column.key))
        return
      }
      if (input === " ") return toggleCurrent()
      if (input === "a") return toggleAll()
    },
    { isActive },
  )

  const row = total > 0 ? data[order[cursor]!] : undefined
  const selectedRows = useMemo(
    () =>
      selectedSet.size === 0
        ? []
        : data.filter((item, index) => selectedSet.has(rowKey(item, index))),
    [data, selectedSet, rowKey],
  )

  const hints: Hint[] = [
    ["↑↓", "move"],
    ["←→", "column"],
    ["s", "sort"],
    ...(selection ? ([["␣", "select"]] as Hint[]) : []),
    ...(selection === "multiple" ? ([["a", "all"]] as Hint[]) : []),
  ]

  return {
    cursor,
    setCursor: (position: number) => moveTo(position, false),
    row,
    focusedColumn,
    setFocusedColumn,
    sort,
    setSort,
    selected,
    selectedRows,
    setSelected,
    clearSelection: () => {
      anchor.current = null
      setSelected([])
    },
    hints,
    tableProps: {
      data,
      columns,
      rowKey,
      sort,
      cursor,
      focusedColumn,
      selection,
      selected,
      height,
    },
  }
}
