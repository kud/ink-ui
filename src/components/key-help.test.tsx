import React, { useState } from "react"
import { render } from "ink-testing-library"
import { Box, Text, useInput } from "ink"
import { describe, it, expect } from "vitest"
import { LayerHost, Layer, useLayer } from "./layers.js"
import { KeyHelp, KeyLegend } from "./key-help.js"
import { KeyHelpProvider, useKeyBindings, groupBindings, type KeyBinding } from "./key-bindings.js"
import { detectEnvironment, type TerminalCapabilities } from "../theme/terminal.js"
import { ThemeProvider } from "../theme/theme-provider.js"

const ESC = String.fromCharCode(27)
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))
const settle = async () => {
  await delay()
  await delay()
}

const caps = (over: Partial<TerminalCapabilities> = {}): TerminalCapabilities => ({
  ...detectEnvironment({}, { isTTY: true }),
  colorLevel: "truecolor",
  unicode: true,
  ...over,
})

const LIST: KeyBinding[] = [
  { key: "↑↓", label: "move" },
  { key: "⏎", label: "open" },
  { key: "r", label: "refresh", footer: false },
]

// Bindings register on the level of the component that declares them, so a
// layer's keys are declared by its content, not by whoever mounts the Layer.
const DialogBody = () => {
  useKeyBindings([{ key: "y", label: "confirm" }], { group: "Dialog" })
  return <Text>Sure?</Text>
}

const Dialog = ({ onClose }: { onClose: () => void }) => (
  <Layer title="Delete?" width={40} onClose={onClose}>
    <DialogBody />
  </Layer>
)

const App = ({ help, extra = true }: { help?: boolean; extra?: boolean }) => {
  const [open, setOpen] = useState(false)
  const { isTop } = useLayer()
  useKeyBindings(LIST, { group: "List" })
  useKeyBindings([{ key: "d", label: "delete" }], { group: "Actions", isActive: extra })
  useInput((input) => {
    if (input === "d") setOpen(true)
  }, { isActive: isTop })
  return (
    <Box flexDirection="column" height={18}>
      <Text>main screen</Text>
      <Box flexGrow={1} />
      <KeyHelp help={help} />
      {open ? <Dialog onClose={() => setOpen(false)} /> : null}
    </Box>
  )
}

describe("KeyHelp footer", () => {
  it("draws the registered footer bindings, then the fixed tail", async () => {
    const { lastFrame } = render(
      <LayerHost>
        <App />
      </LayerHost>,
    )
    await settle()
    const footer = (lastFrame() ?? "").split("\n").at(-1)!
    expect(footer).toMatch(/↑↓ move\s+⏎ open\s+d delete\s+\? help\s+q quit/)
    // footer: false keeps a binding to the legend.
    expect(footer).not.toContain("refresh")
  })

  it("withdraws bindings that stop being active", async () => {
    const { lastFrame } = render(
      <LayerHost>
        <App extra={false} />
      </LayerHost>,
    )
    await settle()
    expect(lastFrame()).not.toContain("delete")
  })

  it("drops ? help and ignores ? when there is no legend", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <App help={false} />
      </LayerHost>,
    )
    await settle()
    expect(lastFrame()).not.toContain("? help")
    stdin.write("?")
    await settle()
    expect(lastFrame()).not.toContain("Keys")
  })

  it("shows a layer's own keys in its frame, with ⌫ back, while it is on top", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <App />
      </LayerHost>,
    )
    await settle()
    stdin.write("d")
    await settle()
    expect(lastFrame()).toMatch(/y confirm\s+⌫ back\s+\? help\s+q quit/)
    expect(lastFrame()).not.toContain("⏎ open")
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).toMatch(/⏎ open/)
    expect(lastFrame()).not.toContain("y confirm")
  })
})

describe("KeyHelp legend", () => {
  it("opens on ?, grouped, with the app's own keys last, and closes on ? again", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <App />
      </LayerHost>,
    )
    await settle()
    stdin.write("?")
    await settle()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Keys")
    // Groups in registration order across the top, the app's own keys last.
    expect(frame).toMatch(/List\s+Actions\s+App/)
    for (const row of [/↑↓\s+move/, /r\s+refresh/, /d\s+delete/, /\?\s+this legend/, /q\s+quit/]) {
      expect(frame).toMatch(row)
    }
    // At the root there is nowhere to go back to.
    expect(frame).not.toContain("esc ⌫")
    stdin.write("?")
    await settle()
    expect(lastFrame()).not.toContain("this legend")
  })

  it("closes on esc through the layer stack", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <App />
      </LayerHost>,
    )
    await settle()
    stdin.write("?")
    await settle()
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).not.toContain("this legend")
    expect(lastFrame()).toContain("main screen")
  })

  it("describes the layer it opened over, not the page beneath", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <App />
      </LayerHost>,
    )
    await settle()
    stdin.write("d")
    await settle()
    stdin.write("?")
    await settle()
    const frame = lastFrame() ?? ""
    expect(frame).toMatch(/Dialog[\s\S]*y\s+confirm/)
    expect(frame).toMatch(/esc ⌫\s+back/)
    expect(frame).not.toContain("refresh")
    // esc peels the legend, then the dialog.
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).toContain("y confirm")
    expect(lastFrame()).not.toContain("this legend")
  })

  it("aligns keys in one column and spells them out on an ASCII terminal", async () => {
    const { lastFrame } = render(
      <ThemeProvider capabilities={caps({ unicode: false })}>
        <KeyLegend
          groups={[
            { title: "List", bindings: [{ key: "↑↓", label: "move" }, { key: "o", label: "browser" }] },
            { title: "App", bindings: [{ key: "esc ⌫", label: "back" }] },
          ]}
        />
      </ThemeProvider>,
    )
    await settle()
    const lines = (lastFrame() ?? "").split("\n")
    const move = lines.find((line) => line.includes("move"))!
    const browser = lines.find((line) => line.includes("browser"))!
    expect(move).toContain("up/down")
    expect(move.indexOf("move")).toBe(browser.indexOf("browser"))
    expect(lastFrame()).toContain("esc bksp")
  })
})

describe("registration", () => {
  it("works under an explicit provider shared by the host", async () => {
    const { lastFrame } = render(
      <KeyHelpProvider>
        <LayerHost>
          <App />
        </LayerHost>
      </KeyHelpProvider>,
    )
    await settle()
    expect(lastFrame()).toContain("d delete")
  })

  it("is a no-op without a registry, so a screen can register unconditionally", async () => {
    const Screen = () => {
      useKeyBindings(LIST)
      return <KeyHelp />
    }
    const { lastFrame } = render(<Screen />)
    await settle()
    expect(lastFrame()).toMatch(/^\? help\s+q quit/)
  })

  it("groups by binding, then registration, deduplicating repeats", () => {
    const groups = groupBindings(
      [
        { id: "a", level: 0, group: "List", bindings: [{ key: "o", label: "open" }, { key: "x", label: "close", group: "Other" }] },
        { id: "b", level: 0, group: "List", bindings: [{ key: "o", label: "open" }, { key: "s", label: "sort" }] },
        { id: "c", level: 1, group: "Dialog", bindings: [{ key: "y", label: "yes" }] },
      ],
      0,
    )
    expect(groups).toEqual([
      { title: "List", bindings: [{ key: "o", label: "open" }, { key: "s", label: "sort" }] },
      { title: "Other", bindings: [{ key: "x", label: "close", group: "Other" }] },
    ])
  })
})
