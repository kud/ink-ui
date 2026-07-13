// Demo registry — one entry per public component, used by the gallery.
// Interactive components render live but inert until focused (isActive/isDisabled
// gated on `focused`); parent-controlled ones (Tabs/Switch/Toggle) wire their
// own input in focus mode.
import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import {
  Alert,
  Badge,
  Banner,
  ConfirmInput,
  EmailInput,
  FooterHints,
  Header,
  KeyValue,
  LoadingScreen,
  MultiSelect,
  OrderedList,
  PasswordInput,
  ProgressBar,
  ScrollView,
  Select,
  SelectableRow,
  Spinner,
  StatusMessage,
  Switch,
  Table,
  Tabs,
  TextInput,
  Toast,
  Toggle,
  UnorderedList,
  type SwitchValue,
} from "../index.js"

export type DemoEntry = {
  name: string
  category: string
  interactive: boolean
  render: (focused: boolean) => React.ReactNode
}

const colourOptions = [
  { label: "Red", value: "red" },
  { label: "Green", value: "green" },
  { label: "Blue", value: "blue" },
  { label: "Amber", value: "amber" },
]

// ── interactive wrappers ──────────────────────────────────────────────

const TextInputDemo = ({ focused }: { focused: boolean }) => {
  const [value, setValue] = useState("")
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{"› "}</Text>
        <TextInput
          placeholder="Type here…"
          onChange={setValue}
          isDisabled={!focused}
        />
      </Box>
      <Text dimColor>value: {JSON.stringify(value)}</Text>
    </Box>
  )
}

const EmailInputDemo = ({ focused }: { focused: boolean }) => {
  const [value, setValue] = useState("")
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{"› "}</Text>
        <EmailInput
          placeholder="you@example.com"
          onChange={setValue}
          isDisabled={!focused}
        />
      </Box>
      <Text dimColor>value: {JSON.stringify(value)} · Tab completes</Text>
    </Box>
  )
}

const PasswordInputDemo = ({ focused }: { focused: boolean }) => {
  const [value, setValue] = useState("")
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{"› "}</Text>
        <PasswordInput
          placeholder="Password"
          onChange={setValue}
          isDisabled={!focused}
        />
      </Box>
      <Text dimColor>length: {value.length}</Text>
    </Box>
  )
}

const ConfirmInputDemo = ({ focused }: { focused: boolean }) => {
  const [result, setResult] = useState("—")
  return (
    <Box flexDirection="column">
      <Box>
        <Text>Proceed? </Text>
        <ConfirmInput
          isDisabled={!focused}
          onConfirm={() => setResult("confirmed")}
          onCancel={() => setResult("cancelled")}
        />
      </Box>
      <Text dimColor>result: {result}</Text>
    </Box>
  )
}

const SelectDemo = ({ focused }: { focused: boolean }) => {
  const [value, setValue] = useState("red")
  return (
    <Box flexDirection="column">
      <Select
        options={colourOptions}
        defaultValue="red"
        onChange={setValue}
        isDisabled={!focused}
      />
      <Text dimColor>selected: {value}</Text>
    </Box>
  )
}

const MultiSelectDemo = ({ focused }: { focused: boolean }) => {
  const [values, setValues] = useState<string[]>(["red"])
  return (
    <Box flexDirection="column">
      <MultiSelect
        options={colourOptions}
        onChange={setValues}
        isDisabled={!focused}
      />
      <Text dimColor>selected: {values.join(", ") || "—"}</Text>
    </Box>
  )
}

const ScrollViewDemo = ({ focused }: { focused: boolean }) => {
  const lines = Array.from({ length: 40 }, (_, i) => ({
    text: `line ${i + 1} — scrollable content`,
  }))
  return (
    <Box flexDirection="column">
      <Box height={8} flexDirection="column">
        <ScrollView lines={lines} isActive={focused} />
      </Box>
      <Text dimColor>↑↓ / j k / space to scroll when focused</Text>
    </Box>
  )
}

const TabsDemo = ({ focused }: { focused: boolean }) => {
  const items = [
    { label: "Files", value: "files" },
    { label: "Search", value: "search" },
    { label: "Settings", value: "settings" },
  ]
  const [active, setActive] = useState("files")
  useInput(
    (_input, key) => {
      const i = items.findIndex((x) => x.value === active)
      if (key.leftArrow) setActive(items[Math.max(0, i - 1)]!.value)
      if (key.rightArrow)
        setActive(items[Math.min(items.length - 1, i + 1)]!.value)
    },
    { isActive: focused },
  )
  return (
    <Box flexDirection="column">
      <Tabs active={active} items={items} />
      <Text dimColor>← → to switch tab</Text>
    </Box>
  )
}

const SwitchDemo = ({ focused }: { focused: boolean }) => {
  const [value, setValue] = useState<SwitchValue>("left")
  useInput(
    (input, key) => {
      if (key.leftArrow) setValue("left")
      if (key.rightArrow) setValue("right")
      if (input === " ") setValue((v) => (v === "left" ? "right" : "left"))
    },
    { isActive: focused },
  )
  return (
    <Box flexDirection="column">
      <Switch left="Off" right="On" value={value} />
      <Text dimColor>← → / space</Text>
    </Box>
  )
}

const ToggleDemo = ({ focused }: { focused: boolean }) => {
  const [on, setOn] = useState(false)
  useInput(
    (input) => {
      if (input === " ") setOn((o) => !o)
    },
    { isActive: focused },
  )
  return (
    <Box flexDirection="column">
      <Toggle label="Dark mode" on={on} />
      <Text dimColor>space to toggle</Text>
    </Box>
  )
}

// ── registry ──────────────────────────────────────────────────────────

