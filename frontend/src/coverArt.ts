/** Deterministic cover gradient from a place name (matches PlaceLibrary). */

function hashHue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 360;
  }
  return hash;
}

/** CSS background shorthand value (gradient). */
export function coverArt(name: string): string {
  const hue = 120 + (hashHue(name) % 120);
  return `linear-gradient(155deg, hsl(${hue} 30% 32%), hsl(${(hue + 45) % 360} 24% 14%))`;
}
