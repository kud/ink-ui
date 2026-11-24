import React from "react"
import { EventEmitter } from "node:events"
import { render } from "ink-testing-library"
import { render as inkRender, Text } from "ink"
import { describe, it, expect, afterEach } from "vitest"
import { ThemeProvider, useTheme, ambientTheme } from "./theme-provider.js"
import { detectEnvironment, type TerminalCapabilities } from "./terminal.js"
import { StatusMessage } from "../components/status-message.js"
import { Alert } from "../components/alert.js"
import { Toast } from "../components/toast.js"
import { Badge } from "../components/badge.js"
import { Pill } from "../components/pill.js"
import { Tabs } from "../components/tabs.js"
import { ProgressBar } from "../components/progress-bar.js"
import { SelectableRow } from "../components/selectable-row.js"
import { Panel } from "../components/panel.js"
import { Spinner } from "../components/spinner.js"
import { SkeletonBar } from "../components/skeleton.js"
import { Toggle } from "../components/toggle.js"
import { ToggleSwitch } from "../components/toggle-switch.js"
import { Switch } from "../components/switch.js"
import { Card } from "../components/card.js"
import { Page } from "../components/page.js"
import { FooterHints } from "../components/footer-hints.js"
import { UnorderedList } from "../components/unordered-list.js"
import { UpdateBanner } from "../components/update-banner.js"
import { Select } from "../components/select.js"

const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms))

const caps = (
  overrides: Partial<TerminalCapabilities> = {},
): TerminalCapabilities => ({
  ...detectEnvironment(
    { COLORTERM: "truecolor", LANG: "en_GB.UTF-8" },
    { isTTY: true },
  ),
  ...overrides,
})

const noColor = caps({ colorLevel: "none" })
const ascii = caps({ unicode: false })
const still = caps({ reducedMotion: true })

const within = (capabilities: TerminalCapabilities, node: React.ReactNode) =>
  render(<ThemeProvider capabilities={capabilities}>{node}</ThemeProvider>)

const env = { ...process.env }
afterEach(() => {
  process.env = { ...env }
})

describe("one policy, read by every component", () => {
  it("the provider's theme is what components see", () => {
    let seen: string | undefined
    const Probe = () => {
      seen = useTheme().name
      return null
    }
    within(noColor, <Probe />)
    expect(seen).toBe("plain")
    within(caps(), <Probe />)
    expect(seen).toBe("default")
  })

  it("without a provider, NO_COLOR alone turns the ambient theme plain", () => {
    process.env["NO_COLOR"] = "1"
    expect(ambientTheme().name).toBe("plain")
    delete process.env["NO_COLOR"]
    expect(ambientTheme().name).toBe("default")
    // The ambient theme never changes glyphs under an app that has no provider.
    expect(ambientTheme({ LC_ALL: "C" }).icons).toBe("unicode")
  })
})

describe("no colour", () => {
  it("Pill falls back to brackets in every filled tone", () => {
    for (const tone of ["solid", "soft", "tonal"] as const) {
      const { lastFrame } = within(
        noColor,
        <Pill tone={tone} variant="success">
          merged
        </Pill>,
      )
      expect(lastFrame(), tone).toBe("[merged]")
    }
  })

  it("Tabs draw counts in parentheses rather than chips", () => {
    const { lastFrame } = within(
      noColor,
      <Tabs
        active="a"
        items={[
          { value: "a", label: "Open", count: 3 },
          { value: "b", label: "Done", count: null },
        ]}
      />,
    )
    expect(lastFrame()).toContain("Open (3)")
    expect(lastFrame()).toContain("Done (–)")
  })

  it("Tabs fall back the same way on sixteen colours, which have no tint", () => {
    const { lastFrame } = within(
      caps({ colorLevel: "ansi16" }),
      <Tabs active="a" items={[{ value: "a", label: "Open", count: 3 }]} />,
    )
    expect(lastFrame()).toContain("Open (3)")
  })

  it("ProgressBar keeps the remainder as a shape", () => {
    const { lastFrame } = within(noColor, <ProgressBar value={50} width={10} />)
    expect(lastFrame()).toBe("█████░░░░░")
  })

  it("ToggleSwitch keeps the knob's position without a track", () => {
    expect(within(noColor, <ToggleSwitch on />).lastFrame()).toBe("[ ●]")
    expect(within(noColor, <ToggleSwitch on={false} />).lastFrame()).toBe(
      "[● ]",
    )
  })

  it("UpdateBanner draws its keycaps as brackets", () => {
    const { lastFrame } = within(
      noColor,
      <UpdateBanner
        name="tool"
        current="1.0.0"
        latest="1.1.0"
        command="npm i -g tool"
        onConfirm={() => {}}
        onDecline={() => {}}
        focused={false}
      />,
    )
    expect(lastFrame()).toContain("[Y] upgrade now")
    expect(lastFrame()).toContain("[N]")
  })

  it("SkeletonBar takes the light shade instead of solid blocks", () => {
    expect(within(noColor, <SkeletonBar width={4} />).lastFrame()).toBe("░░░░")
  })

  it("components that colour without changing shape still render the same words", () => {
    const { lastFrame } = within(
      noColor,
      <>
        <StatusMessage variant="error">failed</StatusMessage>
        <Badge variant="warning">beta</Badge>
        <Toggle label="wrap" on />
        <Switch left="list" right="board" value="left" />
      </>,
    )
    expect(lastFrame()).toContain("✗ failed")
    expect(lastFrame()).toContain("[beta]")
    expect(lastFrame()).toContain("wrap ●")
    expect(lastFrame()).toContain("list ●─○ board")
  })
})

