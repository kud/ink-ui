# Building a CLI with @kud/ink-ui

Guidance for an AI agent writing a terminal UI against this package. It carries
the judgement calls the type definitions cannot express — everything else is in
the types, which are always current.

## Read the types, not a list

**The exhaustive component surface is `dist/index.d.ts`.** Read it before
reaching for anything. This file deliberately does not list what exists: a
hand-maintained inventory goes stale, and a stale inventory is worse than none
because it tells you a component is missing when it is not.

**Before writing any component, check it isn't already here.** Bordered panes,
scrolling viewports, selectable rows, tables, tab bars, spinners, progress
bars, key/value pairs, badges, pills and footer key hints are all provided. A
hand-rolled version of one of these is the single most common mistake in a
consuming repo.

## The one rule that isn't in the types: who owns the keyboard

Components split into two kinds, and mixing them up is what produces a screen
that swallows keystrokes or responds twice.

**Uncontrolled — these call Ink's `useInput` themselves.** Mount at most one
per focus region, and gate the rest with `isDisabled` / `isActive`:

`Select` · `MultiSelect` · `TextInput` · `EmailInput` · `PasswordInput` ·
`ConfirmInput` · `ScrollView` · `UpdateBanner`

**Presentational — everything else.** They take `active` / `value` / `on` and
render. They never listen for keys, so they compose freely and you drive them
from your own state.

**The two hooks supply that state.** `useTabs(items)` and
`useListCursor(length)` own the keyboard so you don't hand-roll it — and both
take `{ isActive }` so a screen with several focus regions can gate them.
`useTabs` wraps by default (a tab bar is a ring); `useListCursor` clamps (a
list has ends) and takes `{ wrap }` when you genuinely want circular.

**Never write `useInput` to move a cursor or switch a tab.** That is what the
hooks are for, and hand-rolling it is how arrow/vim keys end up behaving
differently on every screen.

## Reaching for the right composition

| You need | Compose |
| --- | --- |
| A scrolling list of selectable rows | `useListCursor` + `SelectableRow`, one row per item |
| A long scrollable text/log region | `ScrollView` with `StyledLine[]` — it owns its own scroll keys |
| A tab bar | `useTabs` + `Tabs` — the hook holds `active`, the component renders it |
| Tabular data with aligned columns | `Table` with a `Column[]` spec — do not lay out columns by hand |
| Two or more side-by-side regions | `Columns`, and `Panel` for each region that needs a border |
| A focusable bordered region | `Panel` with `focused` — the border brightens and the title gains a ● marker |
| One-off prompt for a value | `TextInput` / `EmailInput` / `PasswordInput` / `ConfirmInput` |
| Pick one / pick many from a list | `Select` / `MultiSelect` — these own their keyboard, unlike `SelectableRow` |
| A persistent key-hints footer | `FooterHints` with `Hint` tuples: `[["↑↓", "move"], ["q", "quit"]]` |
| Label/value detail rows | `KeyValue` with a shared `labelWidth` so values align |
| A category label — `epic`, `draft` — that should read as one object | `Pill`, filled and rounded; `Badge` for the bracket form. Never for a reference the reader follows |
| Transient feedback | `StatusMessage` (inline) · `Alert` (boxed, with title) · `Toast` (self-dismissing) |
| App chrome | `Banner` at the top, `Header` per section, `LoadingScreen` while booting |

Composing a domain component on top of these is right and expected — wrapping
`Table` to render your own row shape is the system working. Reimplementing
`Table` is not.

## House rules

**Colour comes from tokens, never from a string literal.** Import `colors` and
use it. There are six tokens and only `accent` is a hex value — the rest are
named ANSI colours that adapt to the user's terminal theme:

```ts
import { colors, spacing } from "@kud/ink-ui"
// colors.accent "#FF8C00" · muted · success · error · warning · info
// spacing.xs 1 · sm 2 · md 3 · lg 4
```

A literal like `color="orange"` or `color="#FF8C00"` is wrong even when it
renders identically — it breaks the moment a token moves.

The one exception is `<Pill color>`, for a surface mirroring an external
system whose colours ARE its vocabulary — GitHub's merged purple, a CI
provider's result colours. The test is whether the hue is a **fact about the
thing being labelled**; a colour picked because it looks right is still a token
job. The pill inks itself against whatever fill it is given, so a caller reaching
for this never picks a foreground.

**State is never signalled by colour alone.** Every status carries a shape, a
glyph or a weight as well, because a colourblind reader cannot see the hue and
a piped terminal has no colour at all. `SelectableRow` marks the active row
with `❯` *and* bold, not just a tint. Hold that line in anything you add.

**Set the icon mode once, before the first render.** `setIconMode("nerd")`
swaps in Nerd Font glyphs; the default `"text"` is safe everywhere. Components
read it at render time, so calling it after mounting does nothing.

**There is no theme provider and no context.** Components take only the props
they need. Do not build a provider to pass tokens around — import them.

**ESM only.** `import`, never `require`. Node ≥ 20, with `ink` ≥ 7 and
`react` ≥ 19 as peer dependencies the consuming project installs itself.

## Traps

- **A row that overflows its container compresses every flexible child.** If a
  gutter or marker column must hold its width, wrap it in `<Box flexShrink={0}>`.
  This only bites on content long enough to overflow, so it survives short test
  fixtures and breaks in real use.
- **`Table` needs `maxWidth`** when it sits inside a bordered `Panel`, or the
  columns size against the terminal rather than the pane.
- **`Toast` returns `null` once it has expired** — it unmounts itself, so don't
  rely on it holding layout space.
- **`useTabs` returns `active` as possibly `undefined`** when the item list is
  empty. Guard before indexing.

## Working on this repo

If you are editing ink-ui itself rather than building with it: components stay
presentational unless they are in the uncontrolled list above, every new
component needs a `.test.tsx` beside it, and the public surface is whatever
`src/index.ts` exports — a component not exported there does not exist.
`npm run demo` renders the gallery. Run `npm run typecheck`, `npm test` and
`npm run build` before committing.
