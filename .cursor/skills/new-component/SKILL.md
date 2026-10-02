---
name: new-component
description: Adds a React component under `src/components/` using this repo's Tailwind v4 and shadcn/ui conventions. Use when the user asks for a new UI component, button, card, form control, or layout piece.
---

# New Component

## Where it goes

- Reusable, app-specific: `src/components/<name>.tsx`.
- shadcn primitive: `src/components/ui/<name>.tsx`. Prefer `npx shadcn@latest add <name>` over writing primitives by hand.

## Shape

```tsx
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
      {...props}
    />
  );
}
```

## Rules

- Import `cn` from `@/lib/utils`. Don't reimplement it.
- For variants, use `class-variance-authority` (`cva`) the way `src/components/ui/button.tsx` does, and export both the component and the `*Variants` function.
- Primitives come from `@base-ui/react`, not Radix. If a shadcn-generated file imports `@radix-ui/*`, swap it.
- Server Component by default; `"use client"` only when it needs state or effects.
- No inline hex colors — use tokens from `@theme` in `src/app/globals.css`.

## Verify

Render it on a page and check it in the browser at `localhost:3847`.
