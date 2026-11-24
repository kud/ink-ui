import React from "react"
import { Box, Text } from "ink"
import { useTheme } from "../theme/theme-provider.js"
import { paint } from "../theme/theme.js"

type ToggleSwitchProps = {
  on: boolean
  // Shown beside the switch. Position already says on or off, but the word
  // says it again for anyone reading in monochrome or with a screen reader.
  label?: string
  onColor?: string
  offColor?: string
}

// Powerline half-circles. They are the only way to get a genuinely rounded end
// in a terminal cell — drawn in the track's colour on the default background,
// they read as the pill's caps rather than as separate characters. Any Nerd
// Font has them; a plain font renders blanks, which degrades to a square pill
// rather than breaking the layout.
const CAP_LEFT = "\u{e0b6}"
const CAP_RIGHT = "\u{e0b4}"

// A physical switch: a coloured track with the knob at one end. Unlike Toggle
// (a dot) and Switch (a two-label slider), this is the control you reach for
// when the thing really is a single on/off — the knob's *position* carries the
// state, so colour is reinforcement rather than the only signal.
export const ToggleSwitch = ({
  on,
  label,
  onColor,
  offColor,
}: ToggleSwitchProps) => {
  const theme = useTheme()
  const onTint = paint(theme, onColor) ?? theme.colors.success
  const track = on ? onTint : (paint(theme, offColor) ?? theme.colors.muted)
  const knob = theme.glyphs.dot
  return (
    <Box columnGap={1} aria-role="checkbox" aria-state={{ checked: on }}>
      {theme.policy.color ? (
        <Text>
          <Text color={track}>{CAP_LEFT}</Text>
          <Text backgroundColor={track} color="black">
            {on ? ` ${knob}` : `${knob} `}
          </Text>
          <Text color={track}>{CAP_RIGHT}</Text>
        </Text>
      ) : (
        // No colour, no track: the caps would outline a fill that is not
        // there. The knob's position in brackets still says on or off, in the
        // same four cells.
        <Text>{on ? `[ ${knob}]` : `[${knob} ]`}</Text>
      )}
      {label !== undefined && (
        <Text color={on ? onTint : undefined} dimColor={!on}>
          {label}
        </Text>
      )}
    </Box>
  )
}
