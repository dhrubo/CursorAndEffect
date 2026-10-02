---
name: form-and-state
description: Patterns for client-side state and forms in this repo — local useState, controlled inputs, shadcn inputs. Use when adding a form, input, toggle, slider, or component state.
---

# Form and State

This app has no data layer. State is local React state in Client Components.

## Client Component with state

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function NameForm() {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
      className="grid gap-3"
    >
      <Label htmlFor="name">Name</Label>
      <input
        id="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="rounded-md border border-border bg-transparent px-3 py-2"
      />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

## Rules

- `"use client"` goes at the top of any file that uses `useState`, `useEffect`, or event handlers.
- Controlled inputs: `value` + `onChange`. Don't mix in uncontrolled refs for the same field.
- Every input has a `<Label htmlFor>` or an `aria-label`.
- Reuse `src/components/ui/` primitives (`button`, `label`, `slider`, `switch`) before adding new ones.
- Keep state in the closest component that needs it. Lift it only when a sibling must read it.

## Verify

Load the page, type, submit, and confirm the value round-trips. Check the empty and error states.
