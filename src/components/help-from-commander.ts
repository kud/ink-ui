import type { Argument, Command, Help as CommanderHelp, Option } from "commander"
import type { HelpRow, HelpSpec } from "./help-layout.js"

// Commander is an optional peer: only its types are imported, and everything
// read here is public API on the objects the caller already holds.

/** A string default reads as itself; anything else as commander would print it. */
const showValue = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value))

const optionDefault = (option: Option): string | undefined => {
  if (option.defaultValue === undefined) return undefined
  // Commander's own rule: a value-taking option always shows its default, a
  // boolean flag only a boolean one, so `--no-colour` never says "true".
  const shown =
    option.required || option.optional || (option.isBoolean() && typeof option.defaultValue === "boolean")
  if (!shown) return undefined
  return option.defaultValueDescription || showValue(option.defaultValue)
}

const argumentDefault = (argument: Argument): string | undefined =>
  argument.defaultValue === undefined
    ? undefined
    : argument.defaultValueDescription || showValue(argument.defaultValue)

/** Commander spells a variadic `<files...>`; the layout spells it `<files…>`. */
const ellipsis = (term: string): string => term.replace(/\.\.\.(?=[>\]])/g, "…")

const row = (name: string, description: string | undefined, def: string | undefined): HelpRow => ({
  name,
  ...(description ? { description } : {}),
  ...(def !== undefined ? { default: def } : {}),
})

/**
 * Map a commander command onto the shared help input: name, version,
 * description, usage, visible subcommands, arguments and options, defaults
 * included. Examples, environment and see-also are not commander concepts —
 * spread the result and add them.
 *
 * ```ts
 * program.configureHelp({
 *   formatHelp: (cmd, helper) => renderHelp(helpFromCommander(cmd, helper)),
 * })
 * ```
 */
export const helpFromCommander = (cmd: Command, helper: CommanderHelp = cmd.createHelp()): HelpSpec => {
  const path: string[] = []
  let root: Command | null = cmd
  for (let at: Command | null = cmd; at; at = at.parent) {
    path.unshift(at.name())
    root = at
  }
  const version = root?.version()
  const spec: HelpSpec = {
    name: path.join(" "),
    ...(version ? { version } : {}),
    ...(cmd.description() ? { description: cmd.description() } : {}),
    usage: ellipsis(helper.commandUsage(cmd)),
  }
  const commands = helper
    .visibleCommands(cmd)
    .map((sub) => row(ellipsis(helper.subcommandTerm(sub)), sub.summary() || sub.description(), undefined))
  const args = helper
    .visibleArguments(cmd)
    .map((arg) => row(arg.name() + (arg.variadic ? "…" : ""), arg.description, argumentDefault(arg)))
  const options = helper
    .visibleOptions(cmd)
    .map((opt) => row(ellipsis(opt.flags), opt.description, optionDefault(opt)))
  if (commands.length) spec.commands = commands
  if (args.length) spec.arguments = args
  if (options.length) spec.options = options
  return spec
}
