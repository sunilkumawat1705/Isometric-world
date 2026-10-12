"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { Html } from "./SceneHtml";
import { Box, Cylinder, Rock } from "./Primitives";
import { locations } from "@/lib/village/data";
import { nearbyWaypoint } from "@/lib/village/wayfinding";
import { useAdventure } from "@/lib/village/minigames/store";
import { nearestActivity } from "@/lib/village/minigames/config";
import { riverZ, WORLD_RADIUS } from "@/lib/village/terrain";
import { environmentRuntime } from "@/lib/village/environment";
import { useGame } from "@/lib/village/store";

function NearbyLabel() {
  const position = useGame((s) => s.position);
  const started = useGame((s) => s.started);
  const panel = useGame((s) => s.panel);
  const activeGame = useAdventure((s) => s.activeGame);
  const waypoint = nearbyWaypoint(...position);
  if (
    !started ||
    panel ||
    activeGame ||
    !waypoint ||
    nearestActivity(...position)
  )
    return null;
  const action = waypoint.action;
  const caption = (
    <>
      <strong>{waypoint.title}</strong>
      <span>{waypoint.detail}</span>
    </>
  );
  return (
    <Html
      center
      position={[waypoint.x, 3.15, waypoint.z]}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: waypoint.action ? "auto" : "none" }}
    >
      {waypoint.action ? (
        <button
          className="village-sign-caption"
          aria-label={`Open ${waypoint.title}`}
          onClick={() => action && useGame.getState().open(action)}
        >
          {caption}
        </button>
      ) : (
        <div
          className="village-sign-caption"
          role="note"
          aria-label="Nearby village sign"
        >
          {caption}
        </div>
      )}
    </Html>
  );
}
function Windmill() {
  const blades = useRef<THREE.Group>(null),
    reduced = useGame((s) => s.reduced);
  useFrame((_, dt) => {
    if (blades.current && !reduced) blades.current.rotation.z -= dt * 0.45;
  });
  return (
    <group position={[-16, 0, 23]}>
      <RigidBody type="fixed" colliders="cuboid">
        <Box color="#cdbb92" position={[0, 2, 0]} scale={[2, 4, 2]} />
      </RigidBody>
      <mesh position={[0, 4.5, 0]}>
        <coneGeometry args={[1.7, 1.4, 4]} />
        <meshStandardMaterial color="#774838" />
      </mesh>
      <group ref={blades} position={[0, 3.8, 1.2]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <Box
              color="#674c35"
              position={[0, 1.4, 0]}
              scale={[0.13, 2.8, 0.13]}
            />
            <Box
              color="#dfd3ab"
              position={[0.35, 1.65, 0]}
              scale={[0.65, 1.65, 0.08]}
            />
          </group>
        ))}
        <Cylinder
          color="#5f4835"
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.23, 0.3, 0.23]}
        />
      </group>
    </group>
  );
}
export function NightLamp({ x, z }: { x: number; z: number }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (light.current)
      light.current.intensity = (1 - environmentRuntime.daylight) * 9;
  });
  return (
    <pointLight
      ref={light}
      position={[x, 2.35, z]}
      color="#ffb966"
      distance={7}
      decay={2}
      intensity={0}
    />
  );
}
export default function VillageDetails() {
  return (
    <>
      <NearbyLabel />
      <Windmill />
      <RigidBody type="fixed" colliders={false} position={[12, 0, 24]}>
        <Box color="#61482e" position={[0, 0.1, 0]} scale={[8, 0.2, 5]} />
        {Array.from({ length: 6 }, (_, row) => (
          <group key={row} position={[-3.2 + row * 1.25, 0, 0]}>
            <Box
              color="#80613d"
              position={[0, 0.18, 0]}
              scale={[0.75, 0.12, 4.5]}
            />
            {Array.from({ length: 7 }, (_, col) => (
              <group key={col} position={[0, 0, -1.9 + col * 0.6]}>
                <Cylinder
                  color="#7d9750"
                  position={[0, 0.5, 0]}
                  scale={[0.035, 0.7, 0.035]}
                />
                <Rock
                  color="#c9b46a"
                  position={[0, 0.86, 0]}
                  scale={[0.13, 0.24, 0.13]}
                />
              </group>
            ))}
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={side}>
            {[-3, -1, 1, 3].map((x) => (
              <Box
                key={x}
                color="#94744e"
                position={[x, 0.6, side * 2.7]}
                scale={[0.14, 1.2, 0.14]}
              />
            ))}
            <Box
              color="#a1875d"
              position={[0, 0.8, side * 2.7]}
              scale={[8, 0.12, 0.1]}
            />
            <CuboidCollider
              args={[4, 0.6, 0.08]}
              position={[0, 0.6, side * 2.7]}
            />
          </group>
        ))}
      </RigidBody>
      {/* Weight, friction and character impulses make these genuinely pushable. */}
      {[
        [-5, 2],
        [11, -3],
        [9, 21],
      ].map(([x, z], i) => (
        <RigidBody
          key={i}
          type="dynamic"
          position={[x, 0.55, z]}
          colliders="cuboid"
          mass={8}
          friction={0.8}
          restitution={0.05}
          linearDamping={1.5}
          angularDamping={2}
        >
          <Box color="#a08051" scale={[0.85, 0.85, 0.85]} />
          {[-1, 1].map((side) => (
            <Box
              key={side}
              color="#624a32"
              position={[0, side * 0.32, 0]}
              scale={[0.89, 0.1, 0.89]}
            />
          ))}
        </RigidBody>
      ))}
      {/* Riverbank stones and reeds follow the same curve as the water. */}
      {Array.from({ length: 35 }, (_, i) => {
        const x = -29 + i * 1.7,
          z = riverZ(x);
        if (Math.abs(x - 1) < 2.5 || Math.hypot(x, z + 3) > WORLD_RADIUS - 1)
          return null;
        return (
          <group key={i}>
            {[-1, 1].map((side) => (
              <group key={side} position={[x, 0, z + side * 2.8]}>
                <Rock
                  color={i % 2 ? "#a3a591" : "#7b8675"}
                  position={[0, 0.12, 0]}
                  scale={[0.45, 0.26, 0.35]}
                />
                <Cylinder
                  color="#6f8150"
                  position={[0.35, 0.5, 0]}
                  scale={[0.035, 1, 0.035]}
                />
                <Cylinder
                  color="#735437"
                  position={[0.35, 1, 0]}
                  scale={[0.07, 0.28, 0.07]}
                />
              </group>
            ))}
          </group>
        );
      })}
      {/* Barrels, doorstep pots and split firewood give homes everyday use. */}
      {locations.map((l) => (
        <group
          key={l.id}
          position={[l.position[0] - 2.8, 0, l.position[2] + 2.2]}
        >
          <RigidBody type="fixed" colliders="hull">
            <Cylinder
              color="#8d6845"
              position={[0, 0.48, 0]}
              scale={[0.48, 0.96, 0.48]}
            />
          </RigidBody>
          {[0.2, 0.75].map((y) => (
            <Cylinder
              key={y}
              color="#514c40"
              position={[0, y, 0]}
              scale={[0.5, 0.08, 0.5]}
            />
          ))}
          <Cylinder
            color="#b57251"
            position={[1, 0.26, 0]}
            scale={[0.3, 0.52, 0.3]}
          />
          <Rock
            color="#6c8d4c"
            position={[1, 0.63, 0]}
            scale={[0.38, 0.4, 0.38]}
          />
          {[0, 1, 2].map((i) => (
            <Cylinder
              key={i}
              color="#927045"
              position={[0.15 + i * 0.3, 0.16, -0.9]}
              rotation={[0, 0, Math.PI / 2]}
              scale={[0.15, 0.9, 0.15]}
            />
          ))}
        </group>
      ))}
    </>
  );
}
