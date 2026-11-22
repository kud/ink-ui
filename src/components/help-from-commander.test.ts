import { Command, Option } from "commander"
import { describe, it, expect } from "vitest"
import { helpFromCommander } from "./help-from-commander.js"
import { renderHelp } from "./render-help.js"

const sample = () => {
  const program = new Command("deploy")
    .version("2.4.0")
    .description("ship a build to an environment.")
    .argument("<target>", "environment to deploy to")
    .argument("[files...]", "files to include")
    .option("-p, --port <number>", "port the health check listens on", "3000")
    .option("--dry-run", "print the plan without applying it")
    .option("--retries <n>", "attempts before giving up", (v) => Number(v), 3)
    .option("--no-colour", "turn colour off")
    .addOption(new Option("--secret <token>", "never shown").hideHelp())
  program.command("rollback").argument("[release]", "release to return to").summary("return to a previous release")
  program.command("status").description("show what is live")
  return program
}

describe("helpFromCommander", () => {
  it("maps name, version, description and usage", () => {
    const spec = helpFromCommander(sample())
    expect(spec.name).toBe("deploy")
    expect(spec.version).toBe("2.4.0")
    expect(spec.description).toBe("ship a build to an environment.")
    expect(spec.usage).toBe("deploy [options] [command] <target> [files…]")
  })

  it("maps visible commands with their terms and summaries", () => {
    expect(helpFromCommander(sample()).commands).toEqual([
      { name: "rollback [release]", description: "return to a previous release" },
      { name: "status", description: "show what is live" },
      { name: "help [command]", description: "display help for command" },
    ])
  })

  it("maps arguments, spelling a variadic with an ellipsis", () => {
    expect(helpFromCommander(sample()).arguments).toEqual([
      { name: "target", description: "environment to deploy to" },
      { name: "files…", description: "files to include" },
    ])
  })

  it("maps visible options and their defaults as commander would show them", () => {
    expect(helpFromCommander(sample()).options).toEqual([
      { name: "-V, --version", description: "output the version number" },
      { name: "-p, --port <number>", description: "port the health check listens on", default: "3000" },
      { name: "--dry-run", description: "print the plan without applying it" },
      { name: "--retries <n>", description: "attempts before giving up", default: "3" },
      { name: "--no-colour", description: "turn colour off" },
      { name: "-h, --help", description: "display help for command" },
    ])
  })

  it("names a subcommand by its full path and keeps the root's version", () => {
    const program = sample()
    const rollback = program.commands.find((c) => c.name() === "rollback")!
    const spec = helpFromCommander(rollback)
    expect(spec.name).toBe("deploy rollback")
    expect(spec.version).toBe("2.4.0")
    expect(spec.usage).toBe("deploy rollback [options] [release]")
  })

  it("plugs into configureHelp so helpInformation prints the shared layout", () => {
    const program = sample().configureHelp({
      formatHelp: (cmd, helper) => renderHelp(helpFromCommander(cmd, helper), { columns: 80, mode: "plain" }),
    })
    expect(program.helpInformation()).toBe(`deploy 2.4.0
Ship a build to an environment

USAGE
  deploy [options] [command] <target> [files…]

COMMANDS
  rollback [release]      Return to a previous release
  status                  Show what is live
  help [command]          Display help for command

ARGUMENTS
  target                  Environment to deploy to
  files…                  Files to include

OPTIONS
  -V, --version           Output the version number
  -p, --port <number>     Port the health check listens on (default: 3000)
      --dry-run           Print the plan without applying it
      --retries <n>       Attempts before giving up (default: 3)
      --no-colour         Turn colour off
  -h, --help              Display help for command
`)
  })
})
