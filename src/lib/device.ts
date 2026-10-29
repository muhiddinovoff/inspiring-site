/**
 * Whether to spend on paint-heavy effects (blur filters that change while scrolling). Large screens with a mouse
 * only: on phones the same blur is repainted every scroll frame and costs smoothness the effect isn't worth.
 */
export const richEffects = () => window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches
