"use client";
import { stylizedWater } from "../waterShader";
/* Three.js scene objects are intentionally mutated from frame callbacks. */
/* eslint-disable react-hooks/immutability */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Box, Cone, Cylinder, Rock, geometries } from "../Primitives";
import { useGame } from "@/lib/village/store";
import { adventureRuntime, useAdventure } from "@/lib/village/minigames/store";
import { playCue } from "@/lib/village/minigames/audio";
import {
  BALL_RADIUS,
  BOOST_SPEED,
  GRUNT_SIZE,
  INVULNERABLE_SECONDS,
  MAX_HEARTS,
  PICKUP_RADIUS,
  PLAYER_CENTER_OFFSET,
  SPRING_VELOCITY,
  WATER_Y,
  boosts,
  checkpoints,
  collectibles,
  evaluateHazards,
  gruntPosition,
  grunts,
  logPosition,
  logs,
  platforms,
  raftPosition,
  rafts,
  springs,
  swingAngle,
  swings,
  type Platform,
  type V3,
} from "@/lib/village/minigames/course";

// ---------------------------------------------------------------- utilities
// Hazards are driven by the fixed-step course clock. Between steps, render
// frames extrapolate up to one step so motion stays smooth on fast displays.
function visualTime() {
  const rt = adventureRuntime;
  return (
    rt.courseTime +
    (rt.live
      ? Math.min(Math.max((performance.now() - rt.stepWall) / 1000, 0), 1 / 60)
      : 0)
  );
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Inst = { p: V3; s: V3; r?: V3; c?: string };
const dummy = new THREE.Object3D();
const tint = new THREE.Color();
function Instanced({
  geometry,
  items,
  castShadow = true,
  receiveShadow = true,
  renderOrder,
  children,
}: {
  geometry: THREE.BufferGeometry;
  items: Inst[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
  children?: React.ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      dummy.position.set(...it.p);
      dummy.scale.set(...it.s);
      dummy.rotation.set(...(it.r ?? [0, 0, 0]), "YXZ");
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint.set(it.c ?? "#ffffff"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
      renderOrder={renderOrder}
      dispose={null}
    >
      {children ?? <meshStandardMaterial roughness={0.92} flatShading />}
    </instancedMesh>
  );
}
const plane = new THREE.PlaneGeometry(1, 1);
const pick = <T,>(random: () => number, list: T[]) =>
  list[Math.floor(random() * list.length)];
const PLANKS = ["#b98a56", "#a87c4a", "#c4955f", "#b08150"];
const COURSE_GRASS = ["#86d04f", "#7cc94a", "#8ed652"];
const WILD_GRASS = ["#6cbf3f", "#5fb53a", "#79c845"];
const WILD_ROCKS = ["#b9b3a0", "#aaa48f", "#c3bda8"];
const LEAVES = ["#3fa84a", "#2f9a44", "#52b84e", "#278c3f"];
const BLOSSOMS = ["#ff5d6c", "#ff8fb8", "#fff6e6", "#ffd84d", "#c9a0ff"];

// Dressed-stone island flanks: staggered block courses on vertical faces,
// darkening towards the waterline. Works for instanced and plain meshes.
function stoneBlocks(shader: Parameters<THREE.Material["onBeforeCompile"]>[0]) {
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying vec3 vStoneWorld;",
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec4 stoneWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        stoneWorld = instanceMatrix * stoneWorld;
      #endif
      vStoneWorld = (modelMatrix * stoneWorld).xyz;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying vec3 vStoneWorld;",
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec3 stoneNormal = normalize(cross(dFdx(vStoneWorld), dFdy(vStoneWorld)));
      if (abs(stoneNormal.y) < 0.5) {
        float course = floor(vStoneWorld.y / 0.5);
        float along = (abs(stoneNormal.x) > abs(stoneNormal.z) ? vStoneWorld.z : vStoneWorld.x) + course * 0.45;
        vec2 cell = vec2(floor(along / 0.9), course);
        float fy = fract(vStoneWorld.y / 0.5), fu = fract(along / 0.9);
        float joint = step(0.07, fy) * step(0.035, fu) * step(fu, 0.965);
        float tone = 0.88 + 0.16 * fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        diffuseColor.rgb *= mix(0.62, tone, joint);
        diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(${WATER_Y.toFixed(2)} - 0.8, ${WATER_Y.toFixed(2)} + 0.4, vStoneWorld.y));
      }`,
    );
}

// ------------------------------------------------------------ procedural art
function canvasTexture(
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
function useTextures() {
  return useMemo(() => {
    const chevron = canvasTexture(128, 128, (g) => {
      g.fillStyle = "#2f9f6a";
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = "#e9fff1";
      g.lineWidth = 15;
      g.lineCap = "round";
      g.lineJoin = "round";
      for (const y of [40, 86]) {
        g.beginPath();
        g.moveTo(34, y + 22);
        g.lineTo(64, y - 8);
        g.lineTo(94, y + 22);
        g.stroke();
      }
    });
    const waterfall = canvasTexture(128, 256, (g) => {
      const random = mulberry32(9);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 46; i++) {
        const x = random() * 128,
          w = 2 + random() * 6,
          top = random() * 256,
          len = 50 + random() * 150;
        g.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.55})`;
        g.fillRect(x, top, w, len);
        // Wrap streaks so the texture scrolls without a seam.
        if (top + len > 256) g.fillRect(x, top - 256, w, len);
      }
    });
    const foam = canvasTexture(128, 128, (g) => {
      const gradient = g.createRadialGradient(64, 64, 10, 64, 64, 64);
      gradient.addColorStop(0, "rgba(190,255,245,0.55)");
      gradient.addColorStop(0.55, "rgba(190,255,245,0.35)");
      gradient.addColorStop(0.66, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.74, "rgba(255,255,255,0.15)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gradient;
      g.fillRect(0, 0, 128, 128);
    });
    foam.wrapS = foam.wrapT = THREE.ClampToEdgeWrapping;
    return { chevron, waterfall, foam };
  }, []);
}
function makeSpikeBall() {
  const parts: THREE.BufferGeometry[] = [];
  const paint = (g: THREE.BufferGeometry, hex: string) => {
    const c = new THREE.Color(hex),
      count = g.getAttribute("position").count,
      colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) c.toArray(colors, i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  };
  parts.push(paint(new THREE.IcosahedronGeometry(0.48, 1), "#c8344b"));
  const directions: THREE.Vector3[] = [];
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute("position");
  for (let i = 0; i < ico.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
    if (!directions.some((d) => d.distanceTo(v) < 0.01)) directions.push(v);
  }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1])
        directions.push(new THREE.Vector3(sx, sy, sz).normalize());
  const up = new THREE.Vector3(0, 1, 0);
  for (const d of directions) {
    const spike = new THREE.ConeGeometry(0.12, 0.36, 6);
    spike.translate(0, 0.46 + 0.18, 0);
    spike.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d));
    parts.push(paint(spike.toNonIndexed(), "#f2e3c2"));
  }
  return mergeGeometries(parts)!;
}
function makeHeart() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.34);
  shape.bezierCurveTo(-0.62, 0.05, -0.38, 0.5, 0, 0.22);
  shape.bezierCurveTo(0.38, 0.5, 0.62, 0.05, 0, -0.34);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 2,
  });
  g.center();
  return g;
}

