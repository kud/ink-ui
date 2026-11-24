import React, { useState } from "react"
import { render } from "ink-testing-library"
import { Box, Text, useInput } from "ink"
import { describe, it, expect, vi } from "vitest"
import { LayerHost, Layer, useLayer, backdropStyle, type LayerProps } from "./layers.js"
import { FocusRing } from "./focus-ring.js"
import { TextInput } from "./text-input.js"
import { useAppKeys } from "./use-app-keys.js"
import { createTheme } from "../theme/theme.js"
import { detectEnvironment, type TerminalCapabilities } from "../theme/terminal.js"
import { ThemeProvider } from "../theme/theme-provider.js"

const ESC = String.fromCharCode(27)
const DEL = String.fromCharCode(127)
const TAB = "\t"
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))
// Opening a layer takes a commit to register and a layout pass to size.
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

const Rows = ({ count = 10, label = "row" }: { count?: number; label?: string }) => (
  <Box flexDirection="column">
    {Array.from({ length: count }, (_, i) => (
      <Text key={i}>{`${label} ${i} ${"x".repeat(40)}`}</Text>
    ))}
  </Box>
)

/** A main screen that opens one layer on `o`, its props given by the test. */
const Opener = ({ layer, onBack }: { layer: Omit<LayerProps, "onClose">; onBack?: () => boolean }) => {
  const [open, setOpen] = useState(false)
  const { isTop } = useLayer()
  useAppKeys({ onBack, onQuit: () => {} })
  useInput((input) => {
    if (input === "o") setOpen(true)
  }, { isActive: isTop })
  return (
    <Box flexDirection="column" height={14}>
      <Rows />
      <Text>{open ? "state: open" : "state: closed"}</Text>
      {open ? <Layer {...layer} onClose={() => setOpen(false)} /> : null}
    </Box>
  )
}

describe("LayerHost", () => {
  it("draws the main tree and nothing else while the stack is empty", async () => {
    const { lastFrame } = render(
      <LayerHost>
        <Opener layer={{ title: "Delete?", children: <Text>Sure?</Text> }} />
      </LayerHost>,
    )
    await settle()
    expect(lastFrame()).toContain("row 0")
    expect(lastFrame()).not.toContain("Delete?")
  })

  it("opens a modal above the main tree, centred over a veil, with the nested tail", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Opener layer={{ title: "Delete?", width: 30, children: <Text>Sure?</Text> }} />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Delete?")
    expect(frame).toContain("Sure?")
    expect(frame).toMatch(/⌫ back\s+q quit/)
    // The veil paints every cell of the host: nothing beneath shows through.
    expect(frame).not.toContain("row 0")
    // Centred: the frame's top border is indented past the host's left edge.
    const border = frame.split("\n").find((line) => line.includes("╭"))!
    expect(border.indexOf("╭")).toBeGreaterThan(10)
  })

  it("closes the topmost layer on esc and on backspace", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Opener layer={{ title: "Delete?", children: <Text>Sure?</Text> }} />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).toContain("state: closed")
    stdin.write("o")
    await settle()
    expect(lastFrame()).toContain("Delete?")
    stdin.write(DEL)
    await settle()
    expect(lastFrame()).toContain("state: closed")
    expect(lastFrame()).toContain("row 0")
  })

  it("leaves esc to the content when the layer is not dismissible", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Opener layer={{ title: "Typing", dismissible: false, children: <Text>field</Text> }} />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).toContain("Typing")
  })

  it("stands useAppKeys' peel down while a layer is open, and hands it back after", async () => {
    const onBack = vi.fn(() => true)
    const { stdin } = render(
      <LayerHost>
        <Opener layer={{ title: "Delete?" }} onBack={onBack} />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    stdin.write(ESC)
    await settle()
    expect(onBack).not.toHaveBeenCalled()
    stdin.write(ESC)
    await settle()
    expect(onBack).toHaveBeenCalledOnce()
  })

  it("stops the screen beneath answering its own hotkeys while a layer is on top", async () => {
    const hits = vi.fn()
    const Screen = () => {
      const [open, setOpen] = useState(false)
      const { isTop } = useLayer()
      useInput((input) => {
        if (input === "o") setOpen(true)
        if (input === "x") hits()
      }, { isActive: isTop })
      return (
        <Box height={8}>
          <Text>screen</Text>
          {open ? <Layer title="Over" onClose={() => setOpen(false)} /> : null}
        </Box>
      )
    }
    const { stdin } = render(
      <LayerHost>
        <Screen />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    stdin.write("x")
    await settle()
    expect(hits).not.toHaveBeenCalled()
    stdin.write(ESC)
    await settle()
    stdin.write("x")
    await settle()
    expect(hits).toHaveBeenCalledOnce()
  })
})

