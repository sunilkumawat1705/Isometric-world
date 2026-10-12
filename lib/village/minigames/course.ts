// Jungle Trial: a self-contained river course far east of the village island.
// Everything here is pure data or pure maths so hazards, scoring and routes can
// be tested without WebGL. World units; `y` of a platform is its walkable top.
export type V3 = [number, number, number];
export const WATER_Y = -0.3;
// Player-centre height below which a fall counts as splashing into the river.
export const KILL_Y = -0.7;
export const PLAYER_CENTER_OFFSET = 0.72;
export const MAX_HEARTS = 5;
export const INVULNERABLE_SECONDS = 1.6;
export const ARENA_MIN_X = 60;
export const SPRING_VELOCITY = 12.5;
export const BOOST_SPEED = 12;
export const BOOST_SECONDS = 0.85;
export { PARKOUR_RETURN as RETURN_POSITION } from "./entrance";

export type PlatformKind = "island" | "stone" | "plank";
export interface Platform {
  id: string;
  kind: PlatformKind;
  x: number;
  y: number;
  z: number;
  w: number; // extent along x
  d: number; // extent along z
}
const P = (
  id: string,
  kind: PlatformKind,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
): Platform => ({ id, kind, x, y, z, w, d });
export const platforms: Platform[] = [
  P("I0", "island", 104, 0.5, 30, 6, 6),
  P("B1", "plank", 104, 0.5, 22.75, 2.4, 8.5),
  P("I1", "island", 104, 0.5, 15.5, 6, 6),
  P("s1", "stone", 99.2, 0.5, 15.5, 2.4, 2.4),
  P("s2", "stone", 95.6, 0.5, 15.5, 2.4, 2.4),
  P("s3", "stone", 92, 0.9, 15.5, 2.4, 2.4),
  P("I2", "island", 87, 0.9, 15.5, 6, 6),
  P("I3", "island", 87, 2.6, 5.5, 6, 6),
  P("t1", "stone", 87, 3.0, -0.2, 2.4, 2.4),
  P("t2", "stone", 84, 3.4, -3.6, 2.4, 2.4),
  P("t3", "stone", 87.4, 3.8, -7, 2.4, 2.4),
  P("t4", "stone", 90.8, 3.4, -10.2, 2.4, 2.4),
  P("I4", "island", 92, 2.8, -15, 6, 6),
  P("I5", "island", 70, 2.8, -15, 6, 6),
  P("B4", "plank", 70, 2.8, -23, 2.4, 12),
  P("I6", "island", 70, 2.8, -32, 6, 6),
  P("B5", "plank", 59.5, 2.8, -32, 15, 2.6),
  P("I7", "island", 43, 2.8, -32, 6, 6),
  P("u1", "stone", 43, 3.2, -37.4, 2.4, 2.4),
  P("u2", "stone", 40, 3.7, -40.6, 2.4, 2.4),
  P("u3", "stone", 43.4, 4.2, -43.8, 2.4, 2.4),
  P("u4", "stone", 40.5, 4.7, -47, 2.4, 2.4),
  P("I8", "island", 43, 5.2, -52.5, 8, 8),
  // Advanced stages: precision jumps, a narrow log bridge, then a spiked ascent.
  P("v1", "stone", 49.2, 5.2, -52.5, 1.8, 1.8),
  P("v2", "stone", 52.6, 5.2, -52.5, 1.8, 1.8),
  P("I9", "island", 57.2, 5.2, -52.5, 4.8, 4.8),
  P("B6", "plank", 64.6, 5.2, -52.5, 10, 1.6),
  P("I10", "island", 72, 5.2, -52.5, 4.8, 4.8),
  P("w1", "stone", 72, 5.6, -57, 1.8, 1.8),
  P("w2", "stone", 72, 6.0, -60.4, 1.8, 1.8),
  P("w3", "stone", 72, 6.4, -63.8, 1.8, 1.8),
  P("I11", "island", 72, 6.4, -67, 5.2, 5.2),
];
export const platformById = (id: string) => platforms.find((p) => p.id === id)!;

