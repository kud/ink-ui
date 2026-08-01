import React from "react"
import { Box, Text, useInput } from "ink"
import { colors } from "../tokens.js"

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
}: UpdateBannerProps) => {
  useInput(
    (input, key) => {
      if (key.return || /^y$/i.test(input)) onConfirm()
      else if (key.escape || /^n$/i.test(input)) onDecline()
    },
    { isActive: focused },
  )

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.accent}
      paddingX={2}
      paddingY={1}
      rowGap={1}
    >
      <Box columnGap={1}>
        <Text bold color={colors.accent}>
          Update available
        </Text>
        <Text dimColor>{name}</Text>
      </Box>

      <Box columnGap={1}>
        <Text dimColor>{current}</Text>
        <Text dimColor>→</Text>
        <Text bold color={colors.success}>
          {latest}
        </Text>
      </Box>

      <Box columnGap={1}>
        <Text backgroundColor={colors.accent} color="black" bold>
          {" Y "}
        </Text>
        <Text>upgrade now</Text>
        <Text dimColor>·</Text>
        <Text backgroundColor="#2b323d" color="#8fa3ad">
          {" N "}
        </Text>
        <Text dimColor>later — run {command} yourself</Text>
      </Box>
    </Box>
  )
}
