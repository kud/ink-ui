// Guards the one rot mode that actively misleads: AGENTS.md recommending a
// component that has been renamed or removed. It checks names, never advice —
// whether the guidance is still wise is a human's call.

import { readFileSync } from "node:fs"

const INK_OWNED = new Set(["Box", "Text", "useInput"])

const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8")
const exported = new Set(source.match(/\b[A-Za-z][A-Za-z0-9]*\b/g) ?? [])

const guidance = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8")
const cited = [...guidance.matchAll(/`([^`\n]+)`/g)].map(([, name]) => name)

const isSymbol = (name) => /^(?:[A-Z][A-Za-z0-9]*|use[A-Z][A-Za-z0-9]*)$/.test(name)
const missing = [
  ...new Set(cited.filter(isSymbol).filter((name) => !INK_OWNED.has(name) && !exported.has(name))),
]

if (missing.length) {
  console.error(`AGENTS.md cites symbols that src/index.ts does not export:\n  ${missing.join("\n  ")}`)
  process.exit(1)
}

console.log(`AGENTS.md is honest — every cited symbol is exported.`)