// Flags: stand anywhere on the platform to bank progress. Index 0 is the start
// and the last entry is the goal.
export const checkpointIds = [
  "I0",
  "I1",
  "I2",
  "I3",
  "I4",
  "I5",
  "I6",
  "I7",
  "I8",
  "I9",
  "I10",
  "I11",
] as const;
export const checkpoints = checkpointIds.map((id) => {
  const p = platformById(id);
  return {
    id,
    x: p.x,
    y: p.y,
    z: p.z,
    hx: p.w / 2 - 0.25,
    hz: p.d / 2 - 0.25,
  };
});
export const trail: V3[] = checkpoints.map((c) => [c.x, c.y, c.z]);

// Moving rafts carry the player. position = centre + axis * amp * sin(...)
export interface Raft {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  axis: [number, number]; // unit travel direction in x/z
  amp: number;
  period: number;
  phase: number;
}
export const rafts: Raft[] = [
  {
    id: "rA",
    x: 84.25,
    y: 2.8,
    z: -15,
    size: 2.8,
    axis: [1, 0],
    amp: 1.25,
    period: 5,
    phase: 0,
  },
  {
    id: "rB",
    x: 78.4,
    y: 2.8,
    z: -15,
    size: 2.8,
    axis: [1, 0],
    amp: 1.25,
    period: 5,
    phase: Math.PI,
  },
];
export function raftPosition(r: Raft, t: number): V3 {
  const o = r.amp * Math.sin((t / r.period) * Math.PI * 2 + r.phase);
  return [r.x + r.axis[0] * o, r.y, r.z + r.axis[1] * o];
}

// Rolling logs. `along` is the axis the log travels on ("z" = bridge runs north
// to south); the log itself lies across the bridge.
export interface Log {
  id: string;
  x: number;
  y: number; // bridge deck top
  z: number;
  along: "x" | "z";
  amp: number;
  period: number;
  phase: number;
  radius: number;
  halfLength: number;
}
export const logs: Log[] = [
  {
    id: "L4",
    x: 63,
    y: 5.2,
    z: -52.5,
    along: "x",
    amp: 2.5,
    period: 2.7,
    phase: 0,
    radius: 0.45,
    halfLength: 1.1,
  },
  {
    id: "L5",
    x: 67,
    y: 5.2,
    z: -52.5,
    along: "x",
    amp: 2,
    period: 2.4,
    phase: 1.4,
    radius: 0.45,
    halfLength: 1.1,
  },
  {
    id: "L1",
    x: 104,
    y: 0.5,
    z: 22.75,
    along: "z",
    amp: 3.4,
    period: 4.2,
    phase: 0,
    radius: 0.45,
    halfLength: 1.45,
  },
  {
    id: "L2",
    x: 58,
    y: 2.8,
    z: -32,
    along: "x",
    amp: 2.5,
    period: 3.0,
    phase: 0,
    radius: 0.45,
    halfLength: 1.5,
  },
  {
    id: "L3",
    x: 63,
    y: 2.8,
    z: -32,
    along: "x",
    amp: 2.5,
    period: 3.0,
    phase: 1.5,
    radius: 0.45,
    halfLength: 1.5,
  },
];
export function logPosition(l: Log, t: number): V3 {
  const o = l.amp * Math.sin((t / l.period) * Math.PI * 2 + l.phase);
  return l.along === "z"
    ? [l.x, l.y + l.radius, l.z + o]
    : [l.x + o, l.y + l.radius, l.z];
}

// Spiked balls swing across the route on a rope.
export interface Swing {
  id: string;
  x: number;
  y: number; // anchor height
  z: number;
  plane: "x" | "z"; // direction the pendulum travels
  length: number;
  amp: number; // radians
  period: number;
  phase: number;
}
export const swings: Swing[] = [
  {
    id: "W5",
    x: 52.6,
    y: 10,
    z: -52.5,
    plane: "z",
    length: 4.1,
    amp: 0.85,
    period: 2.6,
    phase: 0.9,
  },
  {
    id: "W6",
    x: 72,
    y: 10.8,
    z: -60.4,
    plane: "x",
    length: 4.4,
    amp: 0.85,
    period: 2.5,
    phase: 1.1,
  },
  {
    id: "W1",
    x: 95.6,
    y: 5.2,
    z: 15.5,
    plane: "z",
    length: 4,
    amp: 0.95,
    period: 3.2,
    phase: 0,
  },
  {
    id: "W2",
    x: 87.4,
    y: 8.2,
    z: -7,
    plane: "x",
    length: 4,
    amp: 0.9,
    period: 3.4,
    phase: 1.2,
  },
  {
    id: "W3",
    x: 40,
    y: 9.3,
    z: -40.6,
    plane: "x",
    length: 4.6,
    amp: 0.9,
    period: 2.65,
    phase: 0.4,
  },
  {
    id: "W4",
    x: 42,
    y: 10.3,
    z: -45.4,
    plane: "z",
    length: 5.1,
    amp: 0.85,
    period: 2.8,
    phase: 2.2,
  },
];
export const BALL_RADIUS = 0.5;
export function swingAngle(s: Swing, t: number) {
  return s.amp * Math.sin((t / s.period) * Math.PI * 2 + s.phase);
}
export function swingBall(s: Swing, t: number): V3 {
  const a = swingAngle(s, t),
    o = Math.sin(a) * s.length;
  return [
    s.x + (s.plane === "x" ? o : 0),
    s.y - Math.cos(a) * s.length,
    s.z + (s.plane === "z" ? o : 0),
  ];
}

