---
name: building-skills-from-patterns
description: When the same multi-step workflow repeats in Cursor — through user corrections or the agent re-deriving steps — capture it as a new SKILL.md under .cursor/skills/ so future sessions load it automatically. Use when a procedure has been repeated three or more times or a correction states an ongoing policy.
---

# Building Skills From Patterns

**Skills** are reusable `SKILL.md` files. This skill promotes repeated muscle memory into a named skill: research once, encode the workflow, reuse it.

## When to trigger

- The user has asked for the **same sequence** three or more times (for example, "always run lint then test before committing").
- The agent notices it is **re-deriving** the same steps on every task in this repo.
- A correction sounds like a **policy** ("never put math in the component — always a pure helper"). Use a **rule** in `.cursor/rules/` if it should be always-on; use a **skill** if it is a procedure with steps.

## Workflow

### 1. Name the pattern

Choose a short slug, lowercase with hyphens: `verifying-before-commit`, `adding-a-route`.

### 2. Draft the skill

Create `.cursor/skills/<slug>/SKILL.md`.

Frontmatter:

```yaml
---
name: <slug>
description: One line saying what it does and when to use it, including the trigger.
---
```

Body, kept lean:

1. **Title** — human-readable.
2. **When to use** — bullets.
3. **Steps** — numbered, imperative, with exact commands (`npm test`, `npm run lint`).
4. **Notes** — edge cases and when not to use it.

Match the tone of the existing skills in `.cursor/skills/`: concrete commands, no filler, under a page.

### 3. Validate

- The description is specific enough for Cursor to match the skill when the user describes the task.
- The steps are executable without guessing the repo layout.
- No secrets or machine-specific paths.
- The file stays under 500 lines.

### 4. Tell the user

Say where the file lives. The agent picks it up on the next chat in this workspace.

## Skills, rules, and hooks

| Mechanism | Use for |
|---|---|
| Skill (`.cursor/skills/`) | An on-demand procedure with steps and tool usage |
| Rule (`.cursor/rules/`) | An always-on convention, style, or file pattern |
| Hook (`.cursor/hooks.json`) | Something that runs automatically on save or stop |

If the pattern is "every time I save, run X", suggest a hook. If it is "when I ask to ship", keep it a skill.

## Notes

- One skill per workflow. Avoid a single skill that tries to cover every situation.
- Update an existing skill instead of adding a duplicate when a workflow evolves.
