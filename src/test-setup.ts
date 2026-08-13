import { cleanup } from "ink-testing-library"
import { afterEach } from "vitest"

// `render` from ink-testing-library leaves a live Ink instance behind, so a component
// holding a timer keeps it running past the test that created it and can reach into
// whatever runs next. ink-testing-library already tracks every instance it hands out,
// so its own `cleanup` is all this needs, and unmounting an unmounted instance is a
// no-op. Registering it globally rather than per file is what makes it impossible for
// the next test written to forget. `test-setup.test.tsx` fails if this is removed.
afterEach(cleanup)
