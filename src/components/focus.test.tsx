import React, { useState } from "react"
import { render } from "ink-testing-library"
import { Box, Text, useInput } from "ink"
import { describe, it, expect, vi } from "vitest"
import {
  FocusScope,
  useFocusable,
  useFocusManager,
  type UseFocusableOptions,
} from "./focus.js"
import { FocusRing, focusRingStyle } from "./focus-ring.js"
import { createTheme } from "../theme/theme.js"
import { detectEnvironment, type TerminalCapabilities } from "../theme/terminal.js"
import { ThemeProvider } from "../theme/theme-provider.js"
import { Select } from "./select.js"
import { MultiSelect } from "./multi-select.js"
import { TextInput } from "./text-input.js"
import { EmailInput } from "./email-input.js"
import { PasswordInput } from "./password-input.js"
import { ConfirmInput } from "./confirm-input.js"
import { ScrollView } from "./scroll-view.js"
import { UpdateBanner } from "./update-banner.js"
import { CommandPalette } from "./command-palette.js"

const TAB = "\t"
const SHIFT_TAB = "\u001B[Z"
const CR = "\r"
const DOWN = "\u001B[B"
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

/** A stop that prints `[name]` when focused and `name` otherwise. */
const Stop = ({ name, ...options }: { name: string } & UseFocusableOptions) => {
  const { isFocused } = useFocusable({ id: name, ...options })
  return <Text>{isFocused ? `[${name}]` : ` ${name} `}</Text>
}

const focusedOf = (frame: string | undefined) =>
  /\[(\w+)\]/.exec(frame ?? "")?.[1]

describe("FocusScope traversal", () => {
  it("focuses the first stop on mount and walks Tab / Shift+Tab, wrapping", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope>
        <Box>
          <Stop name="a" />
          <Stop name="b" />
          <Stop name="c" />
        </Box>
      </FocusScope>,
    )
    await delay()
    expect(focusedOf(lastFrame())).toBe("a")
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("b")
    stdin.write(TAB)
    await delay()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("a")
    stdin.write(SHIFT_TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("c")
  })

  it("lets a later stop's autoFocus win over first-in-order", async () => {
    const { lastFrame } = render(
      <FocusScope>
        <Stop name="a" />
        <Stop name="b" autoFocus />
      </FocusScope>,
    )
    await delay()
    expect(focusedOf(lastFrame())).toBe("b")
  })

  it("focuses nothing until asked when autoFocus is off", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope autoFocus={false}>
        <Stop name="a" />
        <Stop name="b" />
      </FocusScope>,
    )
    await delay()
    expect(focusedOf(lastFrame())).toBeUndefined()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("a")
  })

  it("binds no Tab with keys={false}", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope keys={false}>
        <Stop name="a" />
        <Stop name="b" />
      </FocusScope>,
    )
    await delay()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("a")
  })
})

describe("disabled stops", () => {
  it("are skipped by Tab in both directions", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope>
        <Stop name="a" />
        <Stop name="b" disabled />
        <Stop name="c" />
      </FocusScope>,
    )
    await delay()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("c")
    stdin.write(SHIFT_TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("a")
  })

  it("hand focus to the next stop when the focused one becomes disabled", async () => {
    const Host = () => {
      const [off, setOff] = useState(false)
      useInput((input) => {
        if (input === "x") setOff(true)
      })
      return (
        <FocusScope>
          <Stop name="a" />
          <Stop name="b" disabled={off} />
          <Stop name="c" />
        </FocusScope>
      )
    }
    const { stdin, lastFrame } = render(<Host />)
    await delay()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("b")
    stdin.write("x")
    await delay()
    expect(focusedOf(lastFrame())).toBe("c")
  })
})

