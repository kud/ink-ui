// The one-shot output entry point: `@kud/ink-ui/output`. Kept apart from the
// main entry so a command that only prints never loads React or Ink.
export {
  result,
  section,
  text,
  note,
  keyValue,
  definitions,
  list,
  status,
  success,
  info,
  warning,
  error,
  empty,
} from "./model.js"
export type { OutputBlock, OutputDocument } from "./model.js"
export { renderOutput, resolveOutput, writeOutput, wrap } from "./render.js"
export type { OutputTarget, RenderOptions, OutputContext } from "./render.js"
export { help } from "./help.js"
export type { HelpSpec, HelpEntry } from "./help.js"
export { setIconMode, getIconMode } from "../icon-mode.js"
export type { StatusVariant } from "../components/status-variants.js"
