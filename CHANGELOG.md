# Changelog

All notable changes to this project are documented here.

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
