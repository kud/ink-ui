<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fink-ui?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**React component library for Ink CLIs**

<a href="https://kud.io/projects/ink-ui">Website</a> · <a href="https://kud.io/projects/ink-ui/docs">Documentation</a>

</div>

## Features

- **Ten ready-made components** — Banner, Header, Badge, Spinner, Table, Tabs, FooterHints, LoadingScreen, KeyValue, and SelectableRow, pre-styled and ready to drop in
- **Design tokens included** — a shared colour palette (`colors`) and spacing scale (`spacing`) to keep every screen consistent
- **Full TypeScript support** — ships compiled output with `.d.ts` declarations for every component and token type
- **ESM only, zero config** — no runtime bundling step; just import and render
- **Peer-dependency light** — only requires `ink ≥ 4` and `react ≥ 18`; `ink-spinner` is the sole production dependency

## Install

```sh
npm install @kud/ink-ui
```

`ink` and `react` are peer dependencies and must be installed separately:

```sh
npm install ink react
```

## Usage

```tsx
import React from "react"
import { render } from "ink"
import { Banner, Header, Badge, Spinner, colors } from "@kud/ink-ui"

const App = () => (
  <>
    <Banner title="my-tool" subtitle="v1.0.0" />
    <Header subtitle="Synchronising files…">Status</Header>
    <Badge variant="success">done</Badge>
    <Spinner label="Loading…" />
  </>
)

render(<App />)
```

All components accept only the props they need — no theme provider or context required. Design tokens are plain objects:

```ts
import { colors, spacing } from "@kud/ink-ui"

// colors.accent   → "#FF8C00"
// colors.success  → "green"
// spacing.md      → 3
```

## Development

```sh
git clone https://github.com/kud/ink-ui.git
cd ink-ui
npm install
npm run dev
```

`npm run build` compiles TypeScript to `dist/`. `npm run dev` runs the compiler in watch mode.

📚 **Full documentation → [ink-ui/docs](https://kud.io/projects/ink-ui/docs)**
