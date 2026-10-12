"use client";
import LivingSky from "./LivingSky";
import Terrain from "./Terrain";
import VillageDetails, { NightLamp } from "./VillageDetails";
import { bankStrips, BRIDGE_Z, POND } from "@/lib/village/terrain";
import { environmentRuntime } from "@/lib/village/environment";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import {
  Baked,
  Box,
  Cone,
  Cylinder,
  Glow,
  Rock,
  geometries,
  material,
} from "./Primitives";
import Buildings from "./Buildings";
import VillageGate from "./VillageGate";
import { makeScenery, type Item } from "@/lib/village/scenery";
import { useGame } from "@/lib/village/store";
function Batch({
  items,
  kind,
  shadow = true,
}: {
  items: Item[];
  kind: keyof typeof geometries;
  shadow?: boolean;
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
      castShadow={shadow}
      receiveShadow
      dispose={null}
    />
  );
}
function Bridge() {
  return (
    <group position={[1, 0, BRIDGE_Z]}>
      {Array.from({ length: 19 }, (_, i) => (
        <Box
          key={i}
          color={i % 2 ? "#a8743f" : "#b9854b"}
          position={[0, 0.2, -4.23 + i * 0.47]}
          scale={[3.1, 0.25, 0.44]}
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-4.2, -2.1, 0, 2.1, 4.2].map((z) => (
            <Box
              key={z}
              color="#714a2e"
              position={[side * 1.5, 0.9, z]}
              scale={[0.2, 1.8, 0.2]}
            />
          ))}
          <Box
            color="#b07f4a"
            position={[side * 1.5, 1.55, 0]}
            scale={[0.16, 0.17, 8.9]}
          />
          <Box
            color="#8a5a35"
            position={[side * 1.5, 0.75, 0]}
            scale={[0.12, 0.12, 8.9]}
          />
          {[-4.2, 4.2].map((z) => (
            <group key={z} position={[side * 1.5, 1.95, z]}>
              <Box
                color="#2f2b27"
                scale={[0.3, 0.07, 0.3]}
                position={[0, 0.3, 0]}
              />
              <Box
                color="#ffd27a"
                glow
                scale={[0.2, 0.26, 0.2]}
                position={[0, 0.12, 0]}
              />
            </group>
          ))}
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
function BridgeGlows() {
  return (
    <group position={[1, 2.07, BRIDGE_Z]}>
      {[-1.5, 1.5].flatMap((x) =>
        [-4.2, 4.2].map((z) => (
          <Glow
            key={`${x}${z}`}
            position={[x, 0, z]}
            size={1.3}
            opacity={0.4}
          />
        )),
      )}
    </group>
  );
}
// Village lamps: dark iron posts with a warm lantern head.
function Lantern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cylinder
        color="#2f2b27"
        position={[0, 1.3, 0]}
        scale={[0.07, 2.6, 0.07]}
      />
      <Cylinder
        color="#3a342e"
        position={[0, 0.12, 0]}
        scale={[0.2, 0.24, 0.2]}
      />
      <Box color="#2f2b27" position={[0, 2.66, 0]} scale={[0.46, 0.08, 0.46]} />
      <Cone color="#2f2b27" position={[0, 2.82, 0]} scale={[0.3, 0.24, 0.3]} />
      <Box
        color="#ffd27a"
        glow
        position={[0, 2.4, 0]}
        scale={[0.27, 0.42, 0.27]}
      />
      <Box color="#2f2b27" position={[0, 2.14, 0]} scale={[0.38, 0.07, 0.38]} />
    </group>
  );
}
function Campfire() {
  const flames = useRef<THREE.Group>(null),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (!flames.current || reduced) return;
    const t = clock.elapsedTime;
    flames.current.children.forEach((flame, i) => {
      flame.scale.y = 1 + Math.sin(t * 9 + i * 2.1) * 0.12;
      flame.rotation.y = t * (i % 2 ? 1.2 : -0.9);
    });
  });
  return (
    <group position={[6, 0, 19]}>
      <group ref={flames} userData={{ dynamic: true }}>
        <mesh position={[0, 0.62, 0]} scale={[0.36, 0.8, 0.36]}>
          <coneGeometry args={[1, 1, 6]} />
          <meshBasicMaterial color="#ff7a2a" toneMapped={false} />
        </mesh>
        <mesh position={[0.08, 0.52, 0.05]} scale={[0.22, 0.55, 0.22]}>
          <coneGeometry args={[1, 1, 6]} />
          <meshBasicMaterial color="#ffd36b" toneMapped={false} />
        </mesh>
      </group>
      <Glow position={[0, 0.8, 0]} color="#ff9a3c" size={3.2} opacity={0.5} />
    </group>
  );
}
function CampfireBase() {
  return (
    <group position={[6, 0, 19]}>
      <Cylinder
        color="#7d7a70"
        position={[0, 0.04, 0]}
        scale={[1.25, 0.08, 1.25]}
      />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <Rock
            key={i}
            color={i % 2 ? "#9a9b92" : "#b3b2a7"}
            position={[Math.cos(a) * 0.95, 0.16, Math.sin(a) * 0.95]}
            scale={[0.26, 0.2, 0.24]}
          />
        );
      })}
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          color="#6e4527"
          position={[0, 0.2, 0]}
          rotation={[0, i * 2.1, 0.18]}
          scale={[1.25, 0.16, 0.16]}
        />
      ))}
      {[-1, 1].map((side) => (
        <Box
          key={side}
          color="#8b6239"
          position={[side * 1.9, 0.25, 0.4 * side]}
          rotation={[0, side * 0.6, 0]}
          scale={[1.1, 0.26, 0.4]}
        />
      ))}
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
const LANTERNS = [
  [-3, 3],
  [3, -2],
  [-6, 8],
  [10, 11],
  [13, 1],
];
function World() {
  const decor = useMemo(() => makeScenery(), []);
  return (
    <>
      <LivingSky />
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <shadowMaterial transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <Terrain />
      <RigidBody type="fixed" colliders={false}>
        {bankStrips.flatMap(({ x, edge, north, south }, i) =>
          [
            [-edge, Math.min(edge, north)],
            [Math.max(-edge, south), edge],
          ].map(([from, to], side) =>
            to > from ? (
              <CuboidCollider
                key={`bank-${i}-${side}`}
                args={[0.25, 0.18, (to - from) / 2]}
                position={[x, -0.18, (from + to) / 2]}
                friction={0.9}
              />
            ) : null,
          ),
        )}
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
        {decor.fenceColliders.map((rail, i) => (
          <CuboidCollider
            key={`fence-${i}`}
            args={[rail.length / 2, 0.5, 0.08]}
            position={[rail.x, 0.5, rail.z]}
            rotation={[0, rail.angle, 0]}
          />
        ))}
        <CylinderCollider args={[0.6, 3]} position={[POND.x, 0.4, POND.z]} />
        <Baked>
          <Bridge />
        </Baked>
        <CuboidCollider args={[1.3, 0.5, 0.5]} position={[-4, 0.5, 18]} />
      </RigidBody>
      <Batch items={decor.trunks} kind="cylinder" />
      <Batch items={decor.cones} kind="cone" />
      <Batch items={decor.canopies} kind="sphere" />
      <Batch items={decor.bushes} kind="sphere" />
      <Batch items={decor.rocks} kind="sphere" />
      <Batch items={decor.paths} kind="sphere" shadow={false} />
      <Batch items={decor.grass} kind="cone" shadow={false} />
      <Batch items={decor.leaves} kind="sphere" shadow={false} />
      <Batch items={decor.flowers} kind="gem" shadow={false} />
      <Batch items={decor.reeds} kind="cylinder" shadow={false} />
      <Batch items={decor.cattails} kind="cylinder" shadow={false} />
      <Batch items={decor.lilies} kind="cylinder" shadow={false} />
      <Batch items={decor.fencePosts} kind="box" />
      <Batch items={decor.fenceRails} kind="box" />
      <BridgeGlows />
      <Buildings />
      <VillageGate />
      <VillageDetails />
      <Effects />
      <Campfire />
      <Baked>
        <CampfireBase />
        {LANTERNS.map(([x, z]) => (
          <Lantern key={`${x}-${z}`} x={x} z={z} />
        ))}
        <group position={[-4, 0, 18]}>
          <Box color="#9a6a3c" position={[0, 0.7, 0]} scale={[2.5, 0.18, 1]} />
          <Box
            color="#a8763f"
            position={[0, 1.1, -0.4]}
            scale={[2.5, 0.6, 0.14]}
          />
          {[-1, 1].map((x) => (
            <Box
              key={x}
              color="#5e3f27"
              position={[x, 0.35, 0]}
              scale={[0.15, 0.7, 0.8]}
            />
          ))}
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
                color={["#a6a99f", "#8f948b", "#b8b8ad"][(i + j) % 3]}
                position={[j * 0.55, 0.4 + j * 0.2, 0]}
                scale={[0.7, 0.65, 0.7]}
              />
            ))}
          </group>
        ))}
      </Baked>
      {LANTERNS.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <NightLamp x={0} z={0} />
          <Glow position={[0, 2.4, 0]} size={1.5} opacity={0.42} />
        </group>
      ))}
    </>
  );
}
// The canvas re-renders with UI state; the static world never needs to.
export default memo(World);
