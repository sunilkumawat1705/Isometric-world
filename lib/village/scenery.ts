import { locations } from "./data";
import { seeded } from "./logic";
import { PARKOUR_LODGE } from "./minigames/entrance";
import { crystals } from "./minigames/config";
import { villageWaypoints } from "./wayfinding";
import {
  BRIDGE_X,
  PATH_ROUTES,
  POND,
  RIVER_HALF_WIDTH,
  WORLD_RADIUS,
  pathDistance,
  riverZ,
  routePoint,
} from "./terrain";

export type Item = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: number;
  color: string;
};
export type FenceRail = { x: number; z: number; angle: number; length: number };

const PINE = ["#2d6a47", "#28603f", "#347450", "#22573a", "#3b7d52"];
const ROUND = [
  "#a6cf4b",
  "#97c447",
  "#86ba43",
  "#b4d655",
  "#76ad3f",
  "#c2db5f",
  "#6aa33c",
];
const BUSH = ["#5f9e3b", "#6fae41", "#4f8f37", "#7dba48"];
const FLOWERS = [
  "#fffaf0",
  "#fff1b8",
  "#ff9cbc",
  "#ff6f61",
  "#ffb347",
  "#ffd84d",
  "#c6a2ff",
  "#ff5d8f",
];
const GRASS = ["#7db53f", "#93c64a", "#68a23a", "#a6cf52"];
const STONES = ["#d8caa2", "#cdbd94", "#e2d6b2", "#c2b289"];
const ROCKS = ["#a6a99f", "#8f948b", "#b8b8ad", "#7f867c"];
const pick = <T>(random: () => number, list: T[]) =>
  list[Math.floor(random() * list.length)];

// Landmarks, props and test-walked approaches that trees must leave open.
const clearings = [
  ...locations.map((l) => ({
    x: l.position[0],
    z: l.position[2] + 0.5,
    r: l.id === "experience" ? 6.6 : 6,
  })),
  { x: PARKOUR_LODGE[0], z: PARKOUR_LODGE[2], r: 4.6 },
  { x: -16, z: 23, r: 3.6 },
  { x: 12, z: 24, r: 5.6 },
  { x: 6, z: 19, r: 2.6 },
  { x: -4, z: 18, r: 2.2 },
  { x: 0, z: 21, r: 4.4 },
  { x: -2, z: 9, r: 4 },
  { x: POND.x, z: POND.z, r: 4.4 },
  ...crystals.map((c) => ({ x: c.position[0], z: c.position[2], r: 1.6 })),
  ...villageWaypoints.map((w) => ({ x: w.x, z: w.z, r: 2.2 })),
];
const isClear = (x: number, z: number, pad = 0) =>
  clearings.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + pad);
// Building walls and doorsteps, where small plants would clip.
const footprints = [
  ...locations.map((l) => ({
    x: l.position[0],
    z: l.position[2],
    r: l.id === "experience" ? 4.3 : l.id === "contact" ? 3.2 : 3.6,
  })),
  { x: 6 - 4.6, z: -7 + 2.6, r: 2.2 },
  { x: PARKOUR_LODGE[0], z: PARKOUR_LODGE[2], r: 3.2 },
  { x: -16, z: 23, r: 1.8 },
  { x: 6, z: 19, r: 1.6 },
  { x: -4, z: 18, r: 1.6 },
  ...locations.map((l) => ({
    x: l.position[0] - 2.8,
    z: l.position[2] + 2.2,
    r: 1.6,
  })),
];
const onFootprint = (x: number, z: number) =>
  footprints.some((f) => Math.hypot(x - f.x, z - f.z) < f.r) ||
  (x > 7.6 && x < 16.4 && z > 21.2 && z < 26.8);