describe("updates", () => {
  it("draws a layer's latest content, even when it changed in the commit that opened it", async () => {
    // The parent reads the depth, so opening the layer re-renders it — and the
    // Layer's children change — in the same commit its slot first mounts.
    const Screen = () => {
      const [open, setOpen] = useState(false)
      const { depth } = useLayer()
      useInput((input) => {
        if (input === "o") setOpen(true)
      })
      return (
        <Box height={10}>
          <Text>screen</Text>
          {open ? (
            <Layer title="Depth" onClose={() => setOpen(false)}>
              <Text>{`depth seen: ${depth}`}</Text>
            </Layer>
          ) : null}
        </Box>
      )
    }
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Screen />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    expect(lastFrame()).toContain("depth seen: 1")
  })
})

describe("nesting", () => {
  const Nested = () => {
    const [outer, setOuter] = useState(false)
    const { isTop } = useLayer()
    useInput((input) => {
      if (input === "o") setOuter(true)
    }, { isActive: isTop })
    return (
      <Box flexDirection="column" height={16}>
        <Rows count={12} />
        {outer ? (
          <Layer title="Outer" width={40} onClose={() => setOuter(false)}>
            <Inner />
          </Layer>
        ) : null}
      </Box>
    )
  }
  const Inner = () => {
    const [inner, setInner] = useState(false)
    const { isTop, level } = useLayer()
    useInput((input) => {
      if (input === "i") setInner(true)
    }, { isActive: isTop })
    return (
      <>
        <Text>{`outer body · level ${level}`}</Text>
        {inner ? (
          <Layer kind="popover" title="Inner" top={1} left={2} onClose={() => setInner(false)}>
            <Text>inner body</Text>
          </Layer>
        ) : null}
      </>
    )
  }

  it("opens a layer from a layer, above it, and esc peels one at a time", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Nested />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    expect(lastFrame()).toContain("outer body · level 1")
    stdin.write("i")
    await settle()
    expect(lastFrame()).toContain("inner body")
    expect(lastFrame()).toContain("Outer")
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).not.toContain("inner body")
    expect(lastFrame()).toContain("outer body")
    stdin.write(ESC)
    await settle()
    expect(lastFrame()).not.toContain("outer body")
    expect(lastFrame()).toContain("row 0")
  })

  it("closes everything above a layer that closes", async () => {
    const Host = () => {
      const [open, setOpen] = useState(true)
      useInput((input) => {
        if (input === "c") setOpen(false)
      })
      return (
        <Box height={12}>
          <Text>base</Text>
          {open ? (
            <Layer title="A" dismissible={false}>
              <Layer kind="popover" title="B" dismissible={false}>
                <Text>b body</Text>
              </Layer>
            </Layer>
          ) : null}
        </Box>
      )
    }
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Host />
      </LayerHost>,
    )
    await settle()
    expect(lastFrame()).toContain("b body")
    stdin.write("c")
    await settle()
    expect(lastFrame()).not.toContain("b body")
    expect(lastFrame()).toContain("base")
  })
})

