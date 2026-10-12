"use client";
import LivingSky from "./LivingSky";
import VillageDetails, { NightLamp } from "./VillageDetails";
import {
  bankStrips,
  BRIDGE_Z,
  RIVER_HALF_WIDTH,
  riverZ,
  WORLD_RADIUS,
} from "@/lib/village/terrain";
import { environmentRuntime } from "@/lib/village/environment";
import { waterShader } from "./waterShader";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { Box, Cylinder, Rock, geometries, material } from "./Primitives";
import Buildings from "./Buildings";
import { PARKOUR_LODGE } from "@/lib/village/minigames/entrance";
import VillageGate from "./VillageGate";
import { locations } from "@/lib/village/data";
import { seeded } from "@/lib/village/logic";
import { useGame } from "@/lib/village/store";
type Item = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: number;
  color: string;
};
function Batch({
  items,
  kind,
}: {
  items: Item[];
  kind: keyof typeof geometries;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(...item.position);
      dummy.scale.set(...item.scale);
      dummy.rotation.set(0, item.rotation || 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometries[kind], material("#ffffff"), items.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
function makeDecor() {
  const random = seeded(42),
    trunks: Item[] = [],
    foliage: Item[] = [],
    rocks: Item[] = [],
    flowers: Item[] = [],
    grass: Item[] = [],
    paths: Item[] = [];
  const trees: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < 190; i++) {
    const angle = random() * Math.PI * 2,
      radius = 21 + random() * 10;
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if (
      (z > 10 && Math.abs(x) < 20) ||
      Math.abs(z - riverZ(x)) < 3.4 ||
      locations.some(
        (l) => Math.hypot(x - l.position[0], z - l.position[2]) < 6,
      )
    )
      continue;
    const height = 3.8 + random() * 4.5,
      r = 1 + random() * 0.55;
    trees.push({ x, z, r: 0.4 });
    trunks.push({
      position: [x, height * 0.32, z],
      scale: [0.24, height * 0.64, 0.24],
      color: "#725039",
    });
    for (let j = 0; j < 3; j++)
      foliage.push({
        position: [x, height * (0.48 + j * 0.19), z],
        scale: [r * (1.6 - j * 0.2), height * 0.27, r * (1.6 - j * 0.2)],
        color: ["#526b4e", "#628348", "#86a76a", "#3f6250"][i % 4],
      });
  }
  for (let i = 0; i < 110; i++) {
    const angle = random() * Math.PI * 2,
      radius = 30 + random() * 1.5;
    const size = 0.4 + random() * 1.1;
    rocks.push({
      position: [Math.cos(angle) * radius, -0.15, Math.sin(angle) * radius],
      scale: [size * 1.25, size, size],
      rotation: random() * 5,
      color: ["#8c9186", "#6a766b", "#a2aa8d"][i % 3],
    });
  }
  for (let i = 0; i < 1100; i++) {
    const x = (random() - 0.5) * 61,
      z = (random() - 0.5) * 60;
    if (
      Math.hypot(x, z) > 30 ||
      (Math.abs(x - PARKOUR_LODGE[0]) < 3.5 &&
        Math.abs(z - PARKOUR_LODGE[2]) < 3.2) ||
      locations.some(
        (l) => Math.hypot(x - l.position[0], z - l.position[2]) < 4,
      ) ||
      Math.abs(z - riverZ(x)) < 3.2 ||
      (z > 20 && x > 7 && x < 17)
    )
      continue;
    grass.push({
      position: [x, 0.14, z],
      scale: [0.12, 0.28 + random() * 0.2, 0.12],
      color: ["#719559", "#9caf70", "#567a46"][i % 3],
    });
    if (i % 3 === 0)
      flowers.push({
        position: [x, 0.3, z],
        scale: [0.12, 0.12, 0.12],
        color: ["#edc567", "#e2b497", "#aebed2", "#ebe0b0"][i % 4],
      });
  }
  // Seeded irregular stepping stones laid along curved, authored routes.
  const routes = [
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
  for (const [sx, sz, ex, ez] of routes)
    for (let i = 0; i < 32; i++) {
      const t = i / 31,
        bend = Math.sin(t * Math.PI) * 1.1;
      const x = sx + (ex - sx) * t + (sx === 1 && ex === 1 ? 0 : bend),
        z = sz + (ez - sz) * t;
      if (Math.abs(z - riverZ(x)) < RIVER_HALF_WIDTH + 0.4) continue;
      for (let j = 0; j < 3; j++)
        paths.push({
          position: [
            x + (j - 1) * 0.65 + (random() - 0.5) * 0.22,
            0.04,
            z + (random() - 0.5) * 0.3,
          ],
          scale: [0.37 + random() * 0.13, 0.065, 0.3 + random() * 0.13],
          rotation: random() * 3,
          color: ["#baad87", "#c6b892", "#a9a084", "#d1bf99"][i % 4],
        });
    }
  return { trunks, foliage, rocks, grass, flowers, paths, trees };
}
function Water() {
  const ref = useRef<THREE.Mesh>(null),
    shaderTime = useRef({ value: 0 }),
    reduced = useGame((s) => s.reduced);
  const geometry = useMemo(() => {
    const vertices: number[] = [],
      indices: number[] = [];
    let previous = false;
    for (let i = 0; i <= 128; i++) {
      const x = -WORLD_RADIUS + (i * WORLD_RADIUS * 2) / 128;
      const edge = Math.sqrt(Math.max(0, WORLD_RADIUS ** 2 - x ** 2));
      const from = Math.max(-edge, riverZ(x) - RIVER_HALF_WIDTH);
      const to = Math.min(edge, riverZ(x) + RIVER_HALF_WIDTH);
      if (to <= from) {
        previous = false;
        continue;
      }
      const a = vertices.length / 3;
      vertices.push(x, -0.25, from, x, -0.25, to);
      if (previous) indices.push(a - 2, a - 1, a, a - 1, a + 1, a);
      previous = true;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!reduced) shaderTime.current.value = clock.elapsedTime;
    if (ref.current && !reduced)
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0;
  });
  return (
    <>
      <mesh ref={ref} geometry={geometry} receiveShadow>
        <meshPhysicalMaterial
          color="#5c9ea8"
          roughness={0.16}
          metalness={0}
          ior={1.333}
          side={THREE.DoubleSide}
          customProgramCacheKey={() => "water-pbr-v2"}
          onBeforeCompile={(shader) => waterShader(shader, shaderTime.current)}
        />
      </mesh>
      {[-28, 29.5].map((x) => (
        <group key={x} position={[x, -1.3, 14 + Math.sin(x * 0.18) * 1.8]}>
          <Box color="#8ccfda" scale={[1.4, 2.8, 2.1]} />
          <Box
            color="#bde3d8"
            position={[0.2, 0, 0.4]}
            scale={[0.25, 2.9, 0.8]}
          />
        </group>
      ))}
      <Cylinder
        color="#77b8c8"
        position={[-17, 0.07, -2]}
        scale={[3.4, 0.08, 2.6]}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Box
          key={i}
          color="#c3e0d8"
          position={[
            -22 + i * 6,
            -0.23,
            14 + Math.sin((-22 + i * 6) * 0.18) * 1.8,
          ]}
          rotation={[0, -0.25, 0]}
          scale={[1.3, 0.02, 0.09]}
        />
      ))}
    </>
  );
}
function Bridge() {
  return (
    <group position={[1, 0, BRIDGE_Z]}>
      {Array.from({ length: 19 }, (_, i) => (
        <Box
          key={i}
          color={i % 2 ? "#9e784a" : "#ac8656"}
          position={[0, 0.2, -4.23 + i * 0.47]}
          scale={[3.1, 0.25, 0.44]}
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-4.2, -2.1, 0, 2.1, 4.2].map((z) => (
            <Box
              key={z}
              color="#785139"
              position={[side * 1.5, 0.9, z]}
              scale={[0.18, 1.8, 0.18]}
            />
          ))}
          <Box
            color="#ae8555"
            position={[side * 1.5, 1.55, 0]}
            scale={[0.15, 0.17, 8.9]}
          />
          <Box
            color="#8a5a3b"
            position={[side * 1.5, 0.7, 0]}
            scale={[0.12, 0.12, 8.9]}
          />
          <CuboidCollider
            args={[0.1, 0.7, 4.5]}
            position={[side * 1.5, 0.9, 0]}
          />
        </group>
      ))}
      <CuboidCollider args={[1.5, 0.12, 4.5]} position={[0, 0.16, 0]} />
    </group>
  );
}
function Lantern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <NightLamp x={0} z={0} />
      <Cylinder
        color="#614a34"
        position={[0, 1.35, 0]}
        scale={[0.075, 2.7, 0.075]}
      />
      <Box color="#d5a25e" position={[0, 2.65, 0]} scale={[0.45, 0.08, 0.45]} />
      <Box
        color="#ffe0a0"
        glow
        position={[0, 2.4, 0]}
        scale={[0.28, 0.45, 0.28]}
      />
      <Box color="#715439" position={[0, 2.13, 0]} scale={[0.4, 0.08, 0.4]} />
    </group>
  );
}
function Effects() {
  const group = useRef<THREE.Group>(null),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = environmentRuntime.daylight < 0.5;
    if (reduced) return;
    group.current.children.forEach((particle, i) => {
      particle.position.y = 1.2 + Math.sin(clock.elapsedTime * 0.65 + i) * 0.6;
      particle.position.x =
        Math.sin(i * 6.2) * 19 + Math.sin(clock.elapsedTime * 0.25 + i) * 0.7;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 35 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 6.2) * 19, 1, Math.cos(i * 4.7) * 18]}
        >
          <sphereGeometry args={[0.035, 4, 4]} />
          <meshBasicMaterial color="#ffe3a0" />
        </mesh>
      ))}
    </group>
  );
}
export default function World() {
  const decor = useMemo(() => makeDecor(), []);
  return (
    <>
      <LivingSky />
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <shadowMaterial transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[32, 30, 3.2, 64]} />
        <meshStandardMaterial color="#6d7561" flatShading />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {bankStrips.map(({ x, edge, north, south }, i) => (
          <group key={`bank-${i}`}>
            {[
              [-edge, Math.min(edge, north)],
              [Math.max(-edge, south), edge],
            ].map(([from, to], side) =>
              to > from ? (
                <group key={side} position={[x, -0.18, (from + to) / 2]}>
                  <Box color="#86a76a" scale={[0.5, 0.36, to - from]} />
                  <CuboidCollider
                    args={[0.25, 0.18, (to - from) / 2]}
                    friction={0.9}
                  />
                </group>
              ) : null,
            )}
          </group>
        ))}
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i * Math.PI) / 24;
          return (
            <CuboidCollider
              key={`edge-${i}`}
              args={[2.2, 3, 0.2]}
              position={[Math.sin(a) * 31.7, 1, Math.cos(a) * 31.7]}
              rotation={[0, a, 0]}
            />
          );
        })}
        {decor.trees.map((t, i) => (
          <CylinderCollider
            key={`tree-${i}`}
            args={[1.3, t.r]}
            position={[t.x, 1.3, t.z]}
          />
        ))}
        <Bridge />
        <CuboidCollider args={[1.3, 0.5, 0.5]} position={[-4, 0.5, 18]} />
      </RigidBody>
      <Batch items={decor.trunks} kind="cylinder" />
      <Batch items={decor.foliage} kind="sphere" />
      <Batch items={decor.rocks} kind="sphere" />
      <Batch items={decor.paths} kind="sphere" />
      <Batch items={decor.grass} kind="cone" />
      <Batch items={decor.flowers} kind="sphere" />
      <Water />
      <Buildings />
      <VillageGate />
      <VillageDetails />
      <Effects />
      {[
        [-3, 3],
        [3, -2],
        [-6, 8],
        [10, 11],
        [13, 1],
      ].map(([x, z]) => (
        <Lantern key={`${x}-${z}`} x={x} z={z} />
      ))}
      <group position={[-4, 0, 18]}>
        <Box color="#956f44" position={[0, 0.7, 0]} scale={[2.5, 0.18, 1]} />
        <Box
          color="#a37b4d"
          position={[0, 1.1, -0.4]}
          scale={[2.5, 0.6, 0.14]}
        />
        {[-1, 1].map((x) => (
          <Box
            key={x}
            color="#604933"
            position={[x, 0.35, 0]}
            scale={[0.15, 0.7, 0.8]}
          />
        ))}
      </group>
      <group position={[6, 0, 19]}>
        <Cylinder
          color="#8c9186"
          position={[0, 0.1, 0]}
          scale={[1.4, 0.2, 1.4]}
        />
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            color="#785439"
            position={[0, 0.35 + i * 0.14, 0]}
            rotation={[0, i * 2, 0]}
            scale={[1.4, 0.2, 0.25]}
          />
        ))}
        <Rock
          color="#ffb860"
          position={[0, 0.8, 0]}
          scale={[0.35, 0.65, 0.35]}
        />
      </group>
      {[
        [-16, 9],
        [-17, -8],
        [15, 8],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {[0, 1, 2].map((j) => (
            <Rock
              key={j}
              color={i % 2 ? "#afac80" : "#789652"}
              position={[j * 0.55, 0.4 + j * 0.2, 0]}
              scale={[0.7, 0.65, 0.7]}
            />
          ))}
        </group>
      ))}
    </>
  );
}
