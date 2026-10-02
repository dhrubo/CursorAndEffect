---
name: add-test
description: Adds a test using this repo's Node.js native test runner. Use when the user asks for a test, or when adding a pure function under `src/lib/`.
---

# Add a Test

Tests use Node's built-in runner. No Jest, Vitest, or jsdom.

## Command

```bash
npm test
```

Runs `node --experimental-strip-types --experimental-detect-module --test` over the `*.test.ts` files.

## File

Co-locate as `src/lib/<name>.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { myHelper } from "./my-helper.ts";

test("myHelper does X when Y", () => {
  assert.deepEqual(myHelper(input), expected);
});
```

## Rules

- Import from `node:test` and `node:assert/strict` only.
- Use the `.ts` extension in relative imports.
- Test pure functions. If logic sits inside a component and needs a test, move it into `src/lib/` first.
- If you add a new test file, update the `test` script in `package.json` so the glob includes it.