// Bramble Grunts patrol a planks section and can be stomped.
export interface Grunt {
  id: string;
  a: V3;
  b: V3;
  speed: number;
  phase: number; // 0..1 along the loop
}
export const GRUNT_SIZE = 0.85;
export const grunts: Grunt[] = [
  {
    id: "G3",
    a: [56, 5.2, -53.6],
    b: [58.4, 5.2, -51.4],
    speed: 2.3,
    phase: 0.25,
  },
  {
    id: "G1",
    a: [70, 2.8, -19.4],
    b: [70, 2.8, -25.6],
    speed: 1.5,
    phase: 0,
  },
  {
    id: "G2",
    a: [70, 2.8, -26.8],
    b: [70, 2.8, -21],
    speed: 2.1,
    phase: 0.5,
  },
];
export function gruntPosition(g: Grunt, t: number): V3 {
  const len = Math.hypot(g.b[0] - g.a[0], g.b[2] - g.a[2]),
    loop = (t * g.speed) / len + g.phase,
    tri = 1 - Math.abs((loop % 2) - 1); // 0..1..0
  return [
    g.a[0] + (g.b[0] - g.a[0]) * tri,
    g.a[1],
    g.a[2] + (g.b[2] - g.a[2]) * tri,
  ];
}

export interface Spring {
  id: string;
  x: number;
  y: number;
  z: number;
}
export const springs: Spring[] = [{ id: "m1", x: 87, y: 0.9, z: 12.9 }];
export interface Boost {
  id: string;
  x: number;
  y: number;
  z: number;
  dir: [number, number];
  hx: number;
  hz: number;
}
export const boosts: Boost[] = [
  { id: "b1", x: 54.2, y: 2.8, z: -32, dir: [-1, 0], hx: 0.95, hz: 1.2 },
];

export type Collectible = { id: string; kind: "gem" | "heart"; position: V3 };
function line(from: V3, to: V3, n: number, arc = 0): V3[] {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t + Math.sin(Math.PI * t) * arc,
      from[2] + (to[2] - from[2]) * t,
    ] as V3;
  });
}
function through(points: V3[], per: number, arc = 0): V3[] {
  return points.flatMap((p, i) =>
    i === 0 ? [p] : line(points[i - 1], p, per + 1, arc).slice(1),
  );
}
const lifted = (ids: string[], height: number): V3[] =>
  ids.map((id) => {
    const p = platformById(id);
    return [p.x, p.y + height, p.z] as V3;
  });
