export const VILLAGE_SPAWN: [number, number, number] = [1, 0.85, 24];
export const WORLD_RADIUS = 32;
export const RIVER_HALF_WIDTH = 2.5;
export const BRIDGE_X = 1;
export const BRIDGE_HALF_WIDTH = 1.5;
export const BRIDGE_Z = 14 + Math.sin(BRIDGE_X * 0.18) * 1.8;
export const riverZ = (x: number) => 14 + Math.sin(x * 0.18) * 1.8;
// The no-swimming rule applies while airborne too. Sweeping prevents a large
// step from skipping water or taking a diagonal shortcut around a bridge rail.
export function villageStepAllowed(
  x: number,
  z: number,
  nx: number,
  nz: number,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(nx - x, nz - z) / 0.15));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps,
      px = x + (nx - x) * t,
      pz = z + (nz - z) * t;
    if (Math.hypot(px, pz) > WORLD_RADIUS - 0.65) return false;
    if (
      Math.abs(pz - riverZ(px)) < RIVER_HALF_WIDTH + 0.32 &&
      Math.abs(px - BRIDGE_X) > BRIDGE_HALF_WIDTH - 0.35
    )
      return false;
  }
  return true;
}
export const bankStrips = Array.from({ length: 128 }, (_, i) => {
  const x = -WORLD_RADIUS + (i + 0.5) * 0.5;
  const edge = Math.sqrt(WORLD_RADIUS ** 2 - (Math.abs(x) + 0.25) ** 2);
  return {
    x,
    edge,
    north: riverZ(x) - RIVER_HALF_WIDTH,
    south: riverZ(x) + RIVER_HALF_WIDTH,
  };
});
