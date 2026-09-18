# Building a CLI with @kud/ink-ui

The design-system manual, for an AI agent or a person writing a terminal UI
against this package. It carries the judgement calls the type definitions
cannot express — what the tokens mean, who owns the keyboard, what a page looks
like, why a state is never a colour. Everything else is in the types, which are
always current.

## Read the types, not a list

**The exhaustive component surface is `dist/index.d.ts`.** Read it before
reaching for anything. This file deliberately does not list what exists: a
hand-maintained inventory goes stale, and a stale inventory is worse than none
because it tells you a component is missing when it is not.

**Before writing any component, check it isn't already here.** Bordered panes,
the page frame, scrolling viewports, selectable rows, tables, tab bars,
spinners, progress bars, key/value pairs, badges, pills and footer key hints are
all provided. A hand-rolled version of one of these is the single most common
mistake in a consuming repo.

## The one rule that isn't in the types: who owns the keyboard

Components split into two kinds, and mixing them up is what produces a screen
that swallows keystrokes or responds twice.

**Uncontrolled — these call Ink's `useInput` themselves.** Mount at most one
per focus region, and gate the rest with `isDisabled` / `isActive`:

`Select` · `MultiSelect` · `TextInput` · `EmailInput` · `PasswordInput` ·
`ConfirmInput` · `ScrollView` · `UpdateBanner` · `CommandPalette`

**Presentational — everything else.** They take `active` / `value` / `on` and
render. They never listen for keys, so they compose freely and you drive them
from your own state.

**The two hooks supply that state.** `useTabs(items)` and
`useListCursor(length)` own the keyboard so you don't hand-roll it — and both
take `{ isActive }` so a screen with several focus regions can gate them.
`useTabs` binds Tab / Shift+Tab and ←→ alike, wrapping (a tab bar is a ring),
and takes `{ arrows: false }` where ←→ mean something else on that screen;
`useListCursor` clamps (a list has ends) and takes `{ wrap }` when you
genuinely want circular.