describe("programmatic focus", () => {
  it("focus(id), focusNext, focusPrevious and blur drive the same state", async () => {
    let manager: ReturnType<typeof useFocusManager> | undefined
    const Spy = () => {
      manager = useFocusManager()
      return <Text>{`focused=${manager.focused ?? "none"}`}</Text>
    }
    const { lastFrame } = render(
      <FocusScope>
        <Stop name="a" />
        <Stop name="b" />
        <Stop name="c" disabled />
        <Spy />
      </FocusScope>,
    )
    await delay()
    manager!.focus("b")
    await delay()
    expect(lastFrame()).toContain("focused=b")
    manager!.focus("c")
    await delay()
    expect(lastFrame()).toContain("focused=b")
    manager!.focusNext()
    await delay()
    expect(lastFrame()).toContain("focused=a")
    manager!.focusPrevious()
    await delay()
    expect(lastFrame()).toContain("focused=b")
    manager!.blur()
    await delay()
    expect(lastFrame()).toContain("focused=none")
    expect(focusedOf(lastFrame())).toBeUndefined()
  })

  it("is inert outside a scope, and a stop there reports focused", () => {
    let manager: ReturnType<typeof useFocusManager> | undefined
    const Spy = () => {
      manager = useFocusManager()
      return null
    }
    const { lastFrame } = render(
      <Box>
        <Stop name="a" />
        <Stop name="b" disabled />
        <Spy />
      </Box>,
    )
    expect(lastFrame()).toContain("[a]")
    expect(lastFrame()).not.toContain("[b]")
    expect(manager!.focused).toBeUndefined()
    expect(() => manager!.focusNext()).not.toThrow()
  })
})

describe("trapping", () => {
  const Host = () => {
    const [open, setOpen] = useState(false)
    useInput((input) => {
      if (input === "o") setOpen(true)
      if (input === "c") setOpen(false)
    })
    return (
      <FocusScope>
        <Stop name="a" />
        <Stop name="b" />
        {open && (
          <FocusScope trap>
            <Stop name="yes" />
            <Stop name="no" />
          </FocusScope>
        )}
      </FocusScope>
    )
  }

  it("keeps Tab inside the trap and gives focus back when it closes", async () => {
    const { stdin, lastFrame } = render(<Host />)
    await delay()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("b")
    stdin.write("o")
    await delay()
    expect(focusedOf(lastFrame())).toBe("yes")
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("no")
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("yes")
    stdin.write(SHIFT_TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("no")
    stdin.write("c")
    await delay()
    expect(focusedOf(lastFrame())).toBe("b")
  })

  it("refuses programmatic focus outside the active trap", async () => {
    let manager: ReturnType<typeof useFocusManager> | undefined
    const Spy = () => {
      manager = useFocusManager()
      return null
    }
    const { lastFrame } = render(
      <FocusScope>
        <Stop name="a" />
        <FocusScope trap>
          <Stop name="yes" />
          <Spy />
        </FocusScope>
      </FocusScope>,
    )
    await delay()
    expect(focusedOf(lastFrame())).toBe("yes")
    manager!.focus("a")
    await delay()
    expect(focusedOf(lastFrame())).toBe("yes")
  })

  it("a nested scope without trap is just a group Tab passes through", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope>
        <Stop name="a" />
        <FocusScope>
          <Stop name="b" />
        </FocusScope>
        <Stop name="c" />
      </FocusScope>,
    )
    await delay()
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("b")
    stdin.write(TAB)
    await delay()
    expect(focusedOf(lastFrame())).toBe("c")
  })
})

const caps = (overrides: Partial<TerminalCapabilities> = {}): TerminalCapabilities => ({
  ...detectEnvironment({ COLORTERM: "truecolor", LANG: "en_GB.UTF-8" }, { isTTY: true }),
  ...overrides,
})

