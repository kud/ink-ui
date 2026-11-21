import { definitions, note, result, section, text } from "./model.js"
import type { OutputBlock, OutputDocument } from "./model.js"

export type HelpEntry = {
  /** What the reader types: `deploy <env>`, `-f, --force`. */
  name: string
  summary: string
}

export type HelpSpec = {
  /** The program, as typed: `acme`, or `acme deploy` for a subcommand's help. */
  name: string
  summary?: string
  /** Usage lines, verbatim and unwrapped; each is shown after the program name is already in it. */
  usage?: string[]
  commands?: HelpEntry[]
  arguments?: HelpEntry[]
  options?: HelpEntry[]
  /** Example invocations, verbatim. */
  examples?: string[]
  /** Closing pointers: where the docs live, how to report a bug. */
  notes?: string[]
}

/**
 * A `--help` page built from the same primitives as every other result, so it
 * renders styled, plain or as JSON like the rest. It takes a description, not
 * a parser: whichever argument parser a command uses, it hands the names and
 * summaries here. Sections with nothing in them are left out, never drawn empty.
 */
export const help = (spec: HelpSpec): OutputDocument => {
  const blocks: OutputBlock[] = []
  if (spec.summary) blocks.push(text(spec.summary))
  if (spec.usage?.length) blocks.push(section("Usage", [text(spec.usage.join("\n"), { wrap: false })]))
  const table = (title: string, entries: HelpEntry[] | undefined) => {
    if (entries?.length) blocks.push(section(title, [definitions(entries.map((e) => [e.name, e.summary]))]))
  }
  table("Commands", spec.commands)
  table("Arguments", spec.arguments)
  table("Options", spec.options)
  if (spec.examples?.length) blocks.push(section("Examples", [text(spec.examples.join("\n"), { wrap: false })]))
  if (spec.notes?.length) blocks.push(...spec.notes.map(note))
  return result({ title: spec.name, blocks })
}
