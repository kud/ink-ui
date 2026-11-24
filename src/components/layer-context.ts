import { createContext } from "react"

/**
 * The contexts the layer stack shares with the rest of the package, in their
 * own module so `useAppKeys` and the key registry can read them without
 * importing the host.
 */

/** How many layers are open above the main tree. 0 outside a `LayerHost`. */
export const LayerDepthContext = createContext(0)

/**
 * Which level a component sits on: 0 for the main tree, n for the nth layer
 * from the bottom. A component is on top — the one place keys go — when its
 * level equals the depth.
 */
export const LayerLevelContext = createContext(0)
