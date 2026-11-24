// Demo registry — one entry per public component, used by the gallery.
// Interactive components render live but inert until focused (isActive/isDisabled
// gated on `focused`); parent-controlled ones (Tabs/Switch/Toggle) wire their
// own input in focus mode.
import React, { useEffect, useState } from "react"
import { Box, Text, useInput } from "ink"
import {
  Alert,
  Badge,
  Pill,
  Banner,
  Columns,
  ConfirmInput,
  Divider,
  EmailInput,
  FooterHints,
  Header,
  KeyValue,
  Link,
  LoadingScreen,
  Meter,
  MultiSelect,
  OrderedList,
  Panel,
  PasswordInput,
  ProgressBar,
  ScrollView,
  Select,
  SelectableRow,
  Spacer,
  Spinner,
  StatusMessage,
  Switch,
  Table,
  statusColumn,
  useTable,
  type Column,
  Tabs,
  TextInput,
  Toast,
  Toggle,
  ToggleSwitch,
  UnorderedList,
  colors,
  useTerminalProgress,
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

type JobRow = {
  id: string
  name: string
  owner: string
  duration: number
  state: "success" | "error" | "warning" | "pending" | "info"
}

const jobStates = ["success", "success", "pending", "error", "success", "warning", "info"] as const
const jobNames = ["build", "lint", "test · unit", "test · e2e", "publish", "deploy 日本", "audit"]

// Ten thousand rows, so the gallery shows the window doing its job.
const jobs: JobRow[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: `JOB-${String(i + 1).padStart(5, "0")}`,
  name: `${jobNames[i % jobNames.length]} — pipeline ${(i * 7) % 113}`,
  owner: `@user${(i * 13) % 37}`,
  duration: (i * 7919) % 3600,
  state: jobStates[(i * 5) % jobStates.length]!,
}))

const jobColumns: Column<JobRow>[] = [
  { key: "id", header: "Job" },
  { key: "name", header: "Name", flex: 1, maxWidth: 28 },
  { key: "owner", header: "Owner", sortable: false },
  {
    key: "duration",
    header: "Took",
    align: "right",
    format: (value) => `${Math.floor(Number(value) / 60)}m ${Number(value) % 60}s`,
  },
  statusColumn<JobRow>({ key: "state", header: "State", status: (row) => row.state }),
]