describe("FocusRing", () => {
  it("marks focus with the pointer and a heavy border, not colour alone", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope>
        <FocusRing label="Name">
          <Text>one</Text>
        </FocusRing>
        <FocusRing label="Email">
          <Text>two</Text>
        </FocusRing>
      </FocusScope>,
    )
    await delay()
    expect(lastFrame()).toMatch(/❯ Name/)
    expect(lastFrame()).toMatch(/┏/)
    expect(lastFrame()).not.toMatch(/❯ Email/)
    stdin.write(TAB)
    await delay()
    expect(lastFrame()).toMatch(/❯ Email/)
    expect(lastFrame()).not.toMatch(/❯ Name/)
  })

  it("keeps the label in the same column whether focused or not", async () => {
    const { lastFrame } = render(
      <FocusScope>
        <FocusRing label="Name">
          <Text>x</Text>
        </FocusRing>
        <FocusRing label="Mail">
          <Text>y</Text>
        </FocusRing>
      </FocusScope>,
    )
    await delay()
    const lines = (lastFrame() ?? "").split("\n")
    const name = lines.find((l) => l.includes("Name"))!
    const mail = lines.find((l) => l.includes("Mail"))!
    expect(name.indexOf("Name")).toBe(mail.indexOf("Mail"))
  })

  it("says disabled in words and is skipped", async () => {
    const { stdin, lastFrame } = render(
      <FocusScope>
        <FocusRing label="A">
          <Text>a</Text>
        </FocusRing>
        <FocusRing label="B" disabled>
          <Text>b</Text>
        </FocusRing>
        <FocusRing label="C">
          <Text>c</Text>
        </FocusRing>
      </FocusScope>,
    )
    await delay()
    expect(lastFrame()).toContain("B  disabled")
    stdin.write(TAB)
    await delay()
    expect(lastFrame()).toMatch(/❯ C/)
  })

  it("draws the ASCII pointer and classic border on a non-UTF-8 terminal", async () => {
    const { lastFrame } = render(
      <ThemeProvider capabilities={caps({ unicode: false })}>
        <FocusScope>
          <FocusRing label="Name">
            <Text>x</Text>
          </FocusRing>
        </FocusScope>
      </ThemeProvider>,
    )
    await delay()
    expect(lastFrame()).toMatch(/> Name/)
    expect(lastFrame()).toMatch(/^\+/)
    expect(lastFrame()).not.toMatch(/[❯┏╭]/)
  })

  it("is a plain frame with no marker outside a scope", () => {
    const { lastFrame } = render(
      <FocusRing label="Name">
        <Text>x</Text>
      </FocusRing>,
    )
    expect(lastFrame()).not.toContain("❯")
    expect(lastFrame()).toMatch(/╭/)
  })
})

describe("focusRingStyle", () => {
  it("spends the accent on focus and the dim token at rest", () => {
    const theme = createTheme({ capabilities: caps() })
    expect(focusRingStyle(theme, true).borderColor).toBe(theme.colors.accent)
    expect(focusRingStyle(theme, false).borderColor).toBe(theme.colors.dim)
    expect(focusRingStyle(theme, true).borderStyle).toBe("bold")
    expect(focusRingStyle(theme, false).borderStyle).toBe("round")
  })

  it("keeps the shape and drops the colour under NO_COLOR", () => {
    const theme = createTheme({ capabilities: caps({ colorLevel: "none" }) })
    const style = focusRingStyle(theme, true)
    expect(style.borderColor).toBeUndefined()
    expect(style.borderStyle).toBe("bold")
    expect(style.marker).toBe("❯")
  })

  it("falls back to 7-bit shapes under the ascii glyph set", () => {
    const theme = createTheme({ capabilities: caps({ unicode: false }) })
    expect(focusRingStyle(theme, true)).toMatchObject({ borderStyle: "classic", marker: ">" })
    expect(focusRingStyle(theme, false).marker).toBe(" ")
  })
})

