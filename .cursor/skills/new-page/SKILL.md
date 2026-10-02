---
name: new-page
description: Scaffolds a new route in the Next.js App Router under `src/app/`. Use when the user asks to add a page, route, or screen.
---

# New Page

Add a route by creating `src/app/<segment>/page.tsx`. Read the matching file in `node_modules/next/dist/docs/` before writing — this repo is on Next.js 16 and APIs differ from older versions (see `AGENTS.md`).

## Minimal page

```tsx
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-medium">Title</h1>
    </main>
  );
}
```

## Conventions in this repo

- Server Component by default. Add `"use client"` only when the file uses state, effects, or event handlers.
- Co-locate the route's components in the same folder when they're only used there; otherwise put them in `src/components/`.
- Use the `@/` alias (`@/components/...`, `@/lib/...`).
- Style with Tailwind utilities. Tokens live in `src/app/globals.css` under `@theme`. No `tailwind.config.*`.
- Dynamic route params and `searchParams` are async in this Next version — `await` them.

## Verify

`npm run dev` (port 3847) and open the new route in the browser.