export const entries: DemoEntry[] = [
  // Inputs
  {
    name: "TextInput",
    category: "Inputs",
    interactive: true,
    render: (f) => <TextInputDemo focused={f} />,
  },
  {
    name: "EmailInput",
    category: "Inputs",
    interactive: true,
    render: (f) => <EmailInputDemo focused={f} />,
  },
  {
    name: "PasswordInput",
    category: "Inputs",
    interactive: true,
    render: (f) => <PasswordInputDemo focused={f} />,
  },
  {
    name: "ConfirmInput",
    category: "Inputs",
    interactive: true,
    render: (f) => <ConfirmInputDemo focused={f} />,
  },
  // Lists
  {
    name: "UnorderedList",
    category: "Lists",
    interactive: false,
    render: () => (
      <UnorderedList>
        <UnorderedList.Item>
          <Text>Fruit</Text>
          <UnorderedList>
            <UnorderedList.Item>
              <Text>Apple</Text>
            </UnorderedList.Item>
            <UnorderedList.Item>
              <Text>Pear</Text>
            </UnorderedList.Item>
          </UnorderedList>
        </UnorderedList.Item>
        <UnorderedList.Item>
          <Text>Bread</Text>
        </UnorderedList.Item>
      </UnorderedList>
    ),
  },
  {
    name: "OrderedList",
    category: "Lists",
    interactive: false,
    render: () => (
      <OrderedList>
        <OrderedList.Item>
          <Text>Clone the repo</Text>
        </OrderedList.Item>
        <OrderedList.Item>
          <Text>Install deps</Text>
        </OrderedList.Item>
        <OrderedList.Item>
          <Text>Run the demo</Text>
        </OrderedList.Item>
      </OrderedList>
    ),
  },
  {
    name: "Table",
    category: "Lists",
    interactive: false,
    render: () => (
      <Table
        data={[
          { name: "TextInput", tests: "4", status: "green" },
          { name: "MultiSelect", tests: "3", status: "green" },
          { name: "ScrollView", tests: "2", status: "green" },
        ]}
        columns={[
          { key: "name", header: "Component", width: 14 },
          { key: "tests", header: "Tests", width: 6 },
          { key: "status", header: "Status" },
        ]}
      />
    ),
  },
  // Selection & navigation
  {
    name: "Select",
    category: "Selection",
    interactive: true,
    render: (f) => <SelectDemo focused={f} />,
  },
  {
    name: "MultiSelect",
    category: "Selection",
    interactive: true,
    render: (f) => <MultiSelectDemo focused={f} />,
  },
  {
    name: "Tabs",
    category: "Selection",
    interactive: true,
    render: (f) => <TabsDemo focused={f} />,
  },
  {
    name: "Switch",
    category: "Selection",
    interactive: true,
    render: (f) => <SwitchDemo focused={f} />,
  },
  {
    name: "Toggle",
    category: "Selection",
    interactive: true,
    render: (f) => <ToggleDemo focused={f} />,
  },
  {
    name: "SelectableRow",
    category: "Selection",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <SelectableRow active>
          <Text>Selected row</Text>
        </SelectableRow>
        <SelectableRow>
          <Text>Unselected row</Text>
        </SelectableRow>
      </Box>
    ),
  },
  // Status & feedback
  {
    name: "Spinner",
    category: "Status",
    interactive: false,
    render: () => <Spinner label="Working…" />,
  },
  {
    name: "ProgressBar",
    category: "Status",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <ProgressBar value={38} />
        <ProgressBar value={72} />
        <ProgressBar value={100} />
      </Box>
    ),
  },
  {
    name: "StatusMessage",
    category: "Status",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <StatusMessage variant="success">Build passed.</StatusMessage>
        <StatusMessage variant="warning">Cache is stale.</StatusMessage>
        <StatusMessage variant="error">2 tests failed.</StatusMessage>
      </Box>
    ),
  },
  {
    name: "Alert",
    category: "Status",
    interactive: false,
    render: () => (
      <Alert variant="warning" title="Heads up">
        Disk is almost full.
      </Alert>
    ),
  },
  {
    name: "Badge",
    category: "Status",
    interactive: false,
    render: () => (
      <Box gap={1}>
        <Badge variant="success">passing</Badge>
        <Badge variant="warning">flaky</Badge>
        <Badge variant="error">failing</Badge>
        <Badge variant="info">draft</Badge>
      </Box>
    ),
  },
  {
    name: "Toast",
    category: "Status",
    interactive: false,
    render: () => (
      <Toast message="Saved to disk" variant="success" duration={999999} />
    ),
  },
  // Layout & chrome
  {
    name: "Banner",
    category: "Layout",
    interactive: false,
    render: () => <Banner title="my-tool" subtitle="v1.0.0" icon="⚡" />,
  },
  {
    name: "Header",
    category: "Layout",
    interactive: false,
    render: () => <Header subtitle="3 files changed">Status</Header>,
  },
  {
    name: "FooterHints",
    category: "Layout",
    interactive: false,
    render: () => (
      <FooterHints
        hints={[
          ["↑↓", "navigate"],
          ["⏎", "select"],
          ["q", "quit"],
        ]}
      />
    ),
  },
  {
    name: "KeyValue",
    category: "Layout",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <KeyValue label="Branch" value="main" />
        <KeyValue label="Commit" value="4eb77fd" />
        <KeyValue label="Author" value="Erwann Mest" />
      </Box>
    ),
  },
  {
    name: "LoadingScreen",
    category: "Layout",
    interactive: false,
    render: () => <LoadingScreen label="Loading components…" />,
  },
  {
    name: "ScrollView",
    category: "Layout",
    interactive: true,
    render: (f) => <ScrollViewDemo focused={f} />,
  },
]
