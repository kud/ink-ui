# Changelog

All notable changes to this project are documented here.

---

## 0.30.0 — 2026-09-18

### Highlights

- **`CommandPalette` adds a launcher primitive** — a query line over rows, one cursor, `⏎` runs the row under it, `esc` closes. Rows are grouped under a header while the query is empty and flatten to a plain hit list the moment typing starts, since a header is only useful before the reader has said what they want. It's dumb by design: the palette holds no query state and does no filtering itself, so the same component serves a host narrowing a fixed command tree and a host that derives rows from the query instead (a ticket key becoming two verbs). A `message` draws one muted line in place of the rows for "nothing found" or "not configured" — never a row, so the cursor can't land on it — and `label` lets a row draw richer than its plain `title` (a ticket key in the accent beside a destination word) while `title` still owns matching. A reserved one-cell `marker` keeps every row's title aligned the moment any row has one. It's uncontrolled only in the keyboard sense — typing, cursor movement and `esc` are handled internally — and it's meant to be mounted as the topmost layer with the host's `useAppKeys` stood down, or `esc` will close the palette and step the app back a level in the same keystroke.
- **`fuzzyFilter(items, query)` ships as a pure helper** for the fixed-tree half of that split — substring hits rank above subsequence hits (`cfg` still finds `config`), because a verbatim match is what the reader typed on purpose. Hand it straight to `onQueryChange` and a static command list needs no filtering logic of its own. `PaletteItem` is exported alongside both. ([46bf748](https://github.com/kud/ink-ui/commit/46bf748d39e6d88c1870645e1fed2b16d1d02d34))

---

## 0.29.0 — 2026-09-15

### Highlights

- **`useTabs` binds ←→ alongside Tab / Shift+Tab, wrapping in both directions exactly as Tab does** — every consumer that wanted arrow navigation had been hand-binding it, and the five hand-rolled versions had already drifted: two wrapped, two clamped, one toggled, and one screen's footer advertised `←→ section` while binding nothing at all. A new `arrows?: boolean` option (default `true`) stands the arrows down on a screen where ←→ already mean something else. `AGENTS.md` and the README are updated to match. **Upgrade note:** a consumer still hand-binding ←→ itself will now fire twice per press until that binding is dropped. ([74c4538](https://github.com/kud/ink-ui/commit/74c4538194ef6c62a7b15e7e21c2050734be4767))

---

## 0.28.2 — 2026-09-14

### Highlights

- **`Page` takes `gap={false}`** for a body that draws the blank under the title itself — a board whose search box lives in that band — so the two blanks no longer overflow the frame. ([7a33e67](https://github.com/kud/ink-ui/commit/7a33e67665fb714480797ab657e1645c7b6b5142))

---

## 0.28.1 — 2026-09-14

### Highlights

- **`Page` measures its title row in columns.** A two-cell glyph in the brand made the dotted rule one cell too long, so the row wrapped and pushed the body out of the frame. `PageStatus` is exported. ([b15d438](https://github.com/kud/ink-ui/commit/b15d438123aabd8fc99be2f02bc2a0543837f9e8))

---

## 0.28.0 — 2026-09-14

### Highlights

- **`Page`'s title row is the cockpit's, made general.** Brand bold in the accent; `count` dim and padded in front so the header never shuffles; `user` plain (`@kud`); `scope` dim; `alert` bold accent (red when `critical`); a `status` that is news (bold accent), busy (info) or quiet (dim); then a dotted `╌` rule to the edge that absorbs the status's changing width. `facts` stays for a host with nothing structured to say. ([92fe8e2](https://github.com/kud/ink-ui/commit/92fe8e220453e73f6d2d21f61889dd0267d0b6b9))

---

## 0.27.0 — 2026-09-14

### Highlights

- **`useAppKeys` gives every `@kud` TUI the same three app-level keys, mounted once at the root instead of re-implemented per screen.** `q` quits, `esc`/`backspace` step back one level by calling the host's `onBack` for a single "peel" rather than closing everything at once, and `atRoot` tells the hook whether there's nowhere left to peel to — so backing out of the last screen quits instead of doing nothing. The hook goes quiet while an input has focus (`isActive`), so a `q` typed into a text field lands in the field, not the app's face. A single claimant for these keys is the whole point: without it, every screen that wants "esc goes back" ends up wiring its own `useInput`, and two screens racing for the same key is how you get a double-back that skips past where the user meant to land.
- **`Page` is the one frame every screen now sits inside** — a title row (icon, name, contextual facts), an optional tabs band, the body, a right-aligned counter, and the hint line, assembled from the same `PAGE_CHROME` constants so no two screens drift a column apart. It's presentational only: `Page` lays out what it's given and binds no keys itself, `useAppKeys` still owns those — so a screen picks up the frame without inheriting an opinion about what its own keys should do.
- **`FooterHints` takes a `page: "root" | "nested"` and a `help` flag**, and derives the trailing `⌫ back · ? help · q quit` cluster itself instead of every caller spelling it out — `back` only appears when `page` is `"nested"`, since a root screen has nowhere to back to. The derivation is exported as `tailHints` for anyone assembling a hint line by hand.
- **`TextInput` gains `onCancel`, fired on `esc` with the field's value left untouched** — the piece `useAppKeys`'s focus-awareness needs to make sense: an input can now say what "back" means while it holds focus, rather than swallowing the key with nothing to show for it.
- **`AGENTS.md` is rewritten as the design-system manual, for agents and humans alike** — the token list and what each one means, `Pill`'s tone/variant registers, the rule that state is never carried by colour alone, emphasis following importance, the six-band page anatomy with worked mocks, the keys contract this release establishes, the footer's hint ordering, and how to test any of it. ([f217447](https://github.com/kud/ink-ui/commit/f217447fdf4bb3c36c36ebd2c58fb3401eaf8205))

---

## 0.26.0 — 2026-09-11

### Highlights

- **`colors.secondary` (`#999999`) joins the token set as a third neutral, for text that's context rather than the answer — a row's labels sitting beside its title.** A middle tier drawn from `dimColor`/`muted` isn't quiet, it's absent: on a dark ground `dimColor` inks at L\* 50, and the eye files it with whatever's already faint on the row — the age column, the furniture — rather than reading it as its own tier. `#999999` sits at L\* 63, 5.9:1 against `#1c1c28`, 13 L\* above that faint floor — enough to read as a deliberate step rather than a rendering wobble (`#888888`, only 7 L\* above, doesn't clear that bar). Hex rather than an ANSI name, because the tier exists only as a measured step, not as a colour a terminal theme happens to already have a name for. `AGENTS.md`'s token list is updated to match — eight tokens, two hex. ([e51d52b](https://github.com/kud/ink-ui/commit/e51d52bf9771dd4e3f58b0f1d09c07cae8d6059b))

---

## 0.25.0 — 2026-09-10

### Highlights

- **`Pill` gains a third tone, `soft`, for a classification that has to sit on every row of a dark ground rather than one that's making news.** `solid` and `outline` already split event from classification, but outline goes all the way to a hue-only ring — right for a busy screen, too little presence for a permanent label like `epic` or `bug` that's meant to read at a glance without competing with whatever row actually has news. `soft` is the middle ground: a filled block, drawn from a new exported `softColors` token family — seven hexes, one per variant, desaturated and darkened from the existing `colors` and individually measured against `#1e1f26` so white ink stays legible on all seven, deutan/protan readers included. Hex rather than an ANSI name, because the property that matters is the measured contrast, not whatever a terminal theme happens to call "green". `solid` and `outline` are untouched — an existing `Pill` renders exactly as before.
- **`group` joins the set of `PillVariant`s, for the container of the rows beneath it — an epic holding its issues, say — available in every tone.** It's deliberately not `accent`: an accent-filled pill sitting on the same row as an accent-coloured key would steal the key's colour, and a group label needs its own identity that never collides with one. In `solid`, `group` reads as `magenta`, backed by a new `colors.group` token; in `soft` it takes its place in the `softColors` family alongside the rest. ([0ba0122](https://github.com/kud/ink-ui/commit/0ba0122854a18bc20259984d96d4019f5ca4a5fe))

---

## 0.24.0 — 2026-09-10

### Highlights

- **`Pill` gains a `tone` prop (`"solid" | "outline"`), so a caller can draw the difference between an event and a classification.** A solid pill has always read as something that happened — a status flip, a result — and that reading was fine until pills started being used for type labels too, where a filled block claims more weight than "this is a `bug`" deserves. `outline` draws the pill as thin Powerline caps (`plCapLeftThin`/`plCapRightThin`) in the fill colour with no background fill, so a classification sits lighter on the row than an event does, and the caps survive `NO_COLOR` rather than vanishing with the colour. `solid` stays the default — an existing `Pill` with no `tone` renders exactly as before, nothing moves. `PillTone` is exported for callers who want to type the prop themselves, and outline rendering is covered with and without `NO_COLOR`. Internally, this also migrated `Pill`'s glyph reads off `@kud/glyphs`' named exports onto its `glyph()` helper and bumped the dependency 0.1.1 → 0.4.0 — no visible change, just the API the new caps needed. ([d6a4977](https://github.com/kud/ink-ui/commit/d6a497719f1a03f15a10deed15f43424f6b9589f))

---

## 0.23.0 — 2026-09-07

### Highlights

- **`TabItem` gains an optional `total`, and a tab that carries one renders `(count/total)` instead of `(count)`.** The motivating case: a cockpit's tabs held row counts that were a WINDOW onto a larger result set — 20 issues drawn out of 97 that matched — and `Tabs` offered only `label` and `count`, so "there are more than these" had nowhere to live and got smuggled into the label as `Issues +129 (20)`. That reads badly: `+` is an operator, it instructs the reader to add, and there's nothing on screen to add it to — worse, the arithmetic works, so a reader who obeys gets a real number for a question nobody asked, with no signal they've misread anything. (The user who hit it said simply "i dont understand the numbers".) A fraction is part-of-whole — page 3 of 12, the most over-learned notation there is — and nobody tries to compute with a slash. The distinction rides on a glyph rather than a hue, so it survives dimming, greyscale and colourblindness, and magnitude still carries: `(30/37)` and `(20/149)` say very different things about how far a tab can be trusted, where a bare truncation flag would only ever say "incomplete". It's also narrower than the notation it replaces. The rule it establishes: one number means the tab is whole, two mean you're looking at a sample — omit `total` when the count IS the whole. Same argument that already made `marker` its own field rather than something callers prepend to `label`. Backwards compatible: `total` is optional, and a tab without one renders exactly as before. Three specs added, including one asserting the active-tab underline still spans the whole fraction. ([173fa13](https://github.com/kud/ink-ui/commit/173fa1371aaa97ee761b9360292a754c3709492b))
- **New demo shows a pulsing marker cell on `Tabs`**, exercising the marker/colour cycling the reserved gutter was built for in 0.19.0. ([6f2fb19](https://github.com/kud/ink-ui/commit/6f2fb19b54e94e46219e3c84515948e2d651d982))

---

## 0.22.0 — 2026-09-03

### Highlights

- **The tab underline stops travelling: it lands under the active tab on the frame the tab changes, and the highlight lands with it.** The slide added across 0.20.0–0.21.0, and the rule-leads-highlight timing built on top of it, went out before they were finished — and a half-tuned animation on the one component every TUI draws across the top of the screen is worse than no animation at all, because it is the first thing the eye goes to and the last thing that should be asking for attention. None of it is thrown away: the step count, the ease shape and the lead/follow split are parked whole on `feat/tabs-underline-animation`, to be finished rather than rewritten. `between()` goes with it — it was only ever exported so the interpolation could be tested.
- **Markers are untouched.** `marker`, `markerColor` and the gutter they sit in behave exactly as they did in 0.21.0; a tab's prefix status is unaffected by any of this.

---

## 0.21.0 — 2026-09-03

### Highlights

- **The rule leads and the text follows: a tab takes its highlight when the underline arrives, not before.** Throughout the slide the tab you came FROM stays lit, and the destination lights at the moment the rule lands under it. Two earlier attempts were both the same mistake in different disguises — switching the label the instant `active` changed left the destination bold while the rule was still crossing towards it, and handing the highlight over mid-flight merely moved that mismatch into the middle. A highlight that changes while nothing has arrived anywhere is one more thing in motion, and the whole point of the animation is that exactly one thing moves and the eye can follow it. Switching tabs twice in quick succession leaves the highlight where it started, because it still has not arrived anywhere; the rule itself carries on from wherever it actually is rather than snapping back. `nearestTo` is gone — it existed only for the mid-flight handover this replaces.

---

## 0.20.2 — 2026-09-03

### Highlights

- **Two jumps out of the sliding tab rule, and neither was in the travel itself.** The rule's LENGTH flickered a column wider and back on alternate frames as it moved: its left and right edges were interpolated and rounded independently, and mid-journey the two `Math.round`s disagree. Interpolating start and width instead is the same maths before rounding — lerp is linear, so `lerp(start) + lerp(width)` is `lerp(right)` — but it rounds once, so the rule steps from one length to the other exactly once. It was invisible until the frames were dumped one at a time.
- **The lit label now follows the rule rather than the `active` prop.** Switching the label the instant `active` changed left the two signals disagreeing for the length of the slide: the destination tab was already bold and orange while the rule was still crossing the bar towards it — one saying "you are here", the other "on my way", and the mismatch reading as a jump in something otherwise moving smoothly. The highlight is now handed to whichever tab the rule is nearest, so it travels with it. Nearest by CENTRE rather than by overlap, because the rule spends part of its journey in the gap between two tabs, where an overlap test lights nothing at all and flickers instead. `nearestTo` is exported for its own test: boldness is an escape code, the runner is not a TTY, and the codes are stripped before a spec can read them, so the choice is assertable as a function or not at all.

---

## 0.20.1 — 2026-09-03

### Highlights

- **The tab underline slides instead of jumping.** 0.20.0 made the rule travel, but it read as a jump followed by a bubble, and two things were causing that. Its twelve steps were six, spaced 25ms apart — faster than the terminal repaints, so several coalesced and you saw three positions where the maths had computed six. And it eased OUT only, which starts at full speed: right for something entering the screen, wrong for something crossing it, because a rule already on screen that leaps on its first frame reads as having been redrawn elsewhere rather than as having travelled. It now eases in and out — slow at both ends, quick through the middle, the shape a physical thing makes crossing a gap — over twelve steps at 28ms, roughly one step per repaint and about a third of a second end to end. Still short enough that holding an arrow key across four tabs stays one gesture rather than four animations queueing.

---

## 0.20.0 — 2026-09-03

### Highlights

- **The active tab's underline now travels between tabs instead of blinking from one to the next.** Switching tabs slides the rule across, because the rule row is now one positioned string rather than a run per cell — a per-cell run could only be present or absent, so it could only ever appear in the new place and vanish from the old, where a string positioned along the row can sit between two tabs for a few frames on the way across. Both ends of the rule are interpolated, not just the left edge, so crossing to a wider tab stretches and settles rather than reading as the bar being retyped.
- **The slide is eased (cubic ease-out) — six steps over roughly 150ms** — quick to leave and gentle to settle, deliberately short: the rule is confirmation of a key you just pressed, and a confirmation that outlasts your certainty about having pressed it stops confirming anything. It also means holding an arrow key across four tabs reads as one gesture rather than four animations queuing up behind each other. Interrupting a slide half-way carries on from wherever the rule actually is, rather than snapping back to the old tab's resting place and starting over.
- **`between(from, to, t)` is exported** so the interpolation maths can be asserted directly, separately from the component. A spec that renders, waits 40ms and reads the frame is racing Ink's render loop against a wall clock — racy on a loaded machine, and it proves nothing about the animation either way. The component owes that it arrives at the right tab; the maths owes that it passes through the middle on the way. Pinning them separately covers both without either test being racy.
- No API change for callers — a `Tabs` that never changes `active` renders exactly as before.

---

## 0.19.1 — 2026-09-03

### Highlights

- **The active tab's underline now spans the label only** — the marker added in 0.19.0 sits in a gutter outside the rule, rather than under it. 0.19.0 counted the marker into the underline on the reasoning that a rule short by the marker's width would read as a rendering fault; a real tab bar showed the opposite: the rule ran two columns past the word on the left and stopped flush on the right, which reads as lopsided rather than generous. The deeper issue is that the rule and the marker answer different questions — the rule says which tab you're on, the marker says which tab has news — so a rule that swallows the marker is claiming the marker as part of the answer to its own question. The gutter is still measured and spent as leading blanks on the rule row, so both rows stay the same width and every tab stays aligned under its own label whatever the markers are doing. Purely visual, no API change — a `TabItem` with no marker is unaffected.

---

## 0.19.0 — 2026-09-03

### Highlights

- **`TabItem` can carry a `marker` and `markerColor`** — a glyph drawn in its own colour immediately before the label, so a caller can flag one tab without disturbing the bar. Prepending a character to `label` was the obvious alternative and the wrong one: the marked tab grows and every tab after it slides sideways, so a bar that shifts when news arrives is one the reader has to re-find. The fix is a reserved cell — give every tab a marker of the same width, or none, and a blank of that width says "not this one" without moving anything. It renders in its own `Text` rather than folding into the label, because the label's colour already answers "is this tab active" and a marker usually answers a different question — folding them together would make the marker borrow the wrong answer. The reserved width is also counted into the active-tab underline, so the rule stays flush instead of falling short and reading as a rendering fault. The motivating case is a cockpit tab that pulses while it holds unread news: since the cell is already reserved, cycling the glyph or colour per frame costs no layout, replacing a per-row marker that used to reflow the row it sat on. Fully backwards compatible — a `TabItem` with no marker renders and underlines exactly as before, pinned by a new `describe("Tabs markers")` test block. ([d7717dc](https://github.com/kud/ink-ui/commit/d7717dc558ca59793cb908bfddcd46dab98c6b60))

---

## 0.18.0 — 2026-09-03

### Highlights

- **`Pill` takes an explicit `color`**, for a surface mirroring an external system whose colours _are_ its vocabulary — GitHub's merged purple, a CI provider's result colours. It overrides `variant`, and the pill picks its own foreground for whatever fill it is handed, by WCAG relative luminance and a contrast ratio against each candidate rather than a brightness threshold: GitHub's green `#3FB950` falls under the conventional 128 while black is three times the more legible ink on it, which is the whole argument for measuring the pair instead of the fill. A named ANSI colour has no luminance to measure — the value is the user's terminal theme — so it takes the ink that reads against a dark terminal, as does anything that is not a six-digit hex. `AGENTS.md` scopes the exception to the token-only colour rule: the hue has to be a fact about the thing being labelled, and a colour picked because it looks right is still a token job. First consumer is the cockpit's row markers — `NEW`, `GONE`, `UPDATED`, `MERGED` — which as plain coloured text read as one more column of trailing metadata beside the dim age and author cells. ([574521c](https://github.com/kud/ink-ui/commit/574521c))

---

## 0.17.0 — 2026-09-03

### Highlights

- **New `Pill` component** — a filled, rounded category label, built from the same powerline half-circle caps as `ToggleSwitch` and matched to shui's own pill fill/ink pairs so the two read alike side by side. Six variants (the four status colours plus `accent` and `muted`, defaulting to `muted`) come straight from the `colors` tokens. It isn't gated behind `getIconMode()` — a missing powerline cap just degrades to a square pill rather than to garbage — but under `NO_COLOR` it falls back to `[label]` brackets, since a fill with no colour behind it would just be an outline around nothing. `pillWidth(text)` is exported alongside it so a caller laying out a fixed-width row can price the pill, caps included, before rendering it. First consumer is the cockpit's `epic` marker on Jira epic rows. `AGENTS.md` now spells out the distinction from `Badge`: reach for `Pill` when the word itself is the information — a category the thing belongs to, like `epic`, `draft`, or `blocked` — and keep `Badge`'s bracket form for anything the reader is meant to follow, like a ticket key or a repo, where a fill would give it more weight than it's earned. ([227487b](https://github.com/kud/ink-ui/commit/227487b8252af8db82ebbbaddff4d7169da6aeb8))

---

## 0.16.0 — 2026-09-02

### Highlights

- **The package now ships `AGENTS.md`, a brief for AI coding agents building a CLI with ink-ui.** It lands in consumers' `node_modules/@kud/ink-ui/AGENTS.md` and carries what the type definitions can't: which components own their own Ink `useInput` versus which are purely presentational, a task-keyed table for picking the right component, the design-token and colourblind-safety house rules, and known traps. The README's new "Building with an AI agent" section points at it.
- **A CI guard keeps the brief honest.** `npm run check:agents` fails the build if `AGENTS.md` cites a component that `src/index.ts` no longer exports, so a rename or removal can't leave the guide silently pointing at something that no longer exists. ([82b28f1](https://github.com/kud/ink-ui/commit/553d378df1448ee8c229b5225932c839b50f4fdc))

---

## 0.15.0 — 2026-08-20

### Highlights

- **`Table` measures its own columns.** A column without a `width` now takes the widest of its header and its cells, counted in display columns so wide glyphs and CJK are not undercounted, and a cell holding newlines is measured by its widest line. Previously every column either carried a hand-counted `width` or was left to flexbox, which meant a table only lined up if you had already measured it yourself.
- **A table too wide for the terminal shrinks to fit.** The widest column gives up characters first, one at a time, until the table fits or every measured column reaches its `minWidth` — so the columns that were already tight stay readable. Columns given an explicit `width` are never touched: an over-wide table you asked for stays over-wide rather than quietly disagreeing with you.
- **Cells can wrap instead of truncating.** `overflow: "wrap"` on a column wraps its content inside the column and grows the row to suit, with neighbouring cells staying top-aligned beside it. The default stays `"truncate"`, which keeps every row one line tall and ends a clipped cell with `…`.
- **Per-column alignment.** `align: "left" | "center" | "right"` positions header and cells together.
- **`gap`, `maxWidth` and `headerColor` are now props.** `maxWidth` defaults to the terminal width, so a table sizes itself without being told where it is.

This closes [#3](https://github.com/kud/ink-ui/issues/3) — the gap that kept `cli-table3` installed alongside the kit.

### Notes

- `string-width` is a new dependency, and the only way to measure a terminal cell honestly.
- Existing tables keep working unchanged: every new field is optional and the defaults reproduce the old behaviour.

---

## 0.14.1 — 2026-08-02

### Documentation

- README now covers the `useTabs` and `useListCursor` hooks that shipped in 0.14.0 undocumented.

---

## 0.14.0 — 2026-08-02

### Highlights

- **New `useTabs` and `useListCursor` hooks** — the tab-switching and list-cursor keyboard logic that every consumer had been rewriting, extracted so `Tabs` and a scrolling list behave the same everywhere.

### Fixes

- **`Toast` unmounts its timer in tests**, so a component holding a countdown can no longer reach into whatever test runs next.

---

## 0.13.2 — 2026-08-02

### Fixes

- **`SelectableRow` no longer loses a column of indentation on long rows.** Its marker gutter sat in a flexible child, so any row whose content overflowed its container had that gutter compressed by one character — shifting the whole row a place left and breaking alignment with its neighbours. Only overflowing rows were affected, which is why it survived every short test fixture and showed up instead as the occasional crooked line in a real list. Every consumer's lists are affected, not just new ones.

---

## 0.13.1 — 2026-08-02

### Fixes

- **`UpdateBanner` leads with the package name** rather than the words "Update available". When several CLIs might be offering an upgrade, which one is asking is what you need first; "update available" is identical on every banner and so carries no information.

---

## 0.13.0 — 2026-08-02

### Highlights

- **New `UpdateBanner`** — the shared "an update is available, upgrade now?" offer, so every @kud CLI shows the same thing. Takes plain props rather than importing any update-checking package: it knows how to draw the offer, not where the information came from.

---

## 0.12.0 — 2026-08-01

### Highlights

- **`ProgressBar` is flat and its colours are configurable.** The unfilled remainder was drawn with a shade character (`░`), which dithers into a visibly textured, faintly three-dimensional strip next to flat blocks. Both halves are now solid `█`, told apart by new `color` and `trackColor` props.

  Note this changes how `ProgressBar` looks everywhere it is used, and trades a _shape_ difference for a _lightness_ one — a genuinely monochrome terminal now sees an undifferentiated bar. Lightness still separates for colourblind readers, which is the case that actually occurs.

---

## 0.11.0 — 2026-08-01

### Highlights

- **New `ToggleSwitch`** — a physical on/off switch: a rounded coloured track with the knob at one end. Sits alongside `Toggle` (a dot) and `Switch` (a two-label slider) rather than replacing either, so nothing already using those changes appearance. The knob position carries the state, so it reads without colour; the rounded caps use powerline half-circles and degrade to a square pill in fonts that lack them.

---

## [0.8.0] — 2026-07-14

### Highlights

- `MultiSelect` and `Select` now mark the active/selected option with a trailing ✓ tick instead of the old filled/empty circle glyphs (◉/○), and the highlighted row's colour moved from accent to info — a clearer, more consistent selection indicator across both components ([9c0baae](https://github.com/kud/ink-ui/commit/9c0baae3650b30e65321521d65b67491ae35e25c)).
- Added an interactive component gallery (`npm run demo`) for browsing every component live in the terminal, and gave `ScrollView` a new `isActive` prop so it can go inert when unfocused — built for the gallery's multi-panel layout, but usable in any app juggling several scrollable regions ([362cb7b](https://github.com/kud/ink-ui/commit/362cb7bfebff2d4f3969734a99f71d42640e7c85)).

### Documentation

- The README now documents the full set of 25 components across 6 categories, calls out colourblind-safe design as a feature, bumps peer dependency guidance to ink ≥7 / react ≥19, and adds input and nested-list usage examples ([4eb77fd](https://github.com/kud/ink-ui/commit/4eb77fde204d6b8971479eb74ce4c21e4a20a6e9)).

## [0.7.0] — 2026-07-13

### Highlights

- Reached full parity with `@inkjs/ui` by porting its four remaining components: `EmailInput`, `PasswordInput`, `UnorderedList`, and `OrderedList`, all exported from the package root and covered by vitest suites ([b6bddce](https://github.com/kud/ink-ui/commit/b6bddcedd1dcf716eb5ddae186b5062281d5f8ea)).
  - `EmailInput` completes the domain for you — press Tab to accept a suggested domain instead of typing it out.
  - `PasswordInput` masks each keystroke with a configurable character, so secrets typed into a TUI prompt never echo to the screen.
  - `UnorderedList` and `OrderedList` render nested lists correctly — bullets step through depth-aware markers (●, ○, ▪, ▫) and numbered lists reset their counter at each nesting level.

## [0.1.1] — 2026-04-23

### Features

- Initial project setup with design tokens and 5 core components ([56a4eee](https://github.com/kud/ink-ui/commit/56a4eee))

### Documentation

- Add project documentation with features, components and setup guide ([22c8965](https://github.com/kud/ink-ui/commit/22c8965))
- Add MIT licence ([9813b64](https://github.com/kud/ink-ui/commit/9813b64))
- Set up GitHub Pages documentation site and CI/CD workflow ([859aca6](https://github.com/kud/ink-ui/commit/859aca6))
- Add initial changelog documenting project setup and features ([7e21c73](https://github.com/kud/ink-ui/commit/7e21c73))

<details>
<summary>Internal changes (1 commit)</summary>

- Add npm publish workflow and repository metadata ([7259e86](https://github.com/kud/ink-ui/commit/7259e86))

</details>