// -------------------------------------------------------------------- scenery
type Fall = { p: V3; w: number; h: number; rotY: number };
type Watcher = { p: V3; s: number; rotY: number };
interface Scenery {
  pillars: Inst[];
  caps: Inst[];
  tufts: Inst[];
  ferns: Inst[];
  trunks: Inst[];
  leaves: Inst[];
  lilies: Inst[];
  blossoms: Inst[];
  bushes: Inst[];
  coconuts: Inst[];
  bands: Inst[];
  foam: Inst[];
  planks: Inst[];
  piles: Inst[];
  ropes: Inst[];
  hangs: Inst[];
  falls: Fall[];
  watchers: Watcher[];
}
// Gap between a footprint and the nearest course platform (or raft lane).
const lane = { x: 81.5, z: -15, w: 16, d: 4.4 };
const keepOut: { x: number; z: number; w: number; d: number }[] = [
  ...platforms.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d })),
  lane,
  // Boost jump gap must stay open water.
  { x: 49.5, z: -32, w: 7, d: 4 },
];
function gapTo(x: number, z: number, w: number, d: number) {
  let best = Infinity;
  for (const k of keepOut) {
    const dx = Math.max(0, Math.abs(x - k.x) - (w + k.w) / 2),
      dz = Math.max(0, Math.abs(z - k.z) - (d + k.d) / 2);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}
const finalFlag = checkpoints[checkpoints.length - 1];
const guardianBase = {
  x: finalFlag.x,
  z: finalFlag.z - 8.5,
  w: 10,
  d: 6.5,
  top: finalFlag.y,
};
function buildScenery(low: boolean): Scenery {
  const random = mulberry32(1337),
    s: Scenery = {
      pillars: [],
      caps: [],
      tufts: [],
      ferns: [],
      trunks: [],
      leaves: [],
      lilies: [],
      blossoms: [],
      bushes: [],
      coconuts: [],
      bands: [],
      foam: [],
      planks: [],
      piles: [],
      ropes: [],
      hangs: [],
      falls: [],
      watchers: [],
    };
  const placed: { x: number; z: number; w: number; d: number }[] = [
    { ...guardianBase },
  ];
  const addTufts = (
    x: number,
    top: number,
    z: number,
    w: number,
    d: number,
    count: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const tx = x + (random() - 0.5) * (w - 0.5),
        tz = z + (random() - 0.5) * (d - 0.5),
        h = 0.35 + random() * 0.4;
      s.tufts.push({
        p: [tx, top + h / 2, tz],
        s: [0.16 + random() * 0.1, h, 0.16 + random() * 0.1],
        c: pick(random, LEAVES),
      });
      if (random() < 0.4) {
        const bloom = pick(random, BLOSSOMS);
        for (let k = 0; k < 3; k++)
          s.blossoms.push({
            p: [
              tx + (random() - 0.5) * 0.45,
              top + 0.12 + random() * 0.12,
              tz + (random() - 0.5) * 0.45,
            ],
            s: [0.09, 0.08, 0.09],
            r: [0, random() * Math.PI, 0],
            c: bloom,
          });
      }
      if (random() < 0.12)
        s.bushes.push({
          p: [tx, top + 0.22, tz],
          s: [0.42, 0.34, 0.42],
          r: [0, random() * Math.PI, 0],
          c: pick(random, ["#4fa83f", "#5fb848", "#3f9a3a"]),
        });
    }
  };
  const addFerns = (
    x: number,
    top: number,
    z: number,
    w: number,
    d: number,
    count: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const cx = x + (random() - 0.5) * (w - 1),
        cz = z + (random() - 0.5) * (d - 1),
        color = pick(random, LEAVES);
      for (let k = 0; k < 5; k++)
        s.ferns.push({
          p: [cx, top + 0.38, cz],
          s: [0.22, 0.95, 0.07],
          r: [(k / 5) * Math.PI * 2 + random() * 0.3, 0.85, 0],
          c: color,
        });
    }
  };
  const addPalm = (x: number, top: number, z: number, height: number) => {
    const lean = (random() - 0.5) * 0.3,
      topX = x + Math.sin(lean) * height * 0.4,
      topY = top + height;
    s.trunks.push({
      p: [x + (topX - x) / 2, top + height / 2, z],
      s: [0.2, height, 0.2],
      r: [0, 0, -lean],
      c: "#8a6540",
    });
    const color = pick(random, ["#4cb548", "#3fa84a", "#5cc152"]);
    for (let k = 0; k < 11; k++) {
      const inner = k >= 7,
        yaw =
          ((inner ? k - 7 : k) / (inner ? 4 : 7)) * Math.PI * 2 +
          random() * 0.25 +
          (inner ? 0.4 : 0),
        pitch = inner ? 0.15 + random() * 0.15 : 0.5 + random() * 0.25,
        len = inner ? 1.5 : 2.3;
      s.leaves.push({
        p: [
          topX + Math.sin(yaw) * Math.cos(pitch) * len * 0.5,
          topY - Math.sin(pitch) * len * 0.5 + (inner ? 0.12 : 0),
          z + Math.cos(yaw) * Math.cos(pitch) * len * 0.5,
        ],
        s: [inner ? 0.45 : 0.62, 0.05, len],
        r: [pitch, yaw, 0],
        c: inner ? "#6fd05e" : color,
      });
    }
    for (let k = 0; k < 3; k++)
      s.coconuts.push({
        p: [
          topX + Math.sin(k * 2.1) * 0.2,
          topY - 0.2,
          z + Math.cos(k * 2.1) * 0.2,
        ],
        s: [0.15, 0.15, 0.15],
        c: "#7a4f2c",
      });
  };
  // Platform bodies and decoration.
  for (const p of platforms) {
    if (p.kind === "plank") {
      const alongZ = p.d >= p.w,
        length = alongZ ? p.d : p.w,
        width = alongZ ? p.w : p.d,
        count = Math.floor(length / 0.46);
      for (let i = 0; i < count; i++) {
        const o = -length / 2 + 0.23 + i * (length / count),
          jitter = (random() - 0.5) * 0.015;
        s.planks.push({
          p: alongZ
            ? [p.x, p.y - 0.08 + jitter, p.z + o]
            : [p.x + o, p.y - 0.08 + jitter, p.z],
          s: alongZ ? [width, 0.16, 0.42] : [0.42, 0.16, width],
          r: [0, (random() - 0.5) * 0.04, 0],
          c: pick(random, PLANKS),
        });
      }
      const posts = Math.max(2, Math.round(length / 3.4) + 1);
      for (const side of [-1, 1]) {
        for (let i = 0; i < posts; i++) {
          const o = -length / 2 + 0.2 + (i * (length - 0.4)) / (posts - 1),
            lateral = side * (width / 2 + 0.1);
          s.piles.push({
            p: alongZ
              ? [p.x + lateral, p.y - 0.65, p.z + o]
              : [p.x + o, p.y - 0.65, p.z + lateral],
            s: [0.17, 3.7, 0.17],
            c: "#7a5233",
          });
        }
        s.ropes.push({
          p: alongZ
            ? [p.x + side * (width / 2 + 0.1), p.y + 0.95, p.z]
            : [p.x, p.y + 0.95, p.z + side * (width / 2 + 0.1)],
          s: alongZ ? [0.06, 0.06, length] : [length, 0.06, 0.06],
          c: "#d8c28a",
        });
      }
      continue;
    }
    const stone = p.kind === "stone",
      h = stone ? 1.4 : 4.5;
    s.pillars.push({
      p: [p.x, p.y - 0.3 - h / 2, p.z],
      s: [p.w - 0.1, h, p.d - 0.1],
      c: "#aeab90",
    });
    s.pillars.push({
      p: [p.x, p.y - 0.75, p.z],
      s: [p.w + 0.04, 0.16, p.d + 0.04],
      c: "#e3d29b",
    });
    s.caps.push({
      p: [p.x, p.y - 0.15, p.z],
      s: [p.w + 0.12, 0.3, p.d + 0.12],
      c: pick(random, COURSE_GRASS),
    });
    if (stone)
      s.hangs.push({
        p: [p.x, p.y - 0.3 - h - 0.55, p.z],
        s: [p.w * 0.55, 1.5, p.d * 0.55],
        r: [0, 0, Math.PI],
        c: "#7b7c66",
      });
    addTufts(p.x, p.y, p.z, p.w, p.d, stone ? 3 : 14);
    if (!stone) addFerns(p.x, p.y, p.z, p.w, p.d, 2);
    if (!low)
      s.foam.push({
        p: [p.x, WATER_Y + 0.03, p.z],
        s: [p.w + 2.2, p.d + 2.2, 1],
      });
  }
  // Open water between pillars: lily pads and a ring of distant islands.
  const attempts = low ? 320 : 760;
  for (let i = 0; i < attempts; i++) {
    const x = 4 + random() * 138,
      z = -92 + random() * 160,
      tall = random() < 0.16,
      w = tall ? 4.5 + random() * 4 : 2 + random() * 3.5,
      d = tall ? 4.5 + random() * 4 : 2 + random() * 3.5,
      gap = gapTo(x, z, w, d);
    if (gap < 5.5) continue;
    if (
      placed.some(
        (q) =>
          Math.abs(x - q.x) < (w + q.w) / 2 + 1 &&
          Math.abs(z - q.z) < (d + q.d) / 2 + 1,
      )
    )
      continue;
    // Keep the sight line to the character clear: low near the course, high far away.
    const limit = Math.min(1.1 + (gap - 5.5) * 0.45, 10.5),
      top = tall
        ? Math.max(2, Math.min(limit, 4 + random() * 6.5))
        : Math.min(limit, 0.5 + random() * 2.4);
    if (top < 0.35) continue;
    placed.push({ x, z, w, d });
    const bodyHeight = top + 4;
    s.pillars.push({
      p: [x, top - 0.3 - (bodyHeight - 0.3) / 2, z],
      s: [w - 0.15, bodyHeight - 0.3, d - 0.15],
      c: pick(random, WILD_ROCKS),
    });
    s.caps.push({
      p: [x, top - 0.15, z],
      s: [w + 0.14, 0.3, d + 0.14],
      c: pick(random, WILD_GRASS),
    });
    s.bands.push({
      p: [x, top - 0.42, z],
      s: [w - 0.06, 0.26, d - 0.06],
      c: "#8b6a44",
    });
    addTufts(x, top, z, w, d, Math.round(w * d * 0.28));
    addFerns(x, top, z, w, d, Math.max(1, Math.round(w * d * 0.12)));
    if (!low)
      s.foam.push({ p: [x, WATER_Y + 0.03, z], s: [w + 2.4, d + 2.4, 1] });
    if (gap > 9 && w * d > 7 && random() < 0.55)
      addPalm(
        x + (random() - 0.5) * (w - 1.2),
        top,
        z + (random() - 0.5) * (d - 1.2),
        3.2 + random() * 1.8,
      );
    if (tall && top > 5.5 && gap > 10) {
      // Waterfalls spill down the faces the camera can see (+z or +x).
      const onX = random() < 0.5;
      s.falls.push({
        p: onX
          ? [x + w / 2 + 0.02, top - 0.2, z]
          : [x, top - 0.2, z + d / 2 + 0.02],
        w: Math.min((onX ? d : w) * 0.55, 2.8),
        h: top + 0.4,
        rotY: onX ? Math.PI / 2 : 0,
      });
    }
    if (tall && gap > 12 && s.watchers.length < 4 && random() < 0.35)
      s.watchers.push({ p: [x, top, z], s: 0.55 + random() * 0.25, rotY: 0 });
  }
  const lilyCount = low ? 40 : 110;
  for (let i = 0; i < lilyCount; i++) {
    const x = 20 + random() * 110,
      z = -80 + random() * 130;
    if (gapTo(x, z, 1, 1) < 1.1) continue;
    const r = 0.35 + random() * 0.3;
    s.lilies.push({
      p: [x, WATER_Y + 0.03, z],
      s: [r, 0.03, r],
      c: pick(random, ["#4fae48", "#5cb94f", "#3f9c43"]),
    });
    if (random() < 0.25)
      s.lilies.push({
        p: [x + 0.05, WATER_Y + 0.08, z],
        s: [0.1, 0.06, 0.1],
        c: "#f48fb1",
      });
  }
  // Large guardian pillar behind the goal.
  const g = guardianBase;
  s.pillars.push({
    p: [g.x, g.top - 0.3 - 2.5, g.z],
    s: [g.w - 0.15, 5, g.d - 0.15],
    c: "#85866e",
  });
  s.caps.push({
    p: [g.x, g.top - 0.15, g.z],
    s: [g.w + 0.14, 0.3, g.d + 0.14],
    c: "#5fae3f",
  });
  addTufts(g.x, g.top, g.z, g.w, g.d, 18);
  addFerns(g.x, g.top, g.z, g.w, g.d, 4);
  s.falls.push(
    {
      p: [g.x + g.w / 2 + 0.03, g.top - 0.1, g.z + 0.5],
      w: 2.4,
      h: g.top + 0.3,
      rotY: Math.PI / 2,
    },
    {
      p: [g.x - 3.4, g.top - 0.1, g.z + g.d / 2 + 0.03],
      w: 2.2,
      h: g.top + 0.3,
      rotY: 0,
    },
  );
  return s;
}

