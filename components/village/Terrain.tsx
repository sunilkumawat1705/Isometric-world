"use client";
/* Three.js uniforms are intentionally mutated from frame callbacks. */
/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Glow } from "./Primitives";
import { stylizedWater } from "./waterShader";
import {
  POND,
  RIVER_HALF_WIDTH,
  WATER_LEVEL,
  WORLD_RADIUS,
  groundHeight,
  pathDistance,
  riverZ,
} from "@/lib/village/terrain";
import { seeded } from "@/lib/village/logic";
import { useGame } from "@/lib/village/store";

function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz,
    ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz),
    b = hash(ix + 1, iz),
    c = hash(ix, iz + 1),
    d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const palette = {
  deep: new THREE.Color("#6ea437"),
  mid: new THREE.Color("#93c243"),
  light: new THREE.Color("#b2d44f"),
  sun: new THREE.Color("#cadc5f"),
  path: new THREE.Color("#c9b283"),
  bank: new THREE.Color("#8e6a42"),
  bed: new THREE.Color("#4d7a62"),
};

// One mesh for the whole meadow, replacing hundreds of collider-sized boxes.
function makeGround() {
  const R = WORLD_RADIUS,
    step = 0.5,
    n = Math.round((R * 2) / step),
    positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [],
    inside: boolean[] = [],
    color = new THREE.Color();
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      let x = -R + i * step,
        z = -R + j * step;
      const r = Math.hypot(x, z);
      inside.push(r <= R + step);
      if (r > R) {
        x *= R / r;
        z *= R / r;
      }
      const y = groundHeight(x, z);
      positions.push(x, y, z);
      const patch =
        noise(x * 0.11, z * 0.11) * 0.7 + noise(x * 0.37, z * 0.37) * 0.3;
      color.copy(palette.deep).lerp(palette.mid, smooth(0.22, 0.5, patch));
      color.lerp(palette.light, smooth(0.52, 0.78, patch));
      color.lerp(palette.sun, smooth(0.8, 0.95, patch) * 0.8);
      color.multiplyScalar(0.95 + hash(x * 3.1, z * 2.7) * 0.08);
      color.lerp(
        palette.path,
        (1 - smooth(0.85, 1.55, pathDistance(x, z))) * 0.8,
      );
      if (y < -0.02) {
        color.lerp(palette.bank, smooth(-0.02, -0.18, y));
        color.lerp(palette.bed, smooth(-0.3, -0.6, y));
      }
      colors.push(color.r, color.g, color.b);
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const a = i * (n + 1) + j,
        b = a + n + 1;
      if (!inside[a] && !inside[b] && !inside[a + 1] && !inside[b + 1])
        continue;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Earthen island flank: grass lip over layered dirt, tapering below.
function makeCliff() {
  const R = WORLD_RADIUS + 0.04,
    segments = 180,
    rings = [
      { y: 0.02, r: 0, c: "#78b043" },
      { y: -0.26, r: 0.07, c: "#5e9436" },
      { y: -0.7, r: 0.02, c: "#9a6b40" },
      { y: -1.4, r: -0.12, c: "#875b37" },
      { y: -2.15, r: -0.35, c: "#71492e" },
      { y: -2.85, r: -0.7, c: "#5c3b26" },
      { y: -3.45, r: -1.15, c: "#48301f" },
      { y: -3.95, r: -1.8, c: "#382519" },
    ],
    random = seeded(7),
    grid: THREE.Vector3[][] = [],
    colors: THREE.Color[] = rings.map((ring) => new THREE.Color(ring.c));
  rings.forEach((ring, k) => {
    const row: THREE.Vector3[] = [];
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2,
        jitter = k > 1 ? (random() - 0.5) * 0.55 : 0,
        r = R + ring.r + jitter,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      // Notch the lip where the river spills over the edge.
      const notch = k < 2 && Math.abs(z - riverZ(x)) < RIVER_HALF_WIDTH + 0.2;
      row.push(
        new THREE.Vector3(x, notch ? WATER_LEVEL - 0.08 - k * 0.1 : ring.y, z),
      );
    }
    grid.push(row);
  });
  const positions: number[] = [],
    vertexColors: number[] = [];
  for (let k = 0; k < rings.length - 1; k++)
    for (let s = 0; s < segments; s++) {
      const t = (s + 1) % segments,
        // Counter-clockwise as seen from outside the island.
        quad = [
          grid[k][s],
          grid[k][t],
          grid[k + 1][s],
          grid[k][t],
          grid[k + 1][t],
          grid[k + 1][s],
        ];
      const shade = 0.9 + random() * 0.18;
      quad.forEach((p, q) => {
        positions.push(p.x, p.y, p.z);
        const c = colors[q === 2 || q === 4 || q === 5 ? k + 1 : k];
        vertexColors.push(c.r * shade, c.g * shade, c.b * shade);
      });
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(vertexColors, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function makeRiver() {
  const vertices: number[] = [],
    indices: number[] = [];
  let previous = false;
  const half = RIVER_HALF_WIDTH + 0.35;
  for (let i = 0; i <= 256; i++) {
    const x = -WORLD_RADIUS - 0.5 + (i * (WORLD_RADIUS + 0.5) * 2) / 256;
    const edge = Math.sqrt(Math.max(0, (WORLD_RADIUS + 0.2) ** 2 - x ** 2));
    const from = Math.max(-edge, riverZ(x) - half);
    const to = Math.min(edge, riverZ(x) + half);
    if (to <= from) {
      previous = false;
      continue;
    }
    const a = vertices.length / 3;
    vertices.push(x, WATER_LEVEL, from, x, WATER_LEVEL, to);
    if (previous) indices.push(a - 2, a - 1, a, a - 1, a + 1, a);
    previous = true;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// Where the river centreline meets the island rim, on each side.
function riverMouth(sign: 1 | -1) {
  let lo = 0,
    hi = WORLD_RADIUS * sign;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (Math.hypot(mid, riverZ(mid)) < WORLD_RADIUS) lo = mid;
    else hi = mid;
  }
  return new THREE.Vector3(lo, WATER_LEVEL, riverZ(lo));
}
function makeFall(mouth: THREE.Vector3) {
  const out = new THREE.Vector3(mouth.x, 0, mouth.z).normalize(),
    across = new THREE.Vector3(-out.z, 0, out.x),
    width = RIVER_HALF_WIDTH * 2 - 0.4,
    columns = 10,
    rows = 14,
    positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows,
      drop = v * 3.9,
      push = 0.1 + Math.sqrt(v) * 0.75 - v * 0.25;
    for (let c = 0; c <= columns; c++) {
      const u = c / columns,
        sway = (u - 0.5) * width * (1 - v * 0.12),
        bow = Math.cos((u - 0.5) * Math.PI) * 0.12;
      positions.push(
        mouth.x + across.x * sway + out.x * (push + bow),
        mouth.y + 0.02 - drop,
        mouth.z + across.z * sway + out.z * (push + bow),
      );
      uvs.push(u, 1 - v);
      if (r < rows && c < columns) {
        const a = r * (columns + 1) + c;
        indices.push(
          a,
          a + columns + 1,
          a + 1,
          a + 1,
          a + columns + 1,
          a + columns + 2,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return {
    geometry: g,
    base: mouth
      .clone()
      .addScaledVector(out, 1)
      .setY(WATER_LEVEL - 3.7),
  };
}
const fallVertex = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const fallFragment = `uniform float uTime; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y); }
void main() {
  float flow = vUv.y * 3.0 + uTime * 1.6;
  float streak = n(vec2(vUv.x * 22.0, flow)) * 0.65 + n(vec2(vUv.x * 47.0, flow * 1.7)) * 0.35;
  vec3 water = mix(vec3(0.16, 0.62, 0.74), vec3(0.93, 0.99, 1.0), smoothstep(0.42, 0.78, streak));
  water = mix(water, vec3(0.95, 1.0, 1.0), smoothstep(0.9, 1.0, vUv.y) + smoothstep(0.25, 0.0, vUv.y) * 0.6);
  float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  float alpha = edge * smoothstep(0.0, 0.3, vUv.y) * (0.78 + 0.22 * streak);
  gl_FragColor = vec4(water, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function Waterfall({ sign }: { sign: 1 | -1 }) {
  const fall = useMemo(() => makeFall(riverMouth(sign)), [sign]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []),
    mist = useRef<THREE.Group>(null),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (reduced) return;
    uniforms.uTime.value = clock.elapsedTime;
    mist.current?.children.forEach((puff, i) => {
      const t = (clock.elapsedTime * 0.25 + i / 3) % 1;
      puff.position.y = t * 1.6;
      puff.scale.setScalar(1.6 + t * 2.2);
      ((puff as THREE.Sprite).material as THREE.SpriteMaterial).opacity =
        0.32 * Math.sin(t * Math.PI);
    });
  });
  return (
    <>
      <mesh geometry={fall.geometry} renderOrder={3}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={fallVertex}
          fragmentShader={fallFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={mist} position={fall.base}>
        {[0, 1, 2].map((i) => (
          <Glow
            key={i}
            color="#e9fbff"
            size={2}
            opacity={0.25}
            position={[(i - 1) * 0.9, 0, 0]}
          />
        ))}
      </group>
    </>
  );
}

export default function Terrain() {
  const ground = useMemo(() => makeGround(), []),
    cliff = useMemo(() => makeCliff(), []),
    river = useMemo(() => makeRiver(), []),
    time = useRef({ value: 0 }),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (!reduced) time.current.value = clock.elapsedTime;
  });
  return (
    <>
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <mesh geometry={cliff} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} flatShading />
      </mesh>
      <mesh geometry={river} receiveShadow>
        <meshStandardMaterial
          roughness={0.22}
          metalness={0}
          customProgramCacheKey={() => "water-river-v3"}
          onBeforeCompile={(shader) =>
            stylizedWater(shader, time.current, { kind: "river" })
          }
        />
      </mesh>
      <mesh
        position={[POND.x, WATER_LEVEL, POND.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[POND.rx * 1.06, POND.rz * 1.06, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial
          roughness={0.22}
          metalness={0}
          customProgramCacheKey={() => "water-pond-v3"}
          onBeforeCompile={(shader) =>
            stylizedWater(shader, time.current, { kind: "pond", ...POND })
          }
        />
      </mesh>
      <Waterfall sign={1} />
      <Waterfall sign={-1} />
    </>
  );
}
