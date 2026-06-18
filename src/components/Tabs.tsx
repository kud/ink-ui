import React from "react"
import { Box, Text } from "ink"
import { colors } from "../tokens.js"

export type TabItem<T extends string = string> = {
  value: T
  label: string
  count?: number
}

type TabsProps<T extends string> = {
  active: T
  items: TabItem<T>[]
}

export const Tabs = <T extends string>({ active, items }: TabsProps<T>) => (
  <Box gap={2}>
    {items.map((item) => {
      const isActive = item.value === active

      return (
        <Box key={item.value}>
          <Text
            bold={isActive}
            color={isActive ? colors.info : undefined}
            dimColor={!isActive}
          >
            {item.label}
          </Text>
          {item.count !== undefined && (
            <Text color={isActive ? colors.info : undefined} dimColor={!isActive}>
              {" (" + item.count + ")"}
            </Text>
          )}
        </Box>
      )
    })}
  </Box>
)
