export const EFFECTS = [
  {
    id: "follow",
    name: "Follow",
    description: "A ring eases after the pointer and tightens while you press.",
    tip: "Hold the pointer down. The ring contracts, then springs back on release.",
    note: "The ring is drawn above the page so it stays visible over the cards.",
  },
  {
    id: "trail",
    name: "Trail",
    description: "Soft marks fade along the path you just took.",
    tip: "Move slowly for a dense line. A quick flick leaves wider gaps.",
    note: "The trail follows the eased point, so it feels heavier than the raw pointer.",
  },
  {
    id: "comet",
    name: "Comet",
    description: "A streak that stretches when you move faster.",
    tip: "Whip across the screen. The head stays bright and the tail thins out.",
    note: "Speed changes the width. Holding still leaves only a short glow.",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "The page dims to a pool of light that tracks you.",
    tip: "Sweep across the cards. The ink only reads clearly inside the pool.",
    note: "The dock stays lit so the sliders remain easy to use.",
  },
  {
    id: "ripple",
    name: "Ripple",
    description: "Rings expand from the pointer, wider when you click.",
    tip: "Click for a wide ring. Drag to lay down a chain of smaller ones.",
    note: "Older rings fade as they grow, so a new press stays readable.",
  },
  {
    id: "particles",
    name: "Particles",
    description: "Sparks peel off the path and drift with a little gravity.",
    tip: "Faster movement sheds more sparks. They burn out on their own.",
    note: "The burst is capped so a long scribble does not flood the page.",
  },
  {
    id: "magnetic",
    name: "Magnetic",
    description: "Cards and buttons lean toward the pointer when it comes close.",
    tip: "Hover the specimens and the two actions. The pull falls off with distance.",
    note: "The dock is left alone so the sliders stay easy to aim.",
  },
  {
    id: "grid",
    name: "Grid",
    description: "A field of dots shoves aside, then settles when you leave.",
    tip: "Move slowly through the gaps between cards to see the push.",
    note: "The field sits behind the type. Dots never cover the words.",
  },
] as const;

export type EffectId = (typeof EFFECTS)[number]["id"];

export const INKS = [
  { name: "Vermilion", value: "#ff5a1f" },
  { name: "Gold", value: "#e4b23c" },
  { name: "Mint", value: "#3cbe8c" },
  { name: "Ice", value: "#79c7ff" },
  { name: "Lilac", value: "#c7a6ff" },
] as const;

export function effectById(id: EffectId) {
  return EFFECTS.find((effect) => effect.id === id) ?? EFFECTS[0];
}