describe("focus", () => {
  const Form = ({ setLog }: { setLog: (entry: string) => void }) => {
    const [open, setOpen] = useState(false)
    const { isTop } = useLayer()
    useInput((_input, key) => {
      if (key.ctrl && _input === "o") setOpen(true)
    }, { isActive: isTop })
    return (
      <Box flexDirection="column" height={20}>
        <FocusRing label="First" id="first">
          <TextInput onChange={(v) => setLog(`first=${v}`)} />
        </FocusRing>
        <FocusRing label="Second" id="second">
          <TextInput onChange={(v) => setLog(`second=${v}`)} />
        </FocusRing>
        {open ? (
          <Layer title="Dialog" width={40} dismissible={false}>
            <FocusRing label="A" id="a">
              <TextInput onChange={(v) => setLog(`a=${v}`)} onCancel={() => setOpen(false)} />
            </FocusRing>
            <FocusRing label="B" id="b">
              <TextInput onChange={(v) => setLog(`b=${v}`)} onCancel={() => setOpen(false)} />
            </FocusRing>
          </Layer>
        ) : null}
      </Box>
    )
  }

  it("traps Tab inside the layer and gives focus back when it closes", async () => {
    const log = vi.fn()
    const last = () => log.mock.calls.at(-1)?.[0]
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Form setLog={log} />
      </LayerHost>,
    )
    await settle()
    stdin.write(TAB)
    await settle()
    stdin.write("s")
    await settle()
    expect(last()).toBe("second=s")

    stdin.write("\u000f") // ctrl+o
    await settle()
    stdin.write("a")
    await settle()
    expect(last()).toBe("a=a")
    // Tab cycles A → B → A, never reaching the screen beneath.
    stdin.write(TAB)
    await settle()
    stdin.write("b")
    await settle()
    expect(last()).toBe("b=b")
    stdin.write(TAB)
    await settle()
    stdin.write("c")
    await settle()
    expect(last()).toBe("a=ac")

    stdin.write(ESC)
    await settle()
    expect(lastFrame()).not.toContain("Dialog")
    stdin.write("t")
    await settle()
    expect(last()).toBe("second=st")
  })
})

describe("kinds", () => {
  it("draws an overlay over the host's whole frame, without a veil", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Opener layer={{ kind: "overlay", title: "Sheet", children: <Text>details</Text> }} />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    const lines = (lastFrame() ?? "").split("\n")
    expect(lines[0]!.startsWith("╭")).toBe(true)
    expect(lines.at(-1)!.startsWith("╰")).toBe(true)
    expect(lines).toHaveLength(14)
    expect(lastFrame()).toContain("details")
  })

  it("anchors a popover at its offset and leaves the rest of the screen visible", async () => {
    const { lastFrame, stdin } = render(
      <LayerHost>
        <Opener layer={{ kind: "popover", top: 2, left: 5, children: <Text>pop</Text> }} />
      </LayerHost>,
    )
    await settle()
    stdin.write("o")
    await settle()
    const lines = (lastFrame() ?? "").split("\n")
    expect(lines[0]).toContain("row 0")
    expect(lines[2]!.indexOf("╭")).toBe(5)
    expect(lines[3]).toContain("pop")
    // A popover has no footer by default.
    expect(lastFrame()).not.toContain("q quit")
  })

  it("draws a Layer in place, still framed, when there is no host", async () => {
    const { lastFrame } = render(
      <Box flexDirection="column">
        <Text>above</Text>
        <Layer title="Inline">
          <Text>inline body</Text>
        </Layer>
      </Box>,
    )
    await settle()
    expect(lastFrame()).toMatch(/above[\s\S]*Inline[\s\S]*inline body/)
  })
})

describe("backdrop", () => {
  it("veils in the track ground when there is colour", () => {
    const theme = createTheme({ capabilities: caps() })
    expect(backdropStyle(theme)).toEqual({
      char: " ",
      backgroundColor: theme.colors.track,
      dim: false,
    })
  })

  it("falls back to a dim shade under NO_COLOR, and a 7-bit one on ASCII", () => {
    expect(backdropStyle(createTheme({ capabilities: caps({ colorLevel: "none" }) }))).toEqual({
      char: "░",
      backgroundColor: undefined,
      dim: true,
    })
    expect(
      backdropStyle(createTheme({ capabilities: caps({ colorLevel: "none", unicode: false }) }))?.char,
    ).toBe(".")
  })

  it("draws no veil for a screen reader", () => {
    expect(backdropStyle(createTheme({ capabilities: caps({ screenReader: true }) }))).toBeNull()
  })

  it("draws the shade around the modal under NO_COLOR, with classic borders on ASCII", async () => {
    const { lastFrame, stdin } = render(
      <ThemeProvider capabilities={caps({ colorLevel: "none", unicode: false })}>
        <LayerHost>
          <Opener layer={{ title: "Delete?", width: 30 }} />
        </LayerHost>
      </ThemeProvider>,
    )
    await settle()
    stdin.write("o")
    await settle()
    const frame = lastFrame() ?? ""
    expect(frame).toMatch(/^\.{10,}/)
    expect(frame).toContain("+----")
    expect(frame).toContain("bksp back")
  })
})