const gemPoints: V3[] = [
  ...through(lifted(["v1", "v2", "I9"], 1.2), 2, 0.6),
  ...line([60, 6.4, -52.5], [69.5, 6.4, -52.5], 6, 1.0),
  ...through(lifted(["w1", "w2", "w3", "I11"], 1.2), 2, 0.7),
  ...line([104, 1.5, 26.5], [104, 1.5, 19.5], 5),
  ...line([101, 1.6, 15.5], [90.4, 2.0, 15.5], 6, 0.8),
  ...line([87.4, 2.2, 12.2], [87, 3.8, 6.8], 6, 3.4),
  ...through(lifted(["t1", "t2", "t3", "t4"], 1.2), 1, 0.7),
  ...line([89, 3.9, -15], [74, 3.9, -15], 7, 0.8),
  ...line([70, 3.7, -19], [70, 3.7, -29], 5, 1.4),
  ...line([66, 3.7, -32], [56, 3.7, -32], 5, 1.1),
  ...line([52, 4.4, -32], [46, 4.0, -32], 4, 1.4),
  ...through(lifted(["u1", "u2", "u3", "u4"], 1.2), 1, 0.6),
  [41.6, 6.2, -52.5],
  [43, 6.2, -52.5],
  [44.4, 6.2, -52.5],
];
export const collectibles: Collectible[] = [
  { id: "heart-3", kind: "heart", position: [58.8, 6.4, -53.6] },
  ...gemPoints.map((position, i): Collectible => ({
    id: `gem-${i}`,
    kind: "gem",
    position,
  })),
  {
    id: "heart-1",
    kind: "heart",
    position: [84, 4.6, -3.6],
  },
  {
    id: "heart-2",
    kind: "heart",
    position: [59.5, 4.2, -32],
  },
];
export const totalGems = collectibles.filter((c) => c.kind === "gem").length;
export const PICKUP_RADIUS = 1;

export interface PlayerSnapshot {
  x: number;
  y: number; // capsule centre
  z: number;
  vy: number;
}
export type HazardEvent =
  | { kind: "hurt"; id: string; from: [number, number] }
  | { kind: "stomp"; id: string };
const feet = (p: PlayerSnapshot) => p.y - PLAYER_CENTER_OFFSET;
const PLAYER_RADIUS = 0.34;
// Distance from a point to the vertical segment that approximates the capsule.
function distanceToPlayer(p: PlayerSnapshot, c: V3) {
  const y = Math.max(p.y - 0.4, Math.min(p.y + 0.4, c[1]));
  return Math.hypot(p.x - c[0], y - c[1], p.z - c[2]);
}
export function evaluateHazards(
  p: PlayerSnapshot,
  t: number,
  defeated: ReadonlySet<string>,
): HazardEvent[] {
  const events: HazardEvent[] = [];
  for (const l of logs) {
    const [cx, cy, cz] = logPosition(l, t),
      across = l.along === "z" ? Math.abs(p.x - cx) : Math.abs(p.z - cz),
      travel = l.along === "z" ? Math.abs(p.z - cz) : Math.abs(p.x - cx);
    if (
      across < l.halfLength &&
      travel < l.radius + PLAYER_RADIUS &&
      feet(p) < cy + l.radius - 0.1 &&
      feet(p) > l.y - 0.6
    )
      events.push({ kind: "hurt", id: l.id, from: [cx, cz] });
  }
  for (const s of swings) {
    const ball = swingBall(s, t);
    if (distanceToPlayer(p, ball) < BALL_RADIUS + PLAYER_RADIUS)
      events.push({ kind: "hurt", id: s.id, from: [ball[0], ball[2]] });
  }
  for (const g of grunts) {
    if (defeated.has(g.id)) continue;
    const [gx, gy, gz] = gruntPosition(g, t),
      half = GRUNT_SIZE / 2;
    if (
      Math.abs(p.x - gx) < half + PLAYER_RADIUS &&
      Math.abs(p.z - gz) < half + PLAYER_RADIUS &&
      feet(p) < gy + GRUNT_SIZE + 0.1 &&
      feet(p) > gy - 0.6
    ) {
      if (p.vy < -0.5 && feet(p) > gy + GRUNT_SIZE * 0.45)
        events.push({ kind: "stomp", id: g.id });
      else events.push({ kind: "hurt", id: g.id, from: [gx, gz] });
    }
  }
  return events;
}
export function nearestCheckpointIndex(x: number, y: number, z: number) {
  return checkpoints.findIndex(
    (c) =>
      Math.abs(x - c.x) <= c.hx &&
      Math.abs(z - c.z) <= c.hz &&
      y - PLAYER_CENTER_OFFSET >= c.y - 0.15 &&
      y - PLAYER_CENTER_OFFSET <= c.y + 1,
  );
}
export function parkourStars(gems: number, hearts: number) {
  const ratio = totalGems ? gems / totalGems : 0;
  return 1 + Number(ratio >= 0.6) + Number(ratio >= 0.9 && hearts >= 3);
}
// Reaching the goal from the start is only worth it if every jump is possible.
// Used by tests: horizontal gap between two platforms' footprints.
export function footprintGap(a: Platform, b: Platform) {
  const dx = Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2),
    dz = Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2);
  return Math.hypot(dx, dz);
}
