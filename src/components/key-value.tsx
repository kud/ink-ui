import React from "react"
import { Box, Text } from "ink"

type KeyValueProps = {
  label: string
  value: React.ReactNode
  labelWidth?: number
}

const isTextValue = (value: React.ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number"

export const KeyValue = ({ label, value, labelWidth = 12 }: KeyValueProps) => (
  <Box>
    <Box width={labelWidth}>
      <Text dimColor>{label}</Text>
    </Box>
    {isTextValue(value) ? <Text>{value}</Text> : value}
  </Box>
)
