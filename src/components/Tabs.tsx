import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

export type TabItem<T extends string = string> = {
  value: T
  label: string
  count?: number
  /**
   * A marker drawn immediately before the label, in its own colour.
   *
   * Give every tab one of the SAME WIDTH, or none at all. A marker that appears
   * on one tab alone pushes every tab after it sideways — which is the whole
   * reason this is a field rather than something a caller prepends to `label`:
   * a bar that shifts when news arrives is a bar you have to re-find. A blank of
   * the right width is how you say "not this one".
   *
   * Its own `Text` because the label's colour answers "is this tab active" and a
   * marker usually answers something else; folded together, the marker would
   * have to borrow the answer to the wrong question.
   *
   * Animating one costs nothing: the cell is already reserved, so a caller
   * cycling the glyph or the colour per frame moves no layout at all.
   */
  marker?: string
  markerColor?: string
}

type TabsProps<T extends string> = {
  active: T
  items: TabItem<T>[]
}

// The active tab is marked by an underline (border-bottom) under it, in the
// accent colour; inactive tabs get none. The underline's presence — not its
// hue — is what distinguishes the active tab, so it reads correctly in
// greyscale and for colourblind users. Two rows (labels, then underlines) keep
// the `─` runs aligned under each label since both share the same cell widths
// and gap.
export const Tabs = <T extends string>({ active, items }: TabsProps<T>) => {
  const cells = items.map((item) => ({
    key: item.value,
    marker: item.marker ?? "",
    markerColor: item.markerColor,
    text:
      item.count !== undefined ? `${item.label} (${item.count})` : item.label,
    isActive: item.value === active,
  }))

  // The rule goes under the LABEL, and the marker sits in a gutter outside it.
  //
  // It used to span both, on the reasoning that a short underline reads as a
  // rendering fault. Seen on a real bar that is exactly backwards: the rule
  // reaches two columns past the word on the left and stops flush on the right,
  // which reads as lopsided rather than as generous. And the two answer different
  // questions — the rule says which tab you are ON, the marker says which tab has
  // news — so a rule that swallows the marker is claiming the marker as part of
  // the answer to its own question.
  //
  // The gutter is still measured, and spent as leading blanks on the rule row, so
  // both rows stay the same width and the runs line up under their labels
  // whatever the markers are doing.
  const gutterOf = (cell: (typeof cells)[number]) => [...cell.marker].length
  const labelOf = (cell: (typeof cells)[number]) => [...cell.text].length

  return (
    <Box flexDirection="column">
      <Box gap={2}>
        {cells.map((cell) => (
          <Box key={cell.key}>
            {cell.marker ? (
              <Text color={cell.markerColor}>{cell.marker}</Text>
            ) : null}
            <Text
              bold={cell.isActive}
              color={cell.isActive ? colors.accent : undefined}
              dimColor={!cell.isActive}
            >
              {cell.text}
            </Text>
          </Box>
        ))}
      </Box>
      <Box gap={2}>
        {cells.map((cell) => (
          <Text key={cell.key} color={colors.accent}>
            {" ".repeat(gutterOf(cell)) +
              (cell.isActive ? "─" : " ").repeat(labelOf(cell))}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