// ------------------------------------------------------------------ rendering
function Lagoon({ textures }: { textures: ReturnType<typeof useTextures> }) {
  const time = useRef({ value: 0 }),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }, delta) => {
    if (!reduced) {
      time.current.value = clock.elapsedTime;
      textures.waterfall.offset.y -= delta * 0.7;
    }
  });
  return (
    <>
      <mesh
        position={[75, -3.4, -15]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color="#1597a8" roughness={1} />
      </mesh>
      <mesh
        position={[75, WATER_Y, -15]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        renderOrder={1}
      >
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial
          transparent
          opacity={0.9}
          roughness={0.22}
          metalness={0}
          depthWrite={false}
          customProgramCacheKey={() => "water-lagoon-v3"}
          onBeforeCompile={(shader) =>
            stylizedWater(
              shader,
              time.current,
              { kind: "lagoon" },
              "#5adbd2",
              "#129fb8",
            )
          }
        />
      </mesh>
    </>
  );
}
function Waterfalls({
  falls,
  textures,
}: {
  falls: Fall[];
  textures: ReturnType<typeof useTextures>;
}) {
  return (
    <>
      {falls.map((f, i) => (
        <group key={i} position={f.p} rotation={[0, f.rotY, 0]}>
          <mesh position={[0, -f.h / 2, 0]} renderOrder={3}>
            <planeGeometry args={[f.w, f.h]} />
            <meshBasicMaterial
              map={textures.waterfall}
              transparent
              opacity={0.88}
              color="#e6fbff"
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[0, -f.h + 0.1, 0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={2}
          >
            <planeGeometry args={[f.w + 2.6, 2.6]} />
            <meshBasicMaterial
              map={textures.foam}
              transparent
              opacity={0.75}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
function Terrain({
  scenery,
  textures,
}: {
  scenery: Scenery;
  textures: ReturnType<typeof useTextures>;
}) {
  const foam = useRef<THREE.MeshBasicMaterial>(null),
    reduced = useGame((s) => s.reduced),
    foamItems = useMemo(
      () => scenery.foam.map((f) => ({ ...f, r: [-Math.PI / 2, 0, 0] as V3 })),
      [scenery.foam],
    );
  useFrame(({ clock }) => {
    if (foam.current && !reduced)
      foam.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 1.6) * 0.15;
  });
  return (
    <>
      <Instanced geometry={geometries.box} items={scenery.pillars}>
        <meshStandardMaterial
          roughness={0.92}
          flatShading
          customProgramCacheKey={() => "stone-blocks-v1"}
          onBeforeCompile={stoneBlocks}
        />
      </Instanced>
      <Instanced geometry={geometries.box} items={scenery.caps} />
      <Instanced geometry={geometries.box} items={scenery.bands} />
      <Instanced
        geometry={geometries.gem}
        items={scenery.blossoms}
        castShadow={false}
      />
      <Instanced geometry={geometries.sphere} items={scenery.bushes} />
      <Instanced geometry={geometries.sphere} items={scenery.coconuts} />
      <Instanced
        geometry={geometries.cone}
        items={scenery.tufts}
        castShadow={false}
      />
      <Instanced geometry={geometries.cone} items={scenery.hangs} />
      <Instanced
        geometry={geometries.cone}
        items={scenery.ferns}
        castShadow={false}
      />
      <Instanced geometry={geometries.cylinder} items={scenery.trunks} />
      <Instanced geometry={geometries.box} items={scenery.leaves} />
      <Instanced
        geometry={geometries.cylinder}
        items={scenery.lilies}
        castShadow={false}
      />
      <Instanced geometry={geometries.box} items={scenery.planks} />
      <Instanced geometry={geometries.cylinder} items={scenery.piles} />
      <Instanced
        geometry={geometries.box}
        items={scenery.ropes}
        castShadow={false}
      />
      <Instanced
        geometry={plane}
        items={foamItems}
        castShadow={false}
        receiveShadow={false}
        renderOrder={2}
      >
        <meshBasicMaterial
          ref={foam}
          map={textures.foam}
          transparent
          opacity={0.6}
          depthWrite={false}
          toneMapped={false}
        />
      </Instanced>
      <Waterfalls falls={scenery.falls} textures={textures} />
      {scenery.watchers.map((w, i) => (
        <Guardian key={i} position={w.p} scale={w.s} rotationY={w.rotY} />
      ))}
    </>
  );
}
function Colliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {platforms.map((p: Platform) =>
        p.kind === "plank" ? (
          <CuboidCollider
            key={p.id}
            args={[p.w / 2, 0.25, p.d / 2]}
            position={[p.x, p.y - 0.25, p.z]}
          />
        ) : (
          <CuboidCollider
            key={p.id}
            args={[p.w / 2, 1, p.d / 2]}
            position={[p.x, p.y - 1, p.z]}
          />
        ),
      )}
    </RigidBody>
  );
}
function Raft({
  index,
  textures,
}: {
  index: number;
  textures: ReturnType<typeof useTextures>;
}) {
  const r = rafts[index],
    body = useRef<RapierRigidBody>(null);
  // Rapier's character controller already carries riders on kinematic bodies.
  useBeforePhysicsStep(() => {
    const rb = body.current;
    if (!rb) return;
    const [x, y, z] = raftPosition(r, adventureRuntime.courseTime);
    rb.setNextKinematicTranslation({ x, y, z });
  });
  const yaw = Math.atan2(-r.axis[0], -r.axis[1]);
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={raftPosition(r, 0)}
    >
      <CuboidCollider
        args={[r.size / 2, 0.2, r.size / 2]}
        position={[0, -0.2, 0]}
      />
      <Box
        color="#a67846"
        position={[0, -0.18, 0]}
        scale={[r.size, 0.36, r.size]}
      />
      <mesh
        position={[0, 0.012, 0]}
        rotation={[-Math.PI / 2, 0, yaw]}
        receiveShadow
      >
        <planeGeometry args={[r.size - 0.45, r.size - 0.45]} />
        <meshStandardMaterial map={textures.chevron} roughness={0.7} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cylinder
            key={`${sx}${sz}`}
            color="#3b3f40"
            position={[sx * (r.size / 2 - 0.1), -0.05, sz * (r.size / 2 - 0.1)]}
            scale={[0.18, 0.4, 0.18]}
          />
        )),
      )}
    </RigidBody>
  );
}
function Logs() {
  const refs = useRef<(THREE.Group | null)[]>([]),
    rolls = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = visualTime();
    logs.forEach((l, i) => {
      const g = refs.current[i],
        roll = rolls.current[i];
      if (!g || !roll) return;
      const [x, y, z] = logPosition(l, t),
        offset = l.along === "z" ? z - l.z : x - l.x;
      g.position.set(x, y, z);
      if (l.along === "z") roll.rotation.x = offset / l.radius;
      else roll.rotation.z = -offset / l.radius;
    });
  });
  return (
    <>
      {logs.map((l, i) => {
        const len = l.halfLength * 2 + 0.3;
        return (
          <group key={l.id} ref={(g) => void (refs.current[i] = g)}>
            <group ref={(g) => void (rolls.current[i] = g)}>
              <group
                rotation={
                  l.along === "z" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]
                }
              >
                <Cylinder color="#7b4a2b" scale={[l.radius, len, l.radius]} />
                {[-1, 1].map((side) => (
                  <group key={side}>
                    <Cylinder
                      color="#efe6cf"
                      position={[0, side * len * 0.3, 0]}
                      scale={[l.radius * 1.05, 0.2, l.radius * 1.05]}
                    />
                    <Cylinder
                      color="#d9b27a"
                      position={[0, side * (len / 2 - 0.02), 0]}
                      scale={[l.radius * 0.97, 0.06, l.radius * 0.97]}
                    />
                    <Cylinder
                      color="#4b2d1a"
                      position={[0, side * len * 0.12, 0]}
                      scale={[l.radius * 1.03, 0.08, l.radius * 1.03]}
                    />
                  </group>
                ))}
              </group>
            </group>
          </group>
        );
      })}
    </>
  );
}
function Swings() {
  const geometry = useMemo(() => makeSpikeBall(), []),
    pivots = useRef<(THREE.Group | null)[]>([]),
    balls = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = visualTime();
    swings.forEach((w, i) => {
      const pivot = pivots.current[i],
        ball = balls.current[i];
      if (!pivot || !ball) return;
      const a = swingAngle(w, t);
      if (w.plane === "x") pivot.rotation.set(0, 0, a);
      else pivot.rotation.set(-a, 0, 0);
      // Keep the face looking at the camera while the rope tilts.
      ball.rotation.set(-pivot.rotation.x, 0, -pivot.rotation.z);
    });
  });
  return (
    <>
      {swings.map((w, i) => {
        const beamAlongX = w.plane === "z",
          span = 2.2;
        return (
          <group key={w.id}>
            {[-1, 1].map((side) => (
              <Cylinder
                key={side}
                color="#6e4a2e"
                position={[
                  w.x + (beamAlongX ? side * span : 0),
                  (w.y + 0.4 - 2) / 2,
                  w.z + (beamAlongX ? 0 : side * span),
                ]}
                scale={[0.22, w.y + 0.4 + 2, 0.22]}
              />
            ))}
            <Box
              color="#8a5f3a"
              position={[w.x, w.y + 0.3, w.z]}
              scale={
                beamAlongX
                  ? [span * 2 + 0.5, 0.28, 0.28]
                  : [0.28, 0.28, span * 2 + 0.5]
              }
            />
            <group
              position={[w.x, w.y, w.z]}
              ref={(g) => void (pivots.current[i] = g)}
            >
              <Box
                color="#d8c28a"
                position={[0, -w.length / 2, 0]}
                scale={[0.06, w.length, 0.06]}
              />
              <group
                position={[0, -w.length, 0]}
                ref={(g) => void (balls.current[i] = g)}
              >
                <mesh geometry={geometry} castShadow dispose={null}>
                  <meshStandardMaterial
                    vertexColors
                    roughness={0.7}
                    flatShading
                  />
                </mesh>
                <group scale={BALL_RADIUS / 0.5}>
                  {[
                    [0.34, 0.12, 0.3],
                    [0.12, 0.12, 0.44],
                  ].map((e, k) => (
                    <group key={k} position={e as V3}>
                      <Rock color="#ffffff" scale={0.095} />
                      <Rock
                        color="#2b1b1b"
                        position={[0.04, -0.01, 0.045]}
                        scale={0.05}
                      />
                    </group>
                  ))}
                  <Box
                    color="#3a1f1f"
                    position={[0.34, 0.25, 0.3]}
                    rotation={[0, 0, 0.45]}
                    scale={[0.2, 0.05, 0.05]}
                  />
                  <Box
                    color="#3a1f1f"
                    position={[0.12, 0.25, 0.44]}
                    rotation={[0, 0, -0.45]}
                    scale={[0.2, 0.05, 0.05]}
                  />
                </group>
              </group>
            </group>
          </group>
        );
      })}
    </>
  );
}
function Grunts() {
  const refs = useRef<(THREE.Group | null)[]>([]),
    feet = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = visualTime(),
      rt = adventureRuntime;
    grunts.forEach((g, i) => {
      const group = refs.current[i],
        legs = feet.current[i];
      if (!group || !legs) return;
      const [x, y, z] = gruntPosition(g, t),
        [nx, , nz] = gruntPosition(g, t + 0.05);
      group.position.set(x, y, z);
      if (Math.hypot(nx - x, nz - z) > 1e-4)
        group.rotation.y = Math.atan2(nx - x, nz - z);
      const hit = rt.defeated.has(g.id),
        since = hit ? rt.courseTime - (rt.defeatedAt[g.id] ?? 0) : 0;
      group.visible = !hit || since < 0.45;
      group.scale.y = hit ? Math.max(0.08, 1 - since * 4) : 1;
      legs.children.forEach((leg, k) => {
        leg.position.z = Math.sin(t * 9 + k * Math.PI) * 0.1;
      });
    });
  });
  return (
    <>
      {grunts.map((g, i) => (
        <group key={g.id} ref={(el) => void (refs.current[i] = el)}>
          <Box
            color="#e5834f"
            position={[0, GRUNT_SIZE / 2 + 0.06, 0]}
            scale={[GRUNT_SIZE, GRUNT_SIZE - 0.12, GRUNT_SIZE]}
          />
          <Box
            color="#79c458"
            position={[0, GRUNT_SIZE + 0.1, 0]}
            scale={[GRUNT_SIZE + 0.08, 0.2, GRUNT_SIZE + 0.08]}
          />
          <Rock
            color="#58a43d"
            position={[0, GRUNT_SIZE + 0.3, 0]}
            scale={[0.22, 0.14, 0.22]}
          />
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.2, 0.58, GRUNT_SIZE / 2 + 0.01]}
            >
              <Box color="#ffffff" scale={[0.19, 0.21, 0.05]} />
              <Box
                color="#2a1713"
                position={[side * -0.02, -0.01, 0.03]}
                scale={[0.08, 0.1, 0.04]}
              />
              <Box
                color="#3a1f14"
                position={[0, 0.17, 0.02]}
                rotation={[0, 0, side * 0.5]}
                scale={[0.25, 0.06, 0.05]}
              />
            </group>
          ))}
          <Box
            color="#3a1f14"
            position={[0, 0.3, GRUNT_SIZE / 2 + 0.01]}
            scale={[0.3, 0.07, 0.04]}
          />
          <group ref={(el) => void (feet.current[i] = el)}>
            {[-1, 1].map((side) => (
              <Box
                key={side}
                color="#4a2a1a"
                position={[side * 0.22, 0.06, 0]}
                scale={[0.26, 0.12, 0.32]}
              />
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
function Collectibles() {
  const gems = useMemo(() => collectibles.filter((c) => c.kind === "gem"), []),
    hearts = useMemo(() => collectibles.filter((c) => c.kind === "heart"), []),
    geometry = useMemo(() => new THREE.OctahedronGeometry(0.38), []),
    heartGeometry = useMemo(() => makeHeart(), []),
    mesh = useRef<THREE.InstancedMesh>(null),
    heartRefs = useRef<(THREE.Mesh | null)[]>([]),
    reduced = useGame((s) => s.reduced);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    gems.forEach((_, i) =>
      m.setColorAt(i, tint.setHSL((i * 0.083) % 1, 0.9, 0.55)),
    );
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [gems]);
  useFrame(({ clock }) => {
    const m = mesh.current,
      rt = adventureRuntime,
      t = clock.elapsedTime;
    const pop = (id: string) => {
      if (!rt.collected.has(id)) return 1;
      const k = (rt.courseTime - (rt.pulses[id] ?? -9)) / 0.3;
      return k >= 1 ? 0 : (1 + k * 0.9) * (1 - k);
    };
    if (m) {
      gems.forEach((g, i) => {
        dummy.position.set(
          g.position[0],
          g.position[1] + (reduced ? 0 : Math.sin(t * 2 + i) * 0.1),
          g.position[2],
        );
        dummy.rotation.set(0, reduced ? 0 : t * 1.6 + i, 0);
        dummy.scale.setScalar(pop(g.id));
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
    hearts.forEach((h, i) => {
      const el = heartRefs.current[i];
      if (!el) return;
      const scale = pop(h.id);
      el.visible = scale > 0.01;
      el.scale.setScalar(scale * (1 + Math.sin(t * 4) * 0.06));
      el.position.y = h.position[1] + (reduced ? 0 : Math.sin(t * 2) * 0.1);
      el.rotation.y = reduced ? 0 : t * 1.4;
    });
  });
  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[geometry, undefined, gems.length]}
        frustumCulled={false}
        dispose={null}
      >
        <meshStandardMaterial
          roughness={0.25}
          metalness={0.1}
          customProgramCacheKey={() => "jungle-gem-v1"}
          onBeforeCompile={(shader) => {
            // Self-light each gem with its own instance colour so they glow.
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <emissivemap_fragment>",
              "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.7;",
            );
          }}
        />
      </instancedMesh>
      {hearts.map((h, i) => (
        <mesh
          key={h.id}
          ref={(el) => void (heartRefs.current[i] = el)}
          position={h.position}
          geometry={heartGeometry}
          castShadow
          dispose={null}
        >
          <meshStandardMaterial
            color="#ff5d7e"
            emissive="#ff2c5a"
            emissiveIntensity={0.5}
            roughness={0.3}
          />
        </mesh>
      ))}
    </>
  );
}
function Springs() {
  const caps = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const rt = adventureRuntime;
    springs.forEach((s, i) => {
      const cap = caps.current[i];
      if (!cap) return;
      const k = (rt.courseTime - (rt.pulses[s.id] ?? -9)) / 0.45;
      // Squash, overshoot, settle.
      const squash =
        k < 0 || k > 1 ? 1 : 1 - Math.sin(k * Math.PI * 2.4) * 0.45 * (1 - k);
      cap.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      cap.position.y = 0.36 * squash;
    });
  });
  return (
    <>
      {springs.map((s, i) => (
        <group key={s.id} position={[s.x, s.y, s.z]}>
          <Cylinder
            color="#efe2c4"
            position={[0, 0.14, 0]}
            scale={[0.34, 0.28, 0.34]}
          />
          <group
            ref={(el) => void (caps.current[i] = el)}
            position={[0, 0.36, 0]}
          >
            {[0.06, 0.16, 0.26].map((y) => (
              <mesh
                key={y}
                position={[0, y - 0.18, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                dispose={null}
              >
                <torusGeometry args={[0.15, 0.025, 6, 14]} />
                <meshStandardMaterial
                  color="#aab2b6"
                  metalness={0.6}
                  roughness={0.35}
                />
              </mesh>
            ))}
            <Rock
              color="#ec5f86"
              position={[0, 0.2, 0]}
              scale={[0.72, 0.27, 0.72]}
            />
            <Cylinder
              color="#fff1f4"
              position={[0, 0.41, 0]}
              scale={[0.42, 0.03, 0.42]}
            />
            {[0, 1, 2, 3, 4].map((k) => (
              <Rock
                key={k}
                color="#fff1f4"
                position={[
                  Math.cos(k * 1.26) * 0.5,
                  0.26,
                  Math.sin(k * 1.26) * 0.5,
                ]}
                scale={[0.1, 0.05, 0.1]}
              />
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
function Boosts({ textures }: { textures: ReturnType<typeof useTextures> }) {
  return (
    <>
      {boosts.map((b) => (
        <group key={b.id} position={[b.x, b.y, b.z]}>
          <Box
            color="#4a3a2a"
            position={[0, 0.04, 0]}
            scale={[b.hx * 2 + 0.2, 0.08, b.hz * 2 + 0.2]}
          />
          <mesh
            position={[0, 0.085, 0]}
            rotation={[-Math.PI / 2, 0, Math.atan2(-b.dir[0], -b.dir[1])]}
          >
            <planeGeometry args={[b.hz * 2, b.hx * 2]} />
            <meshStandardMaterial
              map={textures.chevron}
              emissive="#3dff9a"
              emissiveIntensity={0.35}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
function Flags() {
  const checkpoint = useAdventure((s) => s.checkpoint);
  return (
    <>
      {checkpoints.map((c, i) => {
        if (i === checkpoints.length - 1) return null;
        const x = c.x - c.hx + 0.35,
          z = c.z - c.hz + 0.35,
          done = i <= checkpoint;
        return (
          <group key={c.id} position={[x, c.y, z]}>
            <Cylinder
              color="#6d4a2e"
              position={[0, 0.85, 0]}
              scale={[0.07, 1.7, 0.07]}
            />
            <Box
              color={done ? "#7fe0ae" : "#f1cf7a"}
              glow={done}
              position={[0.4, 1.38, 0]}
              scale={[0.8, 0.5, 0.04]}
            />
            <Rock color="#f4e9c8" position={[0, 1.72, 0]} scale={0.1} />
          </group>
        );
      })}
    </>
  );
}
function Shrine() {
  const ring = useRef<THREE.Mesh>(null),
    beam = useRef<THREE.MeshBasicMaterial>(null),
    goal = checkpoints[checkpoints.length - 1];
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.8;
    if (beam.current)
      beam.current.opacity = 0.2 + Math.sin(clock.elapsedTime * 2) * 0.06;
  });
  return (
    <group position={[goal.x, goal.y, goal.z - 1.2]}>
      <Box color="#9a9a84" position={[0, 0.15, 0]} scale={[3.2, 0.3, 2.2]} />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          color="#7f806c"
          position={[side * 1.25, 1.5, 0]}
          scale={[0.5, 2.6, 0.5]}
        />
      ))}
      <Box color="#8a8b72" position={[0, 2.95, 0]} scale={[3.2, 0.45, 0.65]} />
      <mesh ref={ring} position={[0, 1.7, 0]} dispose={null}>
        <torusGeometry args={[0.8, 0.1, 10, 28]} />
        <meshStandardMaterial
          color="#ffb347"
          emissive="#ff7a2e"
          emissiveIntensity={1.4}
        />
      </mesh>
      <mesh position={[0, 1.7, 0]} dispose={null}>
        <sphereGeometry args={[0.32, 14, 12]} />
        <meshStandardMaterial
          color="#fff3c4"
          emissive="#ffd36e"
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh position={[0, 6.2, 0]} dispose={null}>
        <cylinderGeometry args={[0.6, 0.9, 7, 16, 1, true]} />
        <meshBasicMaterial
          ref={beam}
          color="#ffd98a"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
function Guardian({
  position,
  scale = 1,
  rotationY = 0,
}: {
  position: V3;
  scale?: number;
  rotationY?: number;
}) {
  const arms = useRef<(THREE.Group | null)[]>([]),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    arms.current.forEach((arm, i) => {
      if (!arm) return;
      const sway = reduced
        ? 0
        : Math.sin(clock.elapsedTime * 1.3 + i * 2) * 0.12;
      arm.rotation.z = (i ? -1 : 1) * (1.0 + sway);
    });
  });
  const s = scale;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={s}>
      <Cylinder color="#8a5d3b" position={[0, 3, 0]} scale={[1.7, 6, 1.7]} />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <Box
          key={k}
          color="#6f4a2e"
          position={[
            Math.sin(k * 1.05 + 2.4) * 1.62,
            3,
            Math.cos(k * 1.05 + 2.4) * 1.62,
          ]}
          rotation={[0, k * 1.05 + 2.4, 0]}
          scale={[0.25, 6, 0.2]}
        />
      ))}
      {/* Face on the camera-facing side (+x/+z). */}
      <group rotation={[0, Math.PI / 4, 0]}>
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              color="#45291a"
              position={[side * 0.62, 4.5, 1.62]}
              rotation={[0, 0, side * -0.45]}
              scale={[0.95, 0.22, 0.3]}
            />
            <Box
              color="#74ff56"
              glow
              position={[side * 0.55, 4.1, 1.64]}
              scale={[0.5, 0.3, 0.2]}
            />
          </group>
        ))}
        <Box
          color="#26140c"
          position={[0, 3.1, 1.62]}
          scale={[1.4, 0.95, 0.3]}
        />
        {[-0.45, -0.15, 0.15, 0.45].map((x) => (
          <Box
            key={x}
            color="#eadcb4"
            position={[x, 3.5, 1.66]}
            scale={[0.2, 0.22, 0.1]}
          />
        ))}
      </group>
      {[0, 1].map((i) => (
        <group
          key={i}
          ref={(el) => void (arms.current[i] = el)}
          position={[(i ? -1 : 1) * 1.55, 4.6, 0]}
        >
          <Cylinder
            color="#7b5033"
            position={[0, 1.4, 0]}
            scale={[0.35, 2.8, 0.35]}
          />
          <Box
            color="#8a5d3b"
            position={[0, 2.95, 0]}
            scale={[0.75, 0.5, 0.5]}
          />
          {[-0.28, 0, 0.28].map((x) => (
            <Box
              key={x}
              color="#8a5d3b"
              position={[x, 3.35, 0]}
              scale={[0.14, 0.55, 0.16]}
            />
          ))}
        </group>
      ))}
      {[0, 1, 2].map((k) => (
        <Cone
          key={k}
          color={k % 2 ? "#2f9a44" : "#3fa84a"}
          position={[0, 6.4 + k * 0.7, 0]}
          scale={[3.6 - k * 0.9, 1.6, 3.6 - k * 0.9]}
        />
      ))}
    </group>
  );
}
function Splash() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current,
      sp = adventureRuntime.splash;
    if (!g) return;
    const k = sp ? (adventureRuntime.courseTime - sp.at) / 0.9 : 2;
    g.visible = k >= 0 && k < 1;
    if (!sp || !g.visible) return;
    g.position.set(sp.x, WATER_Y, sp.z);
    g.children.forEach((child, i) => {
      if (i === 0) {
        child.scale.setScalar(0.4 + k * 2.6);
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          0.8 * (1 - k);
      } else {
        const a = i * 0.85;
        child.position.set(
          Math.cos(a) * k * 1.2,
          Math.sin(Math.min(1, k * 1.6) * Math.PI) * 1.3,
          Math.sin(a) * k * 1.2,
        );
      }
    });
  });
  return (
    <group ref={group} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} dispose={null}>
        <ringGeometry args={[0.7, 0.9, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} dispose={null}>
          <sphereGeometry args={[0.09, 6, 6]} />
          <meshBasicMaterial color="#d9fbff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------- simulation
// Pickups, pads, and hazards share the fixed physics step so results are
// identical at any display refresh rate and freeze while paused.
function Simulation() {
  useBeforePhysicsStep(() => {
    const rt = adventureRuntime,
      s = useAdventure.getState(),
      game = useGame.getState(),
      live =
        s.activeGame === "parkour" &&
        s.phase === "playing" &&
        !game.panel &&
        game.started &&
        !document.hidden;
    rt.live = live;
    if (!live) return;
    rt.stepWall = performance.now();
    rt.courseTime += 1 / 60;
    rt.trailTime += 1 / 60;
    if (rt.trailTime - rt.lastPublish >= 0.1 || rt.trailTime < rt.lastPublish) {
      rt.lastPublish = rt.trailTime;
      useAdventure.setState({ elapsed: rt.trailTime });
    }
    const p = rt.player,
      feet = p.y - PLAYER_CENTER_OFFSET;
    for (const c of collectibles) {
      if (rt.collected.has(c.id)) continue;
      const near =
        Math.hypot(
          p.x - c.position[0],
          p.y + 0.1 - c.position[1],
          p.z - c.position[2],
        ) < PICKUP_RADIUS;
      if (!near) continue;
      if (c.kind === "heart") {
        // A full heart row leaves the pickup for later.
        if (s.hearts >= MAX_HEARTS) continue;
        s.heal();
        playCue("heart");
      } else {
        s.collectGem();
        playCue("gem");
      }
      rt.collected.add(c.id);
      rt.pulses[c.id] = rt.courseTime;
    }
    for (const sp of springs) {
      if (
        Math.abs(p.x - sp.x) < 0.85 &&
        Math.abs(p.z - sp.z) < 0.85 &&
        feet > sp.y - 0.15 &&
        feet < sp.y + 0.55 &&
        p.vy <= 0.5 &&
        rt.courseTime - (rt.pulses[sp.id] ?? -9) > 0.5
      ) {
        rt.launch = { vy: SPRING_VELOCITY };
        rt.pulses[sp.id] = rt.courseTime;
        playCue("bounce");
      }
    }
    for (const b of boosts) {
      if (
        Math.abs(p.x - b.x) < b.hx + 0.2 &&
        Math.abs(p.z - b.z) < b.hz + 0.2 &&
        feet > b.y - 0.15 &&
        feet < b.y + 0.7 &&
        rt.courseTime - (rt.pulses[b.id] ?? -9) > 0.9
      ) {
        rt.boost = { x: b.dir[0] * BOOST_SPEED, z: b.dir[1] * BOOST_SPEED };
        rt.pulses[b.id] = rt.courseTime;
        playCue("boost");
      }
    }
    for (const event of evaluateHazards(p, rt.courseTime, rt.defeated)) {
      if (event.kind === "stomp") {
        rt.defeated.add(event.id);
        rt.defeatedAt[event.id] = rt.courseTime;
        rt.launch = { vy: 9.5 };
        rt.invulUntil = Math.max(rt.invulUntil, rt.courseTime + 0.25);
        playCue("stomp");
        continue;
      }
      if (rt.courseTime < rt.invulUntil) continue;
      rt.invulUntil = rt.courseTime + INVULNERABLE_SECONDS;
      const dx = p.x - event.from[0],
        dz = p.z - event.from[1],
        length = Math.hypot(dx, dz) || 1;
      rt.knock = { x: (dx / length) * 6, z: (dz / length) * 6 };
      playCue("hurt");
      s.hurt();
      break;
    }
  });
  return null;
}

export default function JungleCourse() {
  const textures = useTextures(),
    scenery = useMemo(() => buildScenery(false), []);
  useEffect(
    () => () => {
      adventureRuntime.live = false;
    },
    [],
  );
  return (
    <>
      <Simulation />
      <Lagoon textures={textures} />
      <Terrain scenery={scenery} textures={textures} />
      <Colliders />
      {rafts.map((r, i) => (
        <Raft key={r.id} index={i} textures={textures} />
      ))}
      <Logs />
      <Swings />
      <Grunts />
      <Collectibles />
      <Springs />
      <Boosts textures={textures} />
      <Flags />
      <Shrine />
      <Guardian
        position={[guardianBase.x, guardianBase.top, guardianBase.z]}
        scale={1.5}
        rotationY={0}
      />
      <Splash />
    </>
  );
}
