---
name: verify-in-browser
description: Runs the dev server and checks a change in the browser before calling UI work done. Use after editing pages, components, styles, or anything user-visible.
---

# Verify in the Browser

A UI change is done when it has been exercised in the running app, not when it type-checks.

## Dev server

```bash
npm run dev
```

Serves on [http://localhost:3847](http://localhost:3847). If a server is already running in a terminal, reuse it.

## What to check

1. Open the changed route and do the thing a user would do: click, type, submit, navigate.
2. Visit every other route that renders the component or reads the state you touched.
3. Hit the edge states: empty input, long text, narrow viewport if layout changed.
4. Watch the browser console and the dev-server terminal for errors.

## Before handing back

- `npm run lint` is clean.
- `npm test` passes if `src/lib/` changed.
- State what you verified and anything you could not reach.
