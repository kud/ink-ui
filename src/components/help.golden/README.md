# Help goldens

The shared CLI help layout's byte contract. `deploy.json` is the input; each
`.txt` beside it is `renderHelp` of that input at a fixed width and encoding,
escapes included. Any renderer of the layout — the zsh twin included — must
produce these files byte for byte from the same input.

| File | Columns | Encoding |
| --- | --- | --- |
| `deploy.tty.txt` | 80 | `truecolor` — a TTY advertising `COLORTERM=truecolor` |
| `deploy.ansi256.txt` | 80 | `ansi256` — a TTY whose `TERM` names 256 colours |
| `deploy.ansi16.txt` | 80 | `ansi16` — any other TTY |
| `deploy.no-color.txt` | 80 | `monochrome` — a TTY with `NO_COLOR` set |
| `deploy.piped.txt` | 80 | `plain` — not a TTY |
| `deploy.narrow.txt` | 50 | `plain` — below 60 columns |

Regenerate with `npx vitest run -u src/components/help.test.ts` after a
deliberate change to the layout, and read the diff before committing it.

## The rules, as the renderers implement them

- Width is `min(columns, 80)`; a missing or zero width counts as 80.
- Header: name bold, a space, version in `secondary`; then the description,
  wrapped at the width. No banner.
- Sections, each omitted when empty, each preceded by one blank line:
  USAGE · COMMANDS · ARGUMENTS · OPTIONS · EXAMPLES · ENVIRONMENT · SEE ALSO.
  Headings bold in `accent`, the only colour that carries structure.
- USAGE lines are indented 2 and never wrapped; the optional note follows
  after a blank line, indented 2 and wrapped.
- Rows: indent 2, description at column 26. A name wider than 22 sits alone
  and its description starts the next line at column 26. Continuations hang at
  column 26. Below 60 columns every description drops under its name at
  indent 6.
- In OPTIONS, when at least one option has a short form, an option written
  long-only (starting `--`) is indented 4 more so the `--` align; this shift is
  dropped below 60 columns, where it would collide with the descriptions.
- Names: `<…>` and `[…]` runs in `secondary`, every other word bold.
- Descriptions: whitespace collapsed, an ASCII a–z first letter lifted to a
  capital, one final `.` dropped (never `..`); `(default: …)` appended in
  `secondary` as a single run that wrapping never splits.
- Wrapping is greedy between words (the default counts as one word), measured with display width; a word
  wider than the space left sits alone and overflows.
- EXAMPLES: `# comment` as one `secondary` run, then `$` in `secondary` and the
  command unstyled.
- SEE ALSO: each entry one run, `link` colour, underlined.
- Encoding: one SGR per styled run, parameters in the order bold (`1`),
  underline (`4`), colour, closed with `ESC[0m`. Spaces between runs and all
  unstyled text carry no escape. Colour comes from `@kud/glyphs`' `colors.json`:
  `38;2;R;G;B` from `hex`, `38;5;N` from `ansi256`, `30+N` / `90+N-8` from
  `ansi16`. `monochrome` keeps bold and underline and drops colour; `plain`
  emits no escape at all. Every line, the last included, ends with `\n`.