**Three keys belong to the app, never to a screen: `q`, `esc`, `backspace`.**
`useAppKeys({ onBack, onQuit, atRoot, isActive })` binds them, and it is
mounted **once, at the root**. Ink runs every active `useInput` on every key
with no order and no propagation, so "who gets `esc`" is only ever solved by
there being one claimant. `q` calls `onQuit`, which defaults to Ink's own
`exit()` and never `process.exit` — the terminal has to be restored. `esc` and
`backspace` call `onBack`, the host's *peel*: close the topmost layer you own
and return `true`, return `false` when there was nothing to pop, and `atRoot`
says what happens then — `"ignore"` by default, because a key that sometimes
quits is a key you flinch from. It is not a back stack: a host's layers are a
priority order over its own booleans (cockpit's has eight arms), and that
order stays in the host as a plain function. Pass `isActive: false` while a
text field has focus; there `q` is a letter and `backspace` deletes.

**A view exported from a `*-ink` package takes `onBack` and never binds `esc`
or `q` itself.** The host's peel routes to it. It binds only the keys that
open and close layers it pushes itself — its own overlay, its own expanded
row — and nothing the app already owns. Otherwise the mounted view and the
root hook both fire on the same `esc`, and the user goes back two levels for
one keystroke.

**Never write `useInput` to move a cursor, switch a tab, or leave.** That is
what the hooks are for, and hand-rolling it is how arrow keys, `esc` and `q`
end up behaving differently on every screen.

## The keys contract

This is the contract every `@kud` TUI honours, verbatim, so a user moving
between them never relearns "how do I leave":

> `q` quits from anywhere, at any depth, no confirmation; never "close the
> overlay", never "back". `ctrl+c` likewise. Inside a focused text input `q`
> types and `backspace` deletes — the input owns the keyboard, `esc` blurs it
> and keeps the value. `esc` and `backspace` are synonyms for **back exactly
> one level**: input focus → overlay → screen → main. At the main page `esc`
> does nothing — not quit, not clear-the-filter: a layer is something you
> *pushed*, a filter is something you *set*, and back pops layers, never edits
> settings. `?` opens the legend as an overlay everywhere. Only one thing
> listens at a time.

`TextInput` already does its half: `onCancel` fires on `esc` and the value is
kept, so a search box no longer needs a `useInput` of its own to close.

## The page: six bands, one frame

Every screen of an app — list, detail, loading, error, prompt — sits in the
same frame, so the border and the title row never come and go between states.
`Page` draws it and binds no keys, which is what lets a host take the frame
before (or without) taking the hook. Six bands inside one round border:

1. **Title row** — the cockpit's, made general. The app's glyph and name,
   bold in the accent; the count dim, padded in front so the header never
   shuffles as it changes (`  127 items  ·  `); `@user` plain, never dim —
   scope is the one fact this row exists to state; a further `scope` dim; an
   `alert` bold in the accent (red when `critical`) for something to act on
   today; a `status` that is news (`● 5 new · 38 moved · r apply`, bold
   accent), busy (`↻ refreshing…`, info) or quiet (`updated 42m ago`, dim);
   then a dotted rule `╌` in dim info to the edge, which absorbs whatever
   width the status gains or loses. Constant across every page of the app.
   That is how you know which app you are in and how stale it is, and
   neither changes when you open an item.
2. **Blank row** — where search lives when it is open.
3. **Tabs** — only on pages that have them. A detail page passes none and the
   band is dropped, never left empty.
4. **Body** — whatever the page is for.
5. **Counter** — right-aligned, dim: `3 of 12`, `↓ 40%`.
6. **Hints** — the footer, in the order below.

A root page:

```
╭──────────────────────────────────────────────────────────────────╮
│ ◆ Jira   12 items  ·  @you  updated 2m ago  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                  │
│  To do (4)  In progress (6)  Done (2)                            │
│             ───────────────                                      │
│                                                                  │
│  ── SHOP-300 Checkout ──                                         │
│  ❯ ▲ SHOP-312  Retry a declined card               bug   3d      │
│      SHOP-318  Address form loses its state        task  1w      │
│  ── SHOP-410 Search ──                                           │
│    ▼ SHOP-412  Typo in the empty state             task  2w      │
│                                                                  │
│                                                        3 of 12   │
│  ↑↓ move  ⏎ open  o browser  ⇥ tab  / search  ? help  q quit     │
╰──────────────────────────────────────────────────────────────────╯
```

A nested page keeps the app's title row; the item's key becomes the body's
first header and the facts gain a breadcrumb, so freshness survives to the
moment the user acts:

```
╭──────────────────────────────────────────────────────────────────╮
│ ◆ Jira   SHOP-312 · 3 of 12  updated 2m ago  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                  │
│  ▲ SHOP-312  Retry a declined card                       bug     │
│                                                                  │
│  Status     In progress                                          │
│  Assignee   @you                                                 │
│  Updated    3d ago                                               │
│                                                                  │
│  A card the issuer declines is shown as a network error, so the  │
│  customer retries a card that will never go through…             │
│                                                        ↓ 40%     │
│  ↑↓ scroll  o browser  ⌫ back  ? help  q quit                    │
╰──────────────────────────────────────────────────────────────────╯
```

In code that is `<Page icon title count user scope status tabs counter hints page="nested">`
around the body; `PAGE_CHROME` is the four lines the frame spends around the
body (two borders, the title row, the blank under it) — subtract it, plus the
tab band and the footer rows you use, when sizing a body to the terminal.
`Panel` stays for inner regions inside `Columns`.

## The footer, in order

Hints read left to right in one fixed order, so the eye learns the tail once
and finds it on every page of every app:

| Position | Cells | Where |
| --- | --- | --- |
| 1 | Navigation — `↑↓ move`, `⏎ open` | every page |
| 2 | Page actions — cap three; the rest live in `?` | every page |
| 3 | Mode switches — `⇥ tab`, `/ search` | main page only |
| 4 | `⌫ back` | nested pages and overlays only, never on main |
| 5 | `? help` | every page with a legend |
| 6 | `q quit` | every page, always last |

`Page` passes `page` and `help` through to `FooterHints`, which appends the
last three from `tailHints(page, help)`. A host passes only its own hints —
navigation, actions, modes — and never those three, so the tail cannot drift
between apps. `⌫` is shown, `esc` implied.

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
| A launcher — type, pick a row, Enter runs it | `CommandPalette`, mounted as the topmost layer with `useAppKeys` stood down; hand `fuzzyFilter` to `onQueryChange` for a fixed command tree, or derive `items` from the query yourself |
| A persistent key-hints footer | `FooterHints` with `Hint` tuples: `[["↑↓", "move"], ["q", "quit"]]` |
| Label/value detail rows | `KeyValue` with a shared `labelWidth` so values align |
| A category label — `epic`, `draft` — that should read as one object | `Pill`, filled and rounded; `Badge` for the bracket form. Never for a reference the reader follows |
| Transient feedback | `StatusMessage` (inline) · `Alert` (boxed, with title) · `Toast` (self-dismissing) |
| App chrome | `Page` as the frame of every screen, with `useAppKeys` once at the root; `Banner` at the top of a non-paged CLI, `Header` per section, `LoadingScreen` while booting |

Composing a domain component on top of these is right and expected — wrapping
`Table` to render your own row shape is the system working. Reimplementing
`Table` is not.

## Colour: what the tokens mean

**Colour comes from tokens, never from a string literal.** Import `colors` and
use it. A literal like `color="orange"` or `color="#FF8C00"` is wrong even when
it renders identically — it breaks the moment a token moves.

```ts
import { colors, softColors, spacing } from "@kud/ink-ui"
// colors: accent · secondary · muted · success · error · warning · info · group
// softColors: the same seven minus secondary, as quiet measured fills
// spacing.xs 1 · sm 2 · md 3 · lg 4
```

Eight tokens: seven semantic hues, each with a soft twin, plus one text tier.
Each answers a different question, and picking by "what looks right" is how
two of them end up doing one job.

- **The default foreground is the answer.** No token. The row's title, the
  value in a key/value pair, the number the screen exists to show.
- **`accent`** (`#FF8C00`, the one brand hex) says *here* — the active tab's
  label and its underline, the focused thing, the app's own mark. One `accent`
  per region: two on a row fight, which is why `group` is deliberately not the
  accent hue.
- **`secondary`** (`#999999`) is the third neutral, text that is *context
  rather than the answer* — a row's labels beside its title — and must read as
  its own tier. The default foreground is the answer, `muted` is furniture, and
  a middle tier drawn in either of those is not "quiet", it is absent: on a
  dark ground `dimColor` inks at L* 50 and the eye files it with the age
  column. It is a hex because the tier only exists as a measured step, tuned to
  the dark ground every consumer already commits to. It has no soft twin
  because it is never a fill.
- **`muted`** is furniture — what `dimColor` renders: the frame, hint labels,
  facts, the counter, an age. Everything the reader may skip.
- **`success` · `error` · `warning` · `info`** are verdicts and events, and
  they never travel alone: `StatusMessage` and `Alert` pair each with its
  glyph (`✓` `✗` `⚠` `ℹ`) because the shape is the channel and the hue only
  reinforces it.
- **`group`** is the container of the rows beneath it — an epic heading, a
  fence over children that live elsewhere.

`softColors` is the seven semantic ones desaturated and darkened so white ink
reads on all of them against a dark ground, measured for a deutan/protan
reader. Only `Pill tone="soft"` should reach for it. Named ANSI colours adapt
to the user's theme; the hexes exist where a fixed, measured contrast is the
whole point.

The one exception to the token rule is `<Pill color>`, for a state an external
system **invented** and whose colour is its vocabulary — GitHub's merged
purple, a CI provider's result colours. Never for that system's *skin*: Jira
paints its issue types, but a type is a classification and takes a `variant`
chosen by meaning. The test is whether the hue names a state the reader already
knows from the source, or merely decorates a category the tokens can already
say. The pill inks itself against whatever fill it is given, so a caller never
picks a foreground.

## Pill: solid says something happened, soft says what it is

The law in one line: **the column says where it sits, soft says what it is,
solid says something happened.**

- **`tone="solid"`** is an *event* — `merged`, a fresh arrival, a removal. It
  earns its loud fill by being news. The default, so nothing already rendered
  moves.
- **`tone="soft"`** is a *classification* — `epic`, `bug`, `task`. A quiet,
  permanent fill from `softColors`, built to sit on every row without
  out-shouting the one row that has news.
- **`tone="outline"`** is the same classification as a hue-only ring, for a
  ground where even a soft block is too much.

A screen where every pill is solid has no way to say which pill is the news.
And a pill is for a word that *is* the information; a reference the reader
follows — a ticket key, a repo — stays dim text, because a fill gives a
breadcrumb a weight it has not earned, and once everything is a pill none of
them is. `pillWidth(text)` prices a pill before you lay out a fixed-width row:
label plus two caps.

## State is never signalled by colour alone

**Every state carries a glyph, a word or a weight as well as its colour.** A
colourblind reader cannot see the hue, a piped terminal has no colour at all,
and a test frame carries no escape codes — so a state that lives only in a
tint is a state nobody can test for. `SelectableRow` marks the active row with
`❯` *and* bold; `Tabs` marks the active tab by the presence of its underline,
not its hue; `Panel` gains a ● when focused; every `StatusMessage` leads with
its glyph; a pill's word carries the meaning. Hold that line in anything you
add.

Two worked examples from real boards:

- **Opposing marks need distinct shape *and* hues from different bins.** A
  Jira row's priority is `▲` above normal, `▼` below, nothing for normal. The
  shapes are the channel, but two arrows painted in the same colour still read
  as "a mark" at row-scan speed, and red/green collapses for a deutan reader.
  So up takes a warm hue and down a cool one, both on a lightness step that
  clears the row text. Shape for the reader who cannot see hue; hue-bin so the
  pair does not merge for the eye that is moving.
- **`behind` is a word, and the bright one.** When an epic's status trails its
  children — still To do with a child started — its trailing note reads
  `behind · 1 In progress`, the word bright and the rest dim. A word rather
  than a glyph, because the one-column glyphs that survive a monospace grid are
  few and already mean something else. Bright rather than red, because it is
  the one thing on the row the reader must not miss, which is the next rule.

## Emphasis follows importance

**Dim means "you may skip this". The answer is the brightest thing on the
row.** A caveat, a unit, an age, a source: `muted`. A count, a verdict, a
version, the word `behind`: default foreground or bold. Getting this backwards
is worse than no styling at all — a flat wall of text is merely flat, whereas
an inverted hierarchy points the eye away from the answer. So a status note
that is mostly furniture keeps its one load-bearing word bright, a facts
segment stays dim beside a bold app name, and a counter never outshines the
row it counts.

## House rules

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
- **`esc` with two claimants goes back two levels.** With a `TextInput`
  focused, its `onCancel` and the root `useAppKeys` both hear the same `esc`
  unless the hook is given `isActive: false` for the duration. Blur the input
  in `onCancel`, let the hook stand down while it is focused, and one keystroke
  does one thing.
- **Check `key.backspace` and `key.delete` together.** The Backspace key sends
  DEL (127) on a Mac and BS (8) elsewhere; Ink 7.1 maps both to `backspace`,
  but older terminals and older Ink report DEL as `delete`. `useAppKeys` and
  `TextInput` check both flags, and a hand-rolled handler that checks one
  works on one keyboard and not another.
- **`Table` needs `maxWidth`** when it sits inside a bordered `Panel` or
  `Page`, or the columns size against the terminal rather than the pane.
- **`Toast` returns `null` once it has expired** — it unmounts itself, so don't
  rely on it holding layout space.
- **`useTabs` returns `active` as possibly `undefined`** when the item list is
  empty. Guard before indexing.
- **Give every tab a marker of the same width, or none.** A marker on one tab
  alone shifts every tab after it, and a bar that moves when news arrives is a
  bar you have to re-find.

## Testing a component

Every component renders a real Ink tree under `ink-testing-library`, and the
shape of a test is the same each time:

```tsx
const { lastFrame, stdin } = render(<Host />)
stdin.write("q")                     // or String.fromCharCode(27) for esc
await new Promise((r) => setTimeout(r, 60))   // Ink handles input async
expect(lastFrame()).toMatch(/⌫ back.*\? help.*q quit/)
```

Drive keys through `stdin.write` and wait a beat before asserting — Ink
processes input on its own tick, and a synchronous `expect` reads the frame
from before the key landed. Assert on what the frame *shows*: the glyph, the
word, the order of the cells. The runner is not a TTY, so the frame carries no
escape codes and a colour choice is unobservable — which is the accessibility
rule enforcing itself, since a state you cannot test for is a state that lived
only in a tint. Where a colour decision genuinely has to be asserted, export the
pure function that makes it and test that, as `Pill` does with its ink picker.

Unmounting is global: `src/test-setup.ts` registers ink-testing-library's own
`cleanup` in `afterEach`, so a component holding a timer cannot leak into the
next test and nobody has to remember it per file. `src/test-setup.test.tsx`
fails if that line is removed. Workers are capped at four in
`vitest.config.ts` for a reason recorded there — a suite that silently fails
to start a third of its files looks exactly like one that passed.

## Working on this repo

If you are editing ink-ui itself rather than building with it: components stay
presentational unless they are in the uncontrolled list above, every new
component needs a `.test.tsx` beside it, and the public surface is whatever
`src/index.ts` exports — a component not exported there does not exist.
`npm run demo` renders the gallery. Run `npm run typecheck`, `npm test`,
`npm run build` and `npm run check:agents` before committing; the last one
fails the moment this file cites a symbol the index does not export, so cite
nothing before it ships.