const riverGap = (x: number, z: number) => Math.abs(z - riverZ(x));
// Landmarks the isometric camera (looking from +x,+z) must be able to see:
// no tree stands just in front of them in screen space.
const sightlines = [
  ...locations.map((l) => ({ x: l.position[0], z: l.position[2], w: 3 })),
  { x: PARKOUR_LODGE[0], z: PARKOUR_LODGE[2], w: 2.6 },
  { x: -16, z: 23, w: 1.8 },
  { x: 12, z: 24, w: 4.2 },
  { x: 6, z: 19, w: 1.4 },
  { x: BRIDGE_X, z: riverZ(BRIDGE_X), w: 2 },
  { x: POND.x, z: POND.z, w: 3 },
];
const hidesLandmark = (x: number, z: number) =>
  sightlines.some((l) => {
    const depth = (x + z - l.x - l.z) / Math.SQRT2,
      lateral = Math.abs(x - z - l.x + l.z) / Math.SQRT2;
    return depth > 0 && depth < 9 && lateral < l.w + 1.4;
  });
const onIsland = (x: number, z: number, margin: number) =>
  Math.hypot(x, z) < WORLD_RADIUS - margin;

// Fence runs follow the banks away from footpaths: [fromX, toX, side].
const FENCE_RUNS: [number, number, 1 | -1][] = [
  [-24, -9, 1],
  [17, 26, 1],
  [-27, -18, -1],
  [13, 24, -1],
];
export const FENCE_OFFSET = RIVER_HALF_WIDTH + 1;

