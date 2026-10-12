"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { Html } from "./SceneHtml";
import { Baked, Box, Cylinder, Rock, material } from "./Primitives";
import { locations } from "@/lib/village/data";
import { nearbyWaypoint } from "@/lib/village/wayfinding";
import { useAdventure } from "@/lib/village/minigames/store";
import { nearestActivity } from "@/lib/village/minigames/config";
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
const towerGeometry = new THREE.CylinderGeometry(0.85, 1.25, 4.3, 8),
  capGeometry = new THREE.ConeGeometry(1.35, 1.5, 8);
function Windmill() {
  const blades = useRef<THREE.Group>(null),
    reduced = useGame((s) => s.reduced);
  useFrame((_, dt) => {
    if (blades.current && !reduced) blades.current.rotation.z -= dt * 0.45;
  });
  return (
    <group position={[-16, 0, 23]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.4, 2.8, 1.4]} position={[0, 2.8, 0]} />
      </RigidBody>
      <group scale={1.25}>
        <Baked>
          <Cylinder
            color="#a5a397"
            position={[0, 0.2, 0]}
            scale={[1.45, 0.4, 1.45]}
          />
          <mesh
            geometry={towerGeometry}
            material={material("#f1e8d4")}
            position={[0, 2.55, 0]}
            rotation={[0, Math.PI / 8, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={capGeometry}
            material={material("#c44a3a")}
            position={[0, 5.45, 0]}
            rotation={[0, Math.PI / 8, 0]}
            castShadow
            receiveShadow
          />
          <Box
            color="#6b4429"
            position={[0, 1.05, 1.18]}
            scale={[0.62, 1.2, 0.1]}
          />
          <Box
            color="#ffc56a"
            glow
            position={[0, 3.1, 1.02]}
            scale={[0.4, 0.5, 0.08]}
          />
          <Box
            color="#6b4429"
            position={[0, 4.55, 0]}
            scale={[1.9, 0.14, 1.9]}
          />
          <Box
            color="#6b4429"
            position={[0, 4.35, 1.05]}
            scale={[0.36, 0.36, 0.5]}
          />
        </Baked>
        <group ref={blades} position={[0, 4.35, 1.4]}>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
              <Box
                color="#6b4429"
                position={[0, 1.55, 0]}
                scale={[0.12, 3.1, 0.1]}
              />
              <Box
                color="#f7f1e2"
                position={[0.36, 1.85, 0]}
                scale={[0.62, 2.1, 0.05]}
              />
              {[1.1, 1.75, 2.4].map((y) => (
                <Box
                  key={y}
                  color="#8a5d38"
                  position={[0.36, y, 0.04]}
                  scale={[0.66, 0.05, 0.04]}
                />
              ))}
            </group>
          ))}
          <Cylinder
            color="#5f4835"
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.24, 0.3, 0.24]}
          />
        </group>
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
        <Baked>
          <Box color="#6b4a2c" position={[0, 0.06, 0]} scale={[8, 0.12, 5]} />
          {Array.from({ length: 6 }, (_, row) => (
            <group key={row} position={[-3.2 + row * 1.25, 0, 0]}>
              <Box
                color="#553620"
                position={[0, 0.16, 0]}
                scale={[0.78, 0.16, 4.5]}
              />
              {Array.from({ length: 7 }, (_, col) => (
                <group key={col} position={[0, 0, -1.9 + col * 0.63]}>
                  <Rock
                    color={row % 3 === 1 ? "#5e9f3a" : "#86c44c"}
                    position={[0, 0.38, 0]}
                    scale={
                      row % 3 === 1 ? [0.24, 0.3, 0.24] : [0.27, 0.2, 0.27]
                    }
                  />
                  {row % 3 === 2 && col % 2 === 0 && (
                    <Rock
                      color="#ef8a2e"
                      position={[0.12, 0.3, 0.12]}
                      scale={[0.14, 0.12, 0.14]}
                    />
                  )}
                </group>
              ))}
            </group>
          ))}
          {[-1, 1].map((side) => (
            <group key={side}>
              {[-4, -2.7, -1.35, 0, 1.35, 2.7, 4].map((x) => (
                <Box
                  key={x}
                  color="#9b7046"
                  position={[x, 0.45, side * 2.7]}
                  scale={[0.14, 0.9, 0.14]}
                />
              ))}
              {[0.35, 0.7].map((y) => (
                <Box
                  key={y}
                  color="#b58653"
                  position={[0, y, side * 2.7]}
                  scale={[8, 0.09, 0.08]}
                />
              ))}
            </group>
          ))}
        </Baked>
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={side}
            args={[4, 0.6, 0.08]}
            position={[0, 0.6, side * 2.7]}
          />
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
      {/* Barrels, doorstep pots and split firewood give homes everyday use. */}
      <Baked>
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
              color="#c0714c"
              position={[1, 0.26, 0]}
              scale={[0.3, 0.52, 0.3]}
            />
            <Rock
              color="#6aa840"
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
      </Baked>
    </>
  );
}
