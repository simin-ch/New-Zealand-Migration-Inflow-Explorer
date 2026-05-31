/** Canonical per-continent colors (RGBA arrays for deck.gl, hex for CSS/ECharts) */

export const CONTINENT_COLOR_MAP: Record<string, [number, number, number]> = {
  Asia:     [0,   255, 238],   // neon cyan
  Europe:   [74,  158, 255],   // sky blue
  Oceania:  [167, 139, 250],   // purple
  Americas: [245, 158,  11],   // amber
  Africa:   [255, 107, 157],   // pink
  Unknown:  [60,  80,  110],   // dim slate
}

export const CONTINENT_HEX: Record<string, string> = {
  Asia:     '#00ffee',
  Europe:   '#4a9eff',
  Oceania:  '#a78bfa',
  Americas: '#f59e0b',
  Africa:   '#ff6b9d',
  Unknown:  '#3c506e',
}

export function continentRgb(continent: string): [number, number, number] {
  return CONTINENT_COLOR_MAP[continent] ?? CONTINENT_COLOR_MAP['Unknown']
}

export function continentHex(continent: string): string {
  return CONTINENT_HEX[continent] ?? CONTINENT_HEX['Unknown']
}