describe("ascii, for a locale that is not UTF-8", () => {
  it("status marks take shui's 7-bit set", () => {
    const { lastFrame } = within(
      ascii,
      <>
        <StatusMessage variant="success">ok</StatusMessage>
        <StatusMessage variant="error">no</StatusMessage>
        <StatusMessage variant="warning">careful</StatusMessage>
        <StatusMessage variant="info">note</StatusMessage>
      </>,
    )
    expect(lastFrame()).toBe("+ ok\nx no\n! careful\ni note")
  })

  it("Toast and Alert follow, and Alert's border is 7-bit", () => {
    expect(
      within(ascii, <Toast message="saved" variant="success" />).lastFrame(),
    ).toBe("+ saved")
    const alert = within(ascii, <Alert variant="warning">disk low</Alert>)
    expect(alert.lastFrame()).toMatch(/^\+-+\+$/m)
    expect(alert.lastFrame()).toContain("! ")
  })

  it("the selected row's pointer is >", () => {
    expect(
      within(ascii, <SelectableRow active>row</SelectableRow>).lastFrame(),
    ).toBe("  > row")
  })

  it("Select marks the chosen option with +", () => {
    const { lastFrame } = within(
      ascii,
      <Select options={[{ label: "One", value: "one" }]} isDisabled />,
    )
    expect(lastFrame()).toBe("  > One +")
  })

  it("Panel draws a classic border and a * focus mark", () => {
    const { lastFrame } = within(
      ascii,
      <Panel title="Logs" focused>
        <Text>line</Text>
      </Panel>,
    )
    expect(lastFrame()).toContain("Logs *")
    expect(lastFrame()).toMatch(/^\+-+\+$/m)
  })

  it("a selected Card is a heavier ASCII border, never a colour", () => {
    const frame = (selected: boolean) =>
      within(
        ascii,
        <Card
          title="api"
          status={{ glyph: "*", word: "up" }}
          width={20}
          selected={selected}
        />,
      ).lastFrame()
    expect(frame(true)).toMatch(/^#=+#$/m)
    expect(frame(false)).toMatch(/^\+-+\+$/m)
  })

  it("Pill, Tabs, lists, footer and Page draw nothing beyond 7-bit", () => {
    const { lastFrame } = within(
      ascii,
      <Page
        title="Jira"
        count={3}
        tabs={
          <Tabs
            active="a"
            items={[
              { value: "a", label: "Open", count: 3, warning: 1 },
              { value: "b", label: "Done", count: null, group: "x" },
            ]}
          />
        }
        hints={[["↑↓", "move"], ["⏎", "open"]]}
        page="nested"
        width={60}
      >
        <Pill tone="soft" variant="group">
          epic
        </Pill>
        <UnorderedList>
          <UnorderedList.Item>
            <Text>item</Text>
          </UnorderedList.Item>
        </UnorderedList>
      </Page>,
    )
    const frame = lastFrame() ?? ""
    expect(/^[\x20-\x7e\n]*$/.test(frame), frame).toBe(true)
    expect(frame).toContain("Open (3 ! 1)")
    expect(frame).toContain("[epic]")
    expect(frame).toContain("* item")
    expect(frame).toContain("up/down move")
    expect(frame).toContain("bksp back")
  })
})

describe("motion", () => {
  it("Spinner stands still when the policy says no motion", async () => {
    const { frames } = within(still, <Spinner label="loading" />)
    await wait(250)
    expect(new Set(frames.filter(Boolean)).size).toBe(1)
  })

  it("Spinner turns when motion is allowed", async () => {
    const { frames } = within(caps(), <Spinner label="loading" />)
    await wait(250)
    expect(new Set(frames.filter(Boolean)).size).toBeGreaterThan(1)
  })

  it("Spinner takes 7-bit frames in ASCII", () => {
    expect(within(caps({ unicode: false, reducedMotion: true }), <Spinner label="x" />).lastFrame()).toBe("- x")
  })

  it("SkeletonBar stays static under reduced motion", async () => {
    const { frames } = within(still, <SkeletonBar width={6} />)
    await wait(200)
    expect(frames.length).toBe(1)
  })
})

class FakeOut extends EventEmitter {
  columns = 80
  rows = 24
  isTTY = true
  output = ""
  write = (chunk: string) => {
    this.output += chunk
    return true
  }
}

class FakeIn extends EventEmitter {
  isTTY = true
  setRawMode() {}
  setEncoding() {}
  read() {
    return null
  }
  ref() {}
  unref() {}
  resume() {}
  pause() {}
}

describe("screen reader", () => {
  const speak = (node: React.ReactNode) => {
    const stdout = new FakeOut()
    const instance = inkRender(node, {
      stdout: stdout as never,
      stdin: new FakeIn() as never,
      isScreenReaderEnabled: true,
      patchConsole: false,
    })
    instance.unmount()
    return stdout.output
  }

  it("says the word a status mark stands for", () => {
    const out = speak(<StatusMessage variant="success">deployed</StatusMessage>)
    expect(out).toContain("success:")
    expect(out).not.toContain("✓")
  })

  it("hears a progress bar as a percentage, not as blocks", () => {
    const out = speak(<ProgressBar value={42} width={10} />)
    expect(out).toContain("42%")
    expect(out).not.toContain("█")
  })

  it("hears a toggle's state as a word", () => {
    expect(speak(<Toggle label="wrap" on={false} />)).toContain("wrap: off")
  })

  it("stops motion through Ink's own switch, even without a provider", () => {
    let motion: boolean | undefined
    const Probe = () => {
      motion = useTheme().policy.motion
      return null
    }
    speak(<Probe />)
    expect(motion).toBe(false)
  })
})
