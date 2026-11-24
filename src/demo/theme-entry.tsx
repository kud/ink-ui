// The gallery's Theme page: what the probe found and how the theme resolved
// it, then every colour role drawn in the theme's own ink.
import React from "react"
import { Box, Text } from "ink"
import { KeyValue, Pill, StatusMessage, useTheme, COLOR_ROLES } from "../index.js"

const yesNo = (value: boolean) => (value ? "yes" : "no")

export const ThemeDemo = () => {
  const theme = useTheme()
  const { policy } = theme
  return (
    <Box flexDirection="column">
      <KeyValue label="Theme" value={`${theme.name} · ${theme.background}`} />
      <KeyValue label="Depth" value={theme.colorLevel} />
      <KeyValue label="Glyphs" value={theme.icons} />
      <KeyValue
        label="Policy"
        value={`colour ${yesNo(policy.color)} · motion ${yesNo(policy.motion)} · static ${yesNo(policy.static)} · reader ${yesNo(policy.screenReader)}`}
      />
      <Box marginTop={1} flexDirection="column">
        {COLOR_ROLES.filter(
          (role) => !["track", "trackHighlight", "selection"].includes(role),
        ).map((role) => (
          <Text key={role} color={theme.colors[role]}>
            {`${theme.glyphs.bar.repeat(2)} ${role.padEnd(10)} ${theme.colors[role] ?? "—"}`}
          </Text>
        ))}
      </Box>
      <Box marginTop={1} columnGap={1}>
        <Pill variant="success">merged</Pill>
        <Pill tone="soft" variant="group">
          epic
        </Pill>
        <Pill tone="tonal" variant="accent" strong>
          12
        </Pill>
        <Pill tone="outline" variant="info">
          draft
        </Pill>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <StatusMessage variant="success">Deployed</StatusMessage>
        <StatusMessage variant="warning">Disk at 91%</StatusMessage>
      </Box>
    </Box>
  )
}
