// The gallery's Focus page: a three-field form in one FocusScope. Tab and
// Shift+Tab walk the rings, the disabled one is skipped, and `ctrl+d` opens a
// confirm that traps Tab until it answers, then hands focus back.
import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import {
  ConfirmInput,
  FocusRing,
  FocusScope,
  Select,
  TextInput,
  useFocusManager,
} from "../index.js"

const Status = () => {
  const { focused } = useFocusManager()
  return <Text dimColor>{`focused: ${focused ?? "none"}`}</Text>
}

export const FocusDemo = ({ focused }: { focused: boolean }) => {
  const [confirming, setConfirming] = useState(false)
  const [answer, setAnswer] = useState<string | undefined>(undefined)
  useInput(
    (input, key) => {
      if (key.ctrl && input === "d") setConfirming(true)
    },
    { isActive: focused && !confirming },
  )
  return (
    <FocusScope isActive={focused}>
      <Box flexDirection="column" width={44}>
        <FocusRing label="Name" id="name" disabled={!focused}>
          <TextInput placeholder="Ada Lovelace" />
        </FocusRing>
        <FocusRing label="Plan" id="plan" disabled={!focused}>
          <Select
            options={[
              { label: "Free", value: "free" },
              { label: "Team", value: "team" },
            ]}
          />
        </FocusRing>
        <FocusRing label="Coupon" id="coupon" disabled>
          <Text dimColor>not available on this plan</Text>
        </FocusRing>
        {confirming && (
          <FocusScope trap>
            <FocusRing label="Delete this draft?" id="confirm">
              <ConfirmInput
                defaultChoice="cancel"
                onConfirm={() => {
                  setAnswer("deleted")
                  setConfirming(false)
                }}
                onCancel={() => {
                  setAnswer("kept")
                  setConfirming(false)
                }}
              />
            </FocusRing>
          </FocusScope>
        )}
        <Box marginTop={1} columnGap={2}>
          <Status />
          {answer ? <Text dimColor>{`draft ${answer}`}</Text> : null}
        </Box>
        <Text dimColor>⇥ next · ⇧⇥ back · ctrl+d confirm</Text>
      </Box>
    </FocusScope>
  )
}