function addPine(
  out: Scenery,
  random: () => number,
  x: number,
  z: number,
  s: number,
) {
  out.trunks.push({
    position: [x, 0.6 * s, z],
    scale: [0.2 * s, 1.2 * s, 0.2 * s],
    color: "#6b4a2f",
  });
  const base = pick(random, PINE),
    spin = random() * Math.PI;
  for (let k = 0; k < 4; k++)
    out.cones.push({
      position: [x, (2.1 + k * 1.08) * s, z],
      scale: [
        (1.55 - k * 0.31) * s,
        (2.2 - k * 0.17) * s,
        (1.55 - k * 0.31) * s,
      ],
      rotation: spin + k * 0.45,
      color: k % 2 ? base : shade(base, 1.12),
    });
}
function addRoundTree(
  out: Scenery,
  random: () => number,
  x: number,
  z: number,
  s: number,
) {
  out.trunks.push({
    position: [x, 0.9 * s, z],
    scale: [0.22 * s, 1.8 * s, 0.22 * s],
    color: "#75513a",
  });
  const color = pick(random, ROUND);
  out.canopies.push({
    position: [x, 2.95 * s, z],
    scale: [1.55 * s, 1.42 * s, 1.55 * s],
    rotation: random() * Math.PI,
    color,
  });
  const lobes = 2 + Math.floor(random() * 2),
    start = random() * Math.PI * 2;
  for (let k = 0; k < lobes; k++) {
    const a = start + (k / lobes) * Math.PI * 2;
    out.canopies.push({
      position: [
        x + Math.cos(a) * 0.95 * s,
        (2.35 + random() * 0.5) * s,
        z + Math.sin(a) * 0.95 * s,
      ],
      scale: [0.95 * s, 0.9 * s, 0.95 * s],
      rotation: random() * Math.PI,
      color: shade(color, 0.9 + random() * 0.2),
    });
  }
  out.canopies.push({
    position: [x + 0.15 * s, 3.95 * s, z - 0.1 * s],
    scale: [0.85 * s, 0.8 * s, 0.85 * s],
    rotation: random() * Math.PI,
    color: shade(color, 1.1),
  });
}
function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16),
    channel = (shift: number) =>
      Math.min(255, Math.round(((n >> shift) & 255) * factor));
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0))
    .toString(16)
    .padStart(6, "0")}`;
}
function addBush(
  out: Scenery,
  random: () => number,
  x: number,
  z: number,
  s: number,
) {
  const color = pick(random, BUSH);
  const blobs = 2 + Math.floor(random() * 2);
  for (let k = 0; k < blobs; k++) {
    const a = random() * Math.PI * 2,
      r = k ? 0.35 * s : 0;
    out.bushes.push({
      position: [x + Math.cos(a) * r, 0.32 * s, z + Math.sin(a) * r],
      scale: [
        (k ? 0.42 : 0.55) * s,
        (k ? 0.36 : 0.46) * s,
        (k ? 0.42 : 0.55) * s,
      ],
      rotation: random() * Math.PI,
      color: shade(color, 0.92 + random() * 0.16),
    });
  }
  // Some shrubs carry blossoms like the cottage gardens.
  if (random() < 0.55) {
    const bloom = pick(random, FLOWERS);
    for (let k = 0; k < 4; k++) {
      const a = random() * Math.PI * 2;
      out.flowers.push({
        position: [
          x + Math.cos(a) * 0.38 * s,
          (0.45 + random() * 0.25) * s,
          z + Math.sin(a) * 0.38 * s,
        ],
        scale: [0.09, 0.09, 0.09],
        rotation: random() * Math.PI,
        color: bloom,
      });
    }
  }
}
function addFlowerPatch(
  out: Scenery,
  random: () => number,
  x: number,
  z: number,
) {
  const colors = [pick(random, FLOWERS), pick(random, FLOWERS)];
  out.leaves.push({
    position: [x, 0.06, z],
    scale: [0.66, 0.16, 0.6],
    rotation: random() * Math.PI,
    color: pick(random, BUSH),
  });
  const count = 5 + Math.floor(random() * 6);
  for (let k = 0; k < count; k++) {
    const a = random() * Math.PI * 2,
      r = Math.sqrt(random()) * 0.62,
      size = 0.095 + random() * 0.06;
    out.flowers.push({
      position: [
        x + Math.cos(a) * r,
        0.17 + random() * 0.14,
        z + Math.sin(a) * r,
      ],
      scale: [size, size * 0.8, size],
      rotation: random() * Math.PI,
      color: colors[k % 2],
    });
  }
}

export interface Scenery {
  trunks: Item[];
  cones: Item[];
  canopies: Item[];
  bushes: Item[];
  leaves: Item[];
  flowers: Item[];
  grass: Item[];
  paths: Item[];
  rocks: Item[];
  reeds: Item[];
  cattails: Item[];
  lilies: Item[];
  fencePosts: Item[];
  fenceRails: Item[];
  fenceColliders: FenceRail[];
  trees: { x: number; z: number; r: number }[];
}

export function makeScenery(): Scenery {
  const random = seeded(42);
  const out: Scenery = {
    trunks: [],
    cones: [],
    canopies: [],
    bushes: [],
    leaves: [],
    flowers: [],
    grass: [],
    paths: [],
    rocks: [],
    reeds: [],
    cattails: [],
    lilies: [],
    fencePosts: [],
    fenceRails: [],
    fenceColliders: [],
    trees: [],
  };
  const plant = (x: number, z: number, interior = false) => {
    if (!onIsland(x, z, 1.1)) return;
    if (riverGap(x, z) < RIVER_HALF_WIDTH + 1.7) return;
    if (!isClear(x, z) || pathDistance(x, z) < (interior ? 2.6 : 2)) return;
    if (hidesLandmark(x, z)) return;
    // The meadow south of the river stays open apart from its rim.
    if (z > riverZ(x) + 3 && Math.hypot(x, z) < 27.5) return;
    if (out.trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.85)) return;
    // Trees nearer the camera stay a little lower so the village reads.
    const front = (x + z) / Math.SQRT2,
      s = (0.85 + random() * 0.4) * (front > 18 ? 0.82 : 1);
    const pine = random() < (front < 0 ? 0.55 : front > 14 ? 0.25 : 0.4);
    if (pine) addPine(out, random, x, z, s);
    else addRoundTree(out, random, x, z, s);
    out.trees.push({ x, z, r: 0.4 });
  };
  for (let i = 0; i < 900 && out.trees.length < 185; i++) {
    const angle = random() * Math.PI * 2,
      radius = 18.5 + Math.sqrt(random()) * 12.6;
    plant(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  for (const [x, z] of [
    [-15, -9],
    [13, -6],
    [12, -10],
    [4, -14],
    [7.5, -15],
    [-19, 4],
  ])
    plant(x, z, true);

  for (let i = 0; i < 140; i++) {
    const angle = random() * Math.PI * 2,
      radius = 30.1 + random() * 2,
      x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if (riverGap(x, z) < RIVER_HALF_WIDTH + 1.4) continue;
    const size = 0.55 + random() * 1.05;
    out.rocks.push({
      position: [x, -0.15 - random() * 0.2, z],
      scale: [size * 1.25, size * 0.8, size],
      rotation: random() * 5,
      color: pick(random, ROCKS),
    });
  }
  for (let i = 0; i < 22; i++) {
    const x = (random() - 0.5) * 50,
      z = (random() - 0.5) * 50;
    if (
      !onIsland(x, z, 3) ||
      riverGap(x, z) < RIVER_HALF_WIDTH + 1 ||
      pathDistance(x, z) < 1.6 ||
      !isClear(x, z)
    )
      continue;
    const size = 0.35 + random() * 0.45;
    out.rocks.push({
      position: [x, 0.05, z],
      scale: [size * 1.3, size * 0.75, size],
      rotation: random() * 5,
      color: pick(random, ROCKS),
    });
  }

  // Riverbanks: rounded stones half in the water, reeds and lily pads.
  for (let x = -WORLD_RADIUS + 1; x < WORLD_RADIUS - 1; x += 1.15) {
    if (Math.abs(x - BRIDGE_X) < 2.6) continue;
    for (const side of [-1, 1]) {
      const jitter = (random() - 0.5) * 0.5,
        z =
          riverZ(x + jitter) + side * (RIVER_HALF_WIDTH + 0.1 + random() * 0.3);
      if (!onIsland(x + jitter, z, 1.2)) continue;
      const size = 0.22 + random() * 0.3;
      if (random() < 0.7)
        out.rocks.push({
          position: [x + jitter, -0.22, z],
          scale: [size * 1.35, size * 0.8, size],
          rotation: random() * 5,
          color: pick(random, ROCKS),
        });
      if (random() < 0.35) {
        for (let k = 0; k < 3; k++) {
          const rx = x + jitter + (random() - 0.5) * 0.6,
            rz = z + side * 0.25 + (random() - 0.5) * 0.4,
            h = 0.7 + random() * 0.5;
          out.reeds.push({
            position: [rx, h / 2 - 0.2, rz],
            scale: [0.03, h, 0.03],
            color: "#6f9a45",
          });
          if (k < 2)
            out.cattails.push({
              position: [rx, h - 0.15, rz],
              scale: [0.06, 0.22, 0.06],
              color: "#7a4f2f",
            });
        }
      }
      if (random() < 0.3) {
        const lx = x + (random() - 0.5) * 0.8,
          lz = riverZ(lx) + side * (RIVER_HALF_WIDTH - 0.5 - random() * 0.5),
          r = 0.22 + random() * 0.18;
        if (Math.abs(lx - BRIDGE_X) > 2.6 && onIsland(lx, lz, 1.5)) {
          out.lilies.push({
            position: [lx, -0.235, lz],
            scale: [r, 0.02, r],
            color: pick(random, ["#4fae48", "#5cb94f", "#3f9c43"]),
          });
          if (random() < 0.35)
            out.flowers.push({
              position: [lx, -0.17, lz],
              scale: [0.07, 0.06, 0.07],
              color: "#ffb3cf",
            });
        }
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + random() * 0.15,
      f = 1.06 + random() * 0.1,
      size = 0.3 + random() * 0.35;
    out.rocks.push({
      position: [
        POND.x + Math.cos(a) * POND.rx * f,
        -0.05,
        POND.z + Math.sin(a) * POND.rz * f,
      ],
      scale: [size * 1.3, size * 0.75, size],
      rotation: random() * 5,
      color: pick(random, ROCKS),
    });
  }
  for (let i = 0; i < 7; i++) {
    const a = random() * Math.PI * 2,
      f = random() * 0.7,
      r = 0.25 + random() * 0.2;
    out.lilies.push({
      position: [
        POND.x + Math.cos(a) * POND.rx * f,
        -0.235,
        POND.z + Math.sin(a) * POND.rz * f,
      ],
      scale: [r, 0.02, r],
      color: pick(random, ["#4fae48", "#5cb94f", "#3f9c43"]),
    });
  }

  // Fences with one thin collider per rail so they are not walk-through.
  for (const [from, to, side] of FENCE_RUNS) {
    const posts: [number, number][] = [];
    for (let x = from; x <= to + 0.01; x += 1.3)
      posts.push([x, riverZ(x) + side * (RIVER_HALF_WIDTH + 1)]);
    posts.forEach(([x, z], i) => {
      out.fencePosts.push({
        position: [x, 0.42, z],
        scale: [0.13, 0.84, 0.13],
        color: "#8a6440",
      });
      const next = posts[i + 1];
      if (!next) return;
      const length = Math.hypot(next[0] - x, next[1] - z),
        angle = -Math.atan2(next[1] - z, next[0] - x),
        mx = (x + next[0]) / 2,
        mz = (z + next[1]) / 2;
      for (const y of [0.34, 0.66])
        out.fenceRails.push({
          position: [mx, y, mz],
          scale: [length, 0.08, 0.07],
          rotation: angle,
          color: "#a37a4f",
        });
      out.fenceColliders.push({ x: mx, z: mz, angle, length });
    });
  }

  // Shrubs: around cottages, along paths and the riverbanks.
  for (let i = 0; i < 320 && out.bushes.length < 230; i++) {
    let x: number, z: number;
    if (i % 3 === 0) {
      const route = pick(random, PATH_ROUTES),
        [px, pz] = routePoint(route, random()),
        a = random() * Math.PI * 2;
      x = px + Math.cos(a) * (1.9 + random() * 0.8);
      z = pz + Math.sin(a) * (1.9 + random() * 0.8);
    } else if (i % 3 === 1) {
      const l = pick(random, locations),
        a = random() * Math.PI * 2;
      x = l.position[0] + Math.cos(a) * (4.4 + random() * 1.6);
      z = l.position[2] + Math.sin(a) * (4.4 + random() * 1.6);
    } else {
      const a = random() * Math.PI * 2,
        r = 8 + Math.sqrt(random()) * 20;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    if (
      !onIsland(x, z, 1.5) ||
      riverGap(x, z) < RIVER_HALF_WIDTH + 0.8 ||
      pathDistance(x, z) < 1.5 ||
      onFootprint(x, z) ||
      out.trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.1)
    )
      continue;
    addBush(out, random, x, z, 0.8 + random() * 0.5);
  }

  // Flower beds: lining paths, at cottage doors and scattered in the meadow.
  for (let i = 0; i < 420; i++) {
    let x: number, z: number;
    if (i % 2 === 0) {
      const route = pick(random, PATH_ROUTES),
        [px, pz] = routePoint(route, random()),
        a = random() * Math.PI * 2;
      x = px + Math.cos(a) * (1.3 + random() * 0.9);
      z = pz + Math.sin(a) * (1.3 + random() * 0.9);
    } else {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * 29;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    if (
      !onIsland(x, z, 1.2) ||
      riverGap(x, z) < RIVER_HALF_WIDTH + 0.6 ||
      pathDistance(x, z) < 1.05 ||
      onFootprint(x, z)
    )
      continue;
    addFlowerPatch(out, random, x, z);
  }

  for (let i = 0; i < 2600; i++) {
    const x = (random() - 0.5) * 62,
      z = (random() - 0.5) * 62;
    if (
      !onIsland(x, z, 0.6) ||
      riverGap(x, z) < RIVER_HALF_WIDTH + 0.45 ||
      pathDistance(x, z) < 1 ||
      onFootprint(x, z)
    )
      continue;
    out.grass.push({
      position: [x, 0.13, z],
      scale: [0.09 + random() * 0.04, 0.24 + random() * 0.22, 0.09],
      rotation: random() * Math.PI,
      color: pick(random, GRASS),
    });
  }

  // Seeded irregular stepping stones laid along the authored routes.
  for (const route of PATH_ROUTES)
    for (let i = 0; i < 32; i++) {
      const [x, z] = routePoint(route, i / 31);
      if (riverGap(x, z) < RIVER_HALF_WIDTH + 0.4) continue;
      for (let j = 0; j < 3; j++)
        out.paths.push({
          position: [
            x + (j - 1) * 0.66 + (random() - 0.5) * 0.22,
            0.035,
            z + (random() - 0.5) * 0.3,
          ],
          scale: [0.4 + random() * 0.14, 0.06, 0.32 + random() * 0.14],
          rotation: random() * 3,
          color: pick(random, STONES),
        });
    }
  return out;
}
