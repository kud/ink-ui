// The gallery's Layers page: a small app inside its own LayerHost. The list
// registers its keys for KeyHelp; `d` asks in a modal, `a` opens an actions
// popover, `⏎` an overlay with the detail, and `?` the legend over whatever is
// on top. `esc` / `⌫` peel one layer at a time.
import React, { createContext, useContext, useEffect, useState } from "react"
import { Box, Text, useInput } from "ink"
import {
  ConfirmInput,
  KeyHelp,
  KeyValue,
  Layer,
  LayerHost,
  Select,
  SelectableRow,
  useKeyBindings,
  useLayer,
  useListCursor,
} from "../index.js"

/** Lets an entry tell the gallery that `esc` is its own while a layer is up. */
export const EscClaim = createContext<(claimed: boolean) => void>(() => {})

const ISSUES = [
  { key: "SHOP-312", title: "Retry a declined card", type: "bug" },
  { key: "SHOP-318", title: "Address form loses its state", type: "task" },
  { key: "SHOP-412", title: "Typo in the empty state", type: "task" },
  { key: "SHOP-420", title: "Search ignores accents", type: "bug" },
]

const ConfirmBody = ({ onDone }: { onDone: (answer: string) => void }) => {
  useKeyBindings(
    [
      { key: "y", label: "delete" },
      { key: "n", label: "keep" },
    ],
    { group: "Confirm" },
  )
  return (
    <Box flexDirection="column">
      <Text>This cannot be undone.</Text>
      <ConfirmInput
        defaultChoice="cancel"
        onConfirm={() => onDone("deleted")}
        onCancel={() => onDone("kept")}
      />
    </Box>
  )
}

const ActionsBody = ({ onDone }: { onDone: (answer: string) => void }) => {
  useKeyBindings([{ key: "⏎", label: "run" }], { group: "Actions" })
  return (
    <Select
      options={[
        { label: "Assign to me", value: "assigned" },
        { label: "Move to Done", value: "moved" },
        { label: "Copy key", value: "copied" },
      ]}
      onChange={(value) => onDone(value)}
    />
  )
}

const DetailBody = ({ issue }: { issue: (typeof ISSUES)[number] }) => {
  useKeyBindings([{ key: "o", label: "browser" }], { group: "Detail" })
  return (
    <Box flexDirection="column">
      <KeyValue label="Type" value={issue.type} labelWidth={10} />
      <KeyValue label="Status" value="In progress" labelWidth={10} />
      <KeyValue label="Assignee" value="@you" labelWidth={10} />
    </Box>
  )
}

const App = ({ active }: { active: boolean }) => {
  const [layer, setLayer] = useState<"confirm" | "actions" | "detail" | null>(null)
  const [last, setLast] = useState<string | undefined>(undefined)
  const { isTop, depth } = useLayer()
  const claim = useContext(EscClaim)
  useEffect(() => claim(depth > 0), [claim, depth])

  const { cursor } = useListCursor(ISSUES.length, { isActive: active && isTop })
  const issue = ISSUES[cursor]!
  useKeyBindings(
    [
      { key: "↑↓", label: "move" },
      { key: "⏎", label: "open" },
      { key: "d", label: "delete" },
      { key: "a", label: "actions" },
      { key: "j k", label: "move", group: "Vim", footer: false },
    ],
    { group: "List" },
  )
  useInput(
    (input, key) => {
      if (key.return) setLayer("detail")
      if (input === "d") setLayer("confirm")
      if (input === "a") setLayer("actions")
    },
    { isActive: active && isTop },
  )
  const done = (answer: string) => {
    setLast(`${issue.key} ${answer}`)
    setLayer(null)
  }

  return (
    <Box flexDirection="column" height={17}>
      <Text bold>{"◆ Jira  "}<Text dimColor>{`${ISSUES.length} items`}</Text></Text>
      <Box flexDirection="column" marginTop={1}>
        {ISSUES.map((row, index) => (
          <SelectableRow key={row.key} active={index === cursor}>
            <Text>
              <Text bold={index === cursor}>{row.key}</Text>
              {`  ${row.title}`}
            </Text>
          </SelectableRow>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{last ? `last: ${last}` : " "}</Text>
      </Box>
      <Box flexGrow={1} />
      <KeyHelp isActive={active} />
      {layer === "confirm" ? (
        <Layer title={`Delete ${issue.key}?`} width={40} onClose={() => setLayer(null)}>
          <ConfirmBody onDone={done} />
        </Layer>
      ) : null}
      {layer === "actions" ? (
        <Layer kind="popover" top={3 + cursor} left={36} onClose={() => setLayer(null)}>
          <ActionsBody onDone={done} />
        </Layer>
      ) : null}
      {layer === "detail" ? (
        <Layer kind="overlay" title={`${issue.key}  ${issue.title}`} onClose={() => setLayer(null)}>
          <DetailBody issue={issue} />
        </Layer>
      ) : null}
    </Box>
  )
}

export const LayersDemo = ({ focused }: { focused: boolean }) => (
  <LayerHost width={62} isActive={focused}>
    <App active={focused} />
  </LayerHost>
)
