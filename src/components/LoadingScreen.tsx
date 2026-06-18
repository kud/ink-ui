import React from "react"
import { Box } from "ink"
import { Spinner } from "./Spinner.js"

type LoadingScreenProps = {
  label: string
}

export const LoadingScreen = ({ label }: LoadingScreenProps) => (
  <Box padding={1}>
    <Spinner label={label} />
  </Box>
)
