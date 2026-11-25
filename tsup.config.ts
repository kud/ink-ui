import { defineConfig } from "tsup"

export default defineConfig({
  entry: { index: "src/index.ts", output: "src/output/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  treeshake: true,
})
