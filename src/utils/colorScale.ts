/**
 * Maps a Total_Inflow value to a hex color using Jenks breaks.
 * Class 0 (gray): value === 0
 * Classes 1–5: deep dark blue → neon cyan
 */

const PALETTE = [
  '#1a2744', // class 1 – very low
  '#0d3b6e', // class 2 – low
  '#0e6ba8', // class 3 – mid
  '#00b4d8', // class 4 – high
  '#00ffee', // class 5 – highest (neon cyan)
]

const ZERO_COLOR = '#15203a'

export function inflowToColor(value: number, breaks: number[]): string {
  if (!value || value === 0) return ZERO_COLOR
  // breaks = [min, b1, b2, b3, b4, max]  → 5 classes
  for (let i = 1; i < breaks.length; i++) {
    if (value <= breaks[i]) {
      return PALETTE[Math.min(i - 1, PALETTE.length - 1)]
    }
  }
  return PALETTE[PALETTE.length - 1]
}

export function classIndex(value: number, breaks: number[]): number {
  if (!value || value === 0) return 0
  for (let i = 1; i < breaks.length; i++) {
    if (value <= breaks[i]) return i
  }
  return breaks.length - 1
}

export { PALETTE, ZERO_COLOR }
