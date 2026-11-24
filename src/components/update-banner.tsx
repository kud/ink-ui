import React from "react"
import { Box, Text, useInput } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import { useFocusable } from "./focus.js"

type UpdateBannerProps = {
  name: string
  current: string
  latest: string
  // The command that performs the upgrade, shown so the user can run it
  // themselves if they decline.
  command: string
  onConfirm: () => void
  onDecline: () => void
  // Set false while another component owns the keyboard.
  focused?: boolean
  /** Id for `useFocusManager().focus(id)` when inside a `FocusScope`. */
  focusId?: string
  /** Take focus first when inside a `FocusScope`. */
  autoFocus?: boolean
}

// Deliberately takes plain props rather than importing @kud/cli-update's
// UpdateNotice type: this component knows how to draw an upgrade offer, not
// where the information came from. It keeps the UI layer free of a dependency
// on the data layer, and lets a CLI use one without the other.
export const UpdateBanner = ({
  name,
  current,
  latest,
  command,
  onConfirm,
  onDecline,
  focused = true,
  focusId,
  autoFocus,
}: UpdateBannerProps) => {
  const focus = useFocusable({ id: focusId, disabled: !focused, autoFocus })
  const theme = useTheme()
  const colors = theme.colors
  const color = theme.policy.color
  useInput(
    (input, key) => {
      if (key.return || /^y$/i.test(input)) onConfirm()
      else if (key.escape || /^n$/i.test(input)) onDecline()
    },
    { isActive: focus.isFocused },
  )

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.glyphs.border}
      borderColor={colors.accent}
      paddingX={2}
      paddingY={1}
      rowGap={1}
    >
      {/* The package name leads: when several CLIs might offer an upgrade,
          which one is asking is the thing you need first. "update available"
          is the same on every banner, so it carries no information. */}
      <Box columnGap={1}>
        <Text bold color={colors.accent}>
          {name}
        </Text>
        <Text dimColor>·</Text>
        <Text dimColor>update available</Text>
      </Box>

      <Box columnGap={1}>
        <Text dimColor>{current}</Text>
        <Text dimColor>{theme.icons === "ascii" ? "->" : "→"}</Text>
        <Text bold color={colors.success}>
          {latest}
        </Text>
      </Box>

      <Box columnGap={1}>
        {/* Keycaps are fills; without colour they are brackets, so the
            letter never lands as black ink on a ground it cannot be read on. */}
        <Text
          backgroundColor={colors.accent}
          color={color ? "black" : undefined}
          bold
        >
          {color ? " Y " : "[Y]"}
        </Text>
        <Text>upgrade now</Text>
        <Text dimColor>·</Text>
        <Text backgroundColor={colors.track} color={colors.secondary}>
          {color ? " N " : "[N]"}
        </Text>
        <Text dimColor>
          later {theme.icons === "ascii" ? "-" : "—"} run {command} yourself
        </Text>
      </Box>
    </Box>
  )
}
