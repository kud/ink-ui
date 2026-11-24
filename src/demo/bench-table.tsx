// Frame-cost probe for Table on 10 000 rows — run with `npx tsx src/demo/bench-table.tsx`.
import React, { Profiler, useState } from "react"
import { render } from "ink-testing-library"
import { Table, statusColumn, type Column } from "../index.js"

type Row = Record<string, unknown> & {
  id: string; name: string; owner: string; size: number; updated: string; state: "success" | "error" | "pending"
}
const states = ["success", "error", "pending"] as const
const data: Row[] = Array.from({ length: Number(process.env.N ?? 10_000) }, (_, i) => ({
  id: `JOB-${i}`, name: `pipeline ${i} · build and publish the artefacts`, owner: `user${i % 37}`,
  size: (i * 7919) % 100_000, updated: `${i % 59}m ago`, state: states[i % 3]!,
}))
const columns: Column<Row>[] = [
  { key: "id", header: "Id" }, { key: "name", header: "Name", flex: 1, maxWidth: 40 },
  { key: "owner", header: "Owner" }, { key: "size", header: "Size", align: "right" },
  { key: "updated", header: "Updated" },
  statusColumn<Row>({ key: "state", header: "State", status: (r) => r.state }),
]
let move: (n: number) => void = () => {}
const Host = () => {
  const [cursor, setCursor] = useState(0)
  move = setCursor
  return <Table data={data} columns={columns} maxWidth={120} height={30} cursor={cursor} sort={{ key: "size", direction: "asc" }} selection="multiple" selected={[]} />
}
const t0 = performance.now()
const commits: number[] = []
const { lastFrame } = render(
  <Profiler id="table" onRender={(_id, _phase, actual) => commits.push(actual)}>
    <Host />
  </Profiler>,
)
const first = performance.now() - t0
const times: number[] = []
for (let i = 1; i <= 200; i++) {
  const t = performance.now(); move(i * 37); await new Promise((r) => setImmediate(r)); lastFrame(); times.push(performance.now() - t)
}
times.sort((a, b) => a - b)
console.log(`first frame (measure + sort 10k): ${first.toFixed(1)} ms`)
console.log(`cursor move: median ${times[100]!.toFixed(2)} ms, p95 ${times[190]!.toFixed(2)} ms`)
if (commits.length) { const renders = commits.slice(1).sort((a, b) => a - b)
console.log(`React render of a cursor move: median ${renders[Math.floor(renders.length / 2)]!.toFixed(2)} ms, p95 ${renders[Math.floor(renders.length * 0.95)]!.toFixed(2)} ms (first ${commits[0]!.toFixed(1)} ms)`)}
console.log(lastFrame()!.split("\n").length, "lines rendered")