describe("wired components listen only while focused", () => {
  const options = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
  ]

  it("Select", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { stdin } = render(
      <FocusScope>
        <Select options={options} onChange={first} />
        <Select options={options} onChange={second} />
      </FocusScope>,
    )
    await delay()
    stdin.write(DOWN)
    await delay()
    expect(first).toHaveBeenCalledWith("green")
    expect(second).not.toHaveBeenCalled()
    stdin.write(TAB)
    await delay()
    stdin.write(DOWN)
    await delay()
    expect(second).toHaveBeenCalledWith("green")
    expect(first).toHaveBeenCalledTimes(1)
  })

  it("MultiSelect", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { stdin } = render(
      <FocusScope>
        <MultiSelect options={options} onChange={first} />
        <MultiSelect options={options} onChange={second} focusId="second" autoFocus />
      </FocusScope>,
    )
    await delay()
    stdin.write(" ")
    await delay()
    expect(second).toHaveBeenCalledWith(["red"])
    expect(first).not.toHaveBeenCalled()
  })

  it("TextInput, EmailInput and PasswordInput type only into the focused field", async () => {
    const name = vi.fn()
    const email = vi.fn()
    const secret = vi.fn()
    const { stdin } = render(
      <FocusScope>
        <TextInput onChange={name} />
        <EmailInput onChange={email} />
        <PasswordInput onChange={secret} />
      </FocusScope>,
    )
    await delay()
    stdin.write("a")
    await delay()
    stdin.write(TAB)
    await delay()
    stdin.write("b")
    await delay()
    stdin.write(TAB)
    await delay()
    stdin.write("c")
    await delay()
    expect(name).toHaveBeenLastCalledWith("a")
    expect(email).toHaveBeenLastCalledWith("b")
    expect(secret).toHaveBeenLastCalledWith("c")
    expect(name).toHaveBeenCalledTimes(1)
    expect(email).toHaveBeenCalledTimes(1)
  })

  it("ConfirmInput", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { stdin } = render(
      <FocusScope>
        <ConfirmInput onConfirm={first} />
        <ConfirmInput onConfirm={second} />
      </FocusScope>,
    )
    await delay()
    stdin.write(TAB)
    await delay()
    stdin.write("y")
    await delay()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it("ScrollView, and isActive={false} still keeps it out of the order", async () => {
    const lines = Array.from({ length: 10 }, (_, i) => ({ text: `line ${i + 1}` }))
    const onConfirm = vi.fn()
    const { stdin, lastFrame } = render(
      <FocusScope>
        <Box height={3}>
          <ScrollView lines={lines} showIndicator={false} />
        </Box>
        <ScrollView lines={lines} isActive={false} />
        <ConfirmInput onConfirm={onConfirm} />
      </FocusScope>,
    )
    await delay()
    stdin.write("j")
    await delay()
    expect(lastFrame()).toMatch(/line 2/)
    expect(lastFrame()!.split("\n")[0]).toContain("line 2")
    stdin.write(TAB)
    await delay()
    stdin.write("y")
    await delay()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("UpdateBanner", async () => {
    const onConfirm = vi.fn()
    const onDecline = vi.fn()
    const { stdin } = render(
      <FocusScope>
        <ConfirmInput />
        <UpdateBanner
          name="pkg"
          current="1.0.0"
          latest="2.0.0"
          command="npm i -g pkg"
          onConfirm={onConfirm}
          onDecline={onDecline}
          focusId="banner"
        />
      </FocusScope>,
    )
    await delay()
    stdin.write(CR)
    await delay()
    expect(onConfirm).not.toHaveBeenCalled()
    stdin.write(TAB)
    await delay()
    stdin.write(CR)
    await delay()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("CommandPalette is one stop: its query field rides the palette's focus", async () => {
    const onQueryChange = vi.fn()
    const afterTyped = vi.fn()
    const Host = () => {
      const [query, setQuery] = useState("")
      return (
        <FocusScope>
          <CommandPalette
            items={[{ id: "a", title: "Alpha" }]}
            query={query}
            onQueryChange={(q) => {
              onQueryChange(q)
              setQuery(q)
            }}
            onSelect={() => {}}
            onClose={() => {}}
          />
          <TextInput onChange={afterTyped} />
        </FocusScope>
      )
    }
    const { stdin } = render(<Host />)
    await delay()
    stdin.write("al")
    await delay()
    expect(onQueryChange).toHaveBeenLastCalledWith("al")
    expect(afterTyped).not.toHaveBeenCalled()
    stdin.write(TAB)
    await delay()
    stdin.write("z")
    await delay()
    expect(afterTyped).toHaveBeenLastCalledWith("z")
    expect(onQueryChange).toHaveBeenLastCalledWith("al")
  })

  it("a field inside a FocusRing is that ring's stop, not a second one", async () => {
    const one = vi.fn()
    const two = vi.fn()
    const { stdin, lastFrame } = render(
      <FocusScope>
        <FocusRing label="One">
          <TextInput onChange={one} />
        </FocusRing>
        <FocusRing label="Two">
          <TextInput onChange={two} />
        </FocusRing>
      </FocusScope>,
    )
    await delay()
    stdin.write("x")
    await delay()
    stdin.write(TAB)
    await delay()
    expect(lastFrame()).toMatch(/❯ Two/)
    stdin.write("y")
    await delay()
    expect(one).toHaveBeenLastCalledWith("x")
    expect(two).toHaveBeenLastCalledWith("y")
  })

  it("keeps today's behaviour outside a scope", async () => {
    const onChange = vi.fn()
    const { stdin } = render(<Select options={options} onChange={onChange} />)
    stdin.write(DOWN)
    await delay()
    expect(onChange).toHaveBeenCalledWith("green")
  })
})
