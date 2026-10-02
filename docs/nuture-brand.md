# Nuture — Brand Guidelines

## Identity

**Name:** Nuture  
**Category:** Personal growth / goal coaching app  
**Positioning:** A warm, intelligent companion that helps you set, track, and achieve personal goals — not a productivity tool, but a coach.

---

## Color

| Name | Hex | Role |
|---|---|---|
| Lime Green | `#5CD719` | Primary brand color; hero backgrounds, active nav, CTAs |
| Acid Yellow | `#C8E000` | Gradient terminus; adds energy, warmth, optimism |
| Warm Cream | `#EDE8E0` | Goal card backgrounds; quiet, human, restful |
| Off-White | `#F7F5F2` | Page background; gives the cream cards a surface to sit on |
| Near-Black | `#1A1A1A` | Body text on light backgrounds |
| White | `#FFFFFF` | Text and icons on green backgrounds |

### Background — Mesh Gradient
The signature background is a **mesh gradient** asset (`image-mesh-gradient.png`), not a simple linear gradient. It should be used as a full-bleed image layer on all green hero screens.

Characteristics:
- **Base field:** acid yellow (`~#D4E600`) fills the full canvas — corners, edges, and periphery
- **Central bloom:** a soft, organic green mass (`~#4CC415` at its darkest core, feathering out to lime `~#7ED321`) sits slightly left of centre, extending from upper-mid to lower-mid
- **Form:** the green reads as a blurred, irregular ovoid — organic, not geometric; closer to a watercolour wash than a radial gradient
- **Grain:** fine noise texture is baked into the asset, visible across the full image — this is intentional and must be preserved; do not apply additional smoothing

**Usage:**
- Apply as a background image (`background-size: cover`) on all full-green screens
- Do not attempt to recreate this with CSS gradients — the mesh and grain are too nuanced
- On the Goals screen, the active card replicates this palette (green → yellow) but can use a simpler CSS linear gradient at a smaller scale
- File: `image-mesh-gradient.png`

---

## Typography

**Display / Brand:** [Inknut Antiqua](https://fonts.google.com/specimen/Inknut+Antiqua) — used for the wordmark ("Nuture"), hero headlines ("Hey Jordyn, What can I help with today"), and prominent section titles ("Goals"). Weight: Regular to Medium.

**Body / UI:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — used for card titles, body copy, supporting text, and nav labels. Clean, geometric sans-serif that contrasts well with Inknut Antiqua's organic, high-contrast serifs. Weight: Regular to Medium.

**Type scale:**
- Wordmark / splash: ~56px, serif, white
- Hero headline: ~40px, serif, white, center-aligned, line-height 1.15
- Section title: ~32px, serif, near-black
- Card title: ~22px, DM Sans Medium, near-black
- Card body / labels: ~15px, DM Sans Regular, near-black at 60% opacity
- Nav labels: ~13px, DM Sans Regular, sentence case

**Never use all-caps for navigation or labels.** Sentence case throughout.

---

## Iconography

Icons are simple, line-weight, slightly rounded. Three nav icons establish the vocabulary:

- **Goals:** crosshair / target circle  
- **Home:** house outline  
- **Coach:** four-pointed star (✦) — the signature AI/magic motif

The four-pointed star (✦) is a recurring brand element. It appears on the splash screen above the heading, as the Coach nav icon, and in the "Assistant" pill on the home screen. It signals intelligence, not just decoration.

---

## Components

### Goal Cards
- Background: warm cream (`#EDE8E0`)
- Corner radius: ~20px
- Padding: ~24px
- Shadow: none — the cream on off-white is enough separation
- Active / highlighted card: switches to the signature gradient with white text
- Stack vertically with ~16px gap

### CTA Pills / Buttons
- Shape: fully rounded pill
- On green background: white text, semi-transparent white fill (~20% opacity) — a frosted glass effect
- Typography: DM Sans Regular, ~17px

### Navigation Bar
- White background, full width, ~80px tall
- Three items, centered icons above labels
- Active state: icon + label in near-black; inactive in medium grey
- No borders or dividers — the white bar floats off the page content

### Assistant Pill (Home screen)
- Top-left placement
- Frosted/translucent rounded pill: `✦ Assistant`
- White border, semi-transparent background

### Profile Icon (Home screen)
- Top-right, circular, same frosted treatment

---

## Motion

- **Splash to Home:** the gradient should fade in, with the wordmark appearing first, then the loading pill animating (pulsing opacity or expanding width)
- **Card selection:** active card transitions from cream to gradient — ease-in-out, ~300ms
- **No page-load scroll reveals** — content should be present, not staged

---

## Voice & Tone

Nuture speaks like a knowledgeable friend, not a productivity app.

- Warm but not saccharine: "You're doing really well..." not "You've completed 3 goals — great work!"
- Personalised and direct: uses the user's name ("Hey Jordyn") without over-explaining
- Prompts are open-ended and collaborative: "What can I help with today" (no question mark — it's an invitation, not a quiz)
- Actions are clear: "Plan a new goal" not "Add goal" or "Get started"

---

## What Nuture is not

- Not a task manager — no due dates, streaks, or points in the visual language
- Not clinical — no charts, no metrics-first screens
- Not loud — the green is confident, not aggressive; the UI gives breathing room
- Not generic — the serif/monospace contrast and grain texture are intentional differentiators; don't flatten them out

---

*Version 1.0 — derived from splash, home, and goals screens.*
