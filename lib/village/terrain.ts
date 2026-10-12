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
// Authored footpaths [startX, startZ, endX, endZ]. Most bow sideways a little;
// the straight run from the gate to the bridge is the exception.
export const PATH_ROUTES: [number, number, number, number][] = [
  [0, 5, -9, -5],
  [-1, 5, -1, -10],
  [-1, -10, -3, -11.8],
  [0, 5, 6, -4],
  [0, 5, -11, 8],
  [0, 5, 7, 10],
  [7, 10, 16, 2],
  [0, 5, 1, 10],
  [1, 10, 1, 21],
  [1, 21, -13, 24],
  [1, 21, 9, 24],
];
export function routePoint(
  [sx, sz, ex, ez]: (typeof PATH_ROUTES)[number],
  t: number,
): [number, number] {
  const straight = sx === ex;
  return [
    sx + (ex - sx) * t + (straight ? 0 : Math.sin(t * Math.PI) * 1.1),
    sz + (ez - sz) * t,
  ];
}
const pathSegments = PATH_ROUTES.flatMap((route) =>
  Array.from({ length: 24 }, (_, i) => [
    ...routePoint(route, i / 24),
    ...routePoint(route, (i + 1) / 24),
  ]),
);
// Distance to the nearest footpath centreline.
export function pathDistance(x: number, z: number) {
  let best = Infinity;
  for (const [ax, az, bx, bz] of pathSegments) {
    const dx = bx - ax,
      dz = bz - az,
      t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
      );
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
export const POND = { x: -17, z: -2, rx: 3.4, rz: 2.6 };
export const WATER_LEVEL = -0.25;
// Meadow height: flat grass, a carved river channel and a shallow pond.
// Walkable colliders stay flat; the player never enters water.
export function groundHeight(x: number, z: number) {
  const river = Math.abs(z - riverZ(x));
  const channel =
    river < RIVER_HALF_WIDTH + 0.4
      ? -0.85 * Math.min(1, (RIVER_HALF_WIDTH + 0.4 - river) / 1.2)
      : 0;
  const pond = Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz);
  const basin = pond < 1.12 ? -0.6 * Math.min(1, (1.12 - pond) / 0.35) : 0;
  return Math.min(channel, basin);
}