const TableV2Demo = ({ focused }: { focused: boolean }) => {
  const table = useTable({
    data: jobs,
    columns: jobColumns,
    rowKey: (row) => row.id,
    selection: "multiple",
    defaultSort: { key: "state", direction: "asc" },
    height: 8,
    isActive: focused,
  })
  const counter = `${table.cursor + 1} of ${jobs.length.toLocaleString("en-GB")}`
  const picked = table.selected.length ? ` · ${table.selected.length} selected` : ""
  return (
    <Box flexDirection="column">
      <Table maxWidth={78} {...table.tableProps} />
      <Box justifyContent="flex-end" width={78}>
        <Text color={colors.muted}>{counter + picked}</Text>
      </Box>
      <FooterHints hints={table.hints} help={false} />
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
    { label: "Files", value: "files", icon: "◆" },
    { label: "Search", value: "search", icon: "▲" },
    { label: "Settings", value: "settings", icon: "●" },
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

// The marker cell, which is the least discoverable thing in the package: a
// field with a twelve-line doc comment nobody opens. Static, it looks like a
// bullet somebody typed into the label; breathing, it is obviously a channel.
//
// Its OWN ramp, deliberately not the one the cockpit pulses with. The glyphs
// are the caller's — `Tabs` reserves the cell and never looks inside it — so a
// gallery that had to borrow a consumer's vocabulary to make this legible would
// be evidence the vocabulary belonged here. It doesn't, and this shows why.
const MARKER_PULSE = ["◦", "•", "●", "•"]
const MARKER_MS = 150

const TabsMarkerDemo = ({ focused }: { focused: boolean }) => {
  const [active, setActive] = useState("inbox")
  const [news, setNews] = useState(true)
  const [frame, setFrame] = useState(0)

  // Demo-local, like every other entry's state — the registry has no notion of
  // time and needs none. It runs only while there is something to pulse, which
  // is the same gate a real host applies.
  useEffect(() => {
    if (!news) return
    const id = setInterval(() => setFrame((f) => f + 1), MARKER_MS)
    return () => clearInterval(id)
  }, [news])

  // TWO columns on every tab, marked or not. That is the whole contract: a bar
  // that widens when news lands is a bar you have to re-find, and it moves at
  // exactly the moment you are trying to read it. Press n and watch the labels
  // stay put.
  const marker = (marked: boolean) =>
    marked ? `${MARKER_PULSE[frame % MARKER_PULSE.length]} ` : "  "

  const items = [
    { label: "Inbox", value: "inbox", count: 4, marker: marker(false) },
    {
      label: "Review",
      value: "review",
      count: 2,
      marker: marker(news),
      markerColor: colors.accent,
    },
    { label: "Done", value: "done", marker: marker(false) },
  ]

  useInput(
    (input, key) => {
      const i = items.findIndex((x) => x.value === active)
      if (key.leftArrow) setActive(items[Math.max(0, i - 1)]!.value)
      if (key.rightArrow)
        setActive(items[Math.min(items.length - 1, i + 1)]!.value)
      if (input === "n") setNews((on) => !on)
    },
    { isActive: focused },
  )

  return (
    <Box flexDirection="column">
      <Tabs active={active} items={items} />
      <Text dimColor>← → to switch tab · n to toggle the marker</Text>
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

const ToggleSwitchDemo = ({ focused }: { focused: boolean }) => {
  const [on, setOn] = useState(true)
  useInput(
    (input) => {
      if (input === " ") setOn((o) => !o)
    },
    { isActive: focused },
  )
  return (
    <Box flexDirection="column">
      <ToggleSwitch on={on} label={on ? "on" : "off"} />
      <Text dimColor>space to toggle</Text>
    </Box>
  )
}

// ── registry ──────────────────────────────────────────────────────────

// Climbs to 100 and starts over, mirroring itself into the terminal's tab or
// taskbar where the terminal draws OSC 9;4 — and doing nothing where not.
const TerminalProgressDemo = () => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 1)), 120)
    return () => clearInterval(timer)
  }, [])
  useTerminalProgress({ value })
  return (
    <Box flexDirection="column">
      <ProgressBar value={value} width={30} label="Syncing" showValue />
      <Text dimColor>also shown in the tab / taskbar (iTerm2 ≥ 3.6, Ghostty, Windows Terminal, kitty ≥ 0.47)</Text>
    </Box>
  )
}

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
          {
            name: "TextInput",
            notes: "cursor, masking and submit on enter",
            tests: "4",
          },
          {
            name: "MultiSelect",
            notes: "space toggles, enter confirms",
            tests: "3",
          },
          { name: "ScrollView", notes: "windowed list", tests: "2" },
        ]}
        columns={[
          { key: "name", header: "Component", width: 14 },
          { key: "notes", header: "Notes", width: 22, overflow: "wrap" },
          { key: "tests", header: "Tests", width: 6, align: "right" },
        ]}
      />
    ),
  },
  {
    name: "Table · interactive",
    category: "Lists",
    interactive: true,
    render: (f) => <TableV2Demo focused={f} />,
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
    name: "Tabs · marker",
    category: "Selection",
    interactive: true,
    render: (f) => <TabsMarkerDemo focused={f} />,
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
    name: "ToggleSwitch",
    category: "Selection",
    interactive: true,
    render: (f) => <ToggleSwitchDemo focused={f} />,
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
    render: () => (
      <Box flexDirection="column">
        <Spinner type="dots" label="dots" />
        <Spinner type="line" label="line" />
        <Spinner type="arc" label="arc" />
        <Spinner type="pulse" label="pulse" />
        <Spinner type="bounce" label="bounce" />
      </Box>
    ),
  },
  {
    name: "ProgressBar",
    category: "Status",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <ProgressBar value={38} />
        <ProgressBar value={72.3} showValue />
        <ProgressBar value={100} showValue />
        <ProgressBar value={41.7} label="Uploading" showValue eta={185} />
        <ProgressBar indeterminate label="Resolving" />
      </Box>
    ),
  },
  {
    name: "Meter",
    category: "Status",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <Meter label="CPU " value={23} warning={70} critical={90} />
        <Meter label="Disk" value={78} warning={70} critical={90} />
        <Meter label="Swap" value={96} warning={70} critical={90} />
        <Meter label="Heap" value={612} max={1024} format={(v, _, m) => `${v} / ${m} MB`} />
      </Box>
    ),
  },
  {
    name: "useTerminalProgress",
    category: "Status",
    interactive: false,
    render: () => <TerminalProgressDemo />,
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
    name: "Pill",
    category: "Status",
    interactive: false,
    render: () => (
      <Box gap={1}>
        <Pill>epic</Pill>
        <Pill variant="accent">blocked</Pill>
        <Pill variant="success">shipped</Pill>
        <Pill variant="info">draft</Pill>
        {/* The law: solid says something happened, soft says what it is.
            A type sits beside an event so the difference is visible, not told;
            group is the epic, off the accent so the key keeps orange. */}
        <Pill tone="soft" variant="group">epic</Pill>
        <Pill tone="soft" variant="success">story</Pill>
        <Pill tone="soft" variant="error">bug</Pill>
        <Pill tone="soft" variant="muted">subtask</Pill>
        {/* Outline: the same classification on a ground where any fill is too much. */}
        <Pill tone="outline" variant="error">bug</Pill>
        {/* The escape hatch, shown in the gallery so the ink it picks for a
            fill is something you can look at rather than take on trust —
            GitHub's merged purple is the case it exists for. */}
        <Pill color="#A371F7">MERGED</Pill>
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
    name: "Panel",
    category: "Layout",
    interactive: false,
    render: () => (
      <Panel title="Jobs" color="cyan" focused>
        <Text>#42 main · passing</Text>
        <Text dimColor>#41 main · passing</Text>
      </Panel>
    ),
  },
  {
    name: "Columns",
    category: "Layout",
    interactive: false,
    render: () => (
      <Columns>
        <Panel title="Jobs" flexGrow={1}>
          <Text>build</Text>
          <Text>test</Text>
        </Panel>
        <Panel title="Logs" flexGrow={2}>
          <Text dimColor>› npm run build</Text>
        </Panel>
      </Columns>
    ),
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
    name: "Divider",
    category: "Layout",
    interactive: false,
    render: () => (
      <Box flexDirection="column" width={44}>
        <Divider />
        <Divider label="Today" />
        <Divider label="heavy" variant="heavy" align="left" />
        <Divider label="double" variant="double" align="right" />
        <Divider label="dashed" variant="dashed" />
        <Spacer size="xs" />
        <Box>
          <Text>left</Text>
          <Spacer />
          <Text>right</Text>
        </Box>
      </Box>
    ),
  },
  {
    name: "Link",
    category: "Layout",
    interactive: false,
    render: () => (
      <Box flexDirection="column">
        <Link url="https://github.com/kud/ink-ui">kud/ink-ui</Link>
        <Link url="https://kud.io" />
        <Link url="https://kud.io/projects/ink-ui" hyperlink={false}>
          forced fallback
        </Link>
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
