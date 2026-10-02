# Cursor & Effect

A pointer studio. Pick an effect, then move across the page: a following ring, a fading trail, a speed-stretched comet, a spotlight, click ripples, drifting particles, magnetic cards, or a dot field that pushes aside.

The stage reads pointer position and speed. The dock changes which effect is live, plus its scale, strength, and ink.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

```bash
npm test
npm run lint
npm run build
npm start
```

`npm start` also listens on port 3847.

## Controls

- Effects **1–8**, or the arrow keys, switch the active effect.
- **Scale** changes the size of the mark, the light, or the field.
- **Strength** changes easing, push, spark count, and how fast ripples grow.
- **Ink** recolors the effect. The page chrome stays put.
- **Native cursor** brings the system pointer back. It is hidden by default so the drawn mark can lead.
- **Next effect** and **Another ink** sit on the stage. In the magnetic effect they lean toward the pointer. The dock does not.

If the browser asks for reduced motion, marks snap to the pointer, the grid push is smaller, and particles stay off.

## Stack

Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui.
