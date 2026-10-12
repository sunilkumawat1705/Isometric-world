"use client";
import { memo } from "react";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { Baked, Box, Cylinder } from "../Primitives";
import { PARKOUR_LODGE } from "@/lib/village/minigames/entrance";
import { useGame } from "@/lib/village/store";
import { useAdventure } from "@/lib/village/minigames/store";

// An open doorway, solid side/back walls and cached village primitives.
const ParkourLodge = memo(function ParkourLodge() {
  const { rapier } = useRapier();
  return (
    <RigidBody
      name="parkour-lodge"
      type="fixed"
      colliders={false}
      position={PARKOUR_LODGE}
    >
      <Baked>
        <Box color="#a5a48c" position={[0, 0.08, 0]} scale={[4.8, 0.16, 4.2]} />
        <CuboidCollider args={[2.4, 0.08, 2.1]} position={[0, 0.08, 0]} />
        <Box
          color="#f0deb6"
          position={[0, 1.5, -1.9]}
          scale={[4.4, 2.7, 0.25]}
        />
        <CuboidCollider args={[2.2, 1.5, 0.15]} position={[0, 1.5, -1.9]} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              color="#f0deb6"
              position={[side * 2.1, 1.5, 0]}
              scale={[0.25, 2.7, 3.8]}
            />
            <CuboidCollider
              args={[0.15, 1.5, 1.9]}
              position={[side * 2.1, 1.5, 0]}
            />
            <Box
              color="#715238"
              position={[side * 2.1, 1.55, 1.85]}
              scale={[0.28, 3, 0.28]}
            />
            <Box
              color="#f0deb6"
              position={[side * 1.6, 1.5, 1.85]}
              scale={[0.8, 2.7, 0.25]}
            />
            <CuboidCollider
              args={[0.45, 1.5, 0.15]}
              position={[side * 1.65, 1.5, 1.85]}
            />
            <Box
              color="#5b9e4a"
              position={[side * 1.25, 3.55, 0]}
              rotation={[0, 0, side * -0.38]}
              scale={[2.8, 0.22, 4.9]}
            />
          </group>
        ))}
        <Box
          color="#715238"
          position={[0, 2.9, 1.9]}
          scale={[4.5, 0.24, 0.3]}
        />
        <Box color="#715238" position={[0, 4.07, 0]} scale={[0.2, 0.2, 4.9]} />
        {/* A practice beam and stacked jumping blocks identify the lodge. */}
        <Box
          color="#89633e"
          position={[0, 0.55, -0.9]}
          scale={[2.8, 0.24, 0.5]}
        />
        {[-1, 1].map((side) => (
          <Box
            key={side}
            color="#715238"
            position={[side, 0.32, -0.9]}
            scale={[0.22, 0.5, 0.35]}
          />
        ))}
        <CuboidCollider args={[1.4, 0.4, 0.25]} position={[0, 0.4, -0.9]} />
        <Cylinder
          color="#715238"
          position={[2.65, 1.9, 1.8]}
          scale={[0.1, 3.8, 0.1]}
        />
        <Box
          color="#e6b953"
          position={[3.1, 3.2, 1.8]}
          scale={[0.85, 0.55, 0.06]}
        />
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            color="#a5a48c"
            position={[-2.9, 0.2 + i * 0.18, -1.2 + i * 0.85]}
            scale={[0.8, 0.4 + i * 0.36, 0.65]}
          />
        ))}
        <CuboidCollider
          sensor
          activeCollisionTypes={rapier.ActiveCollisionTypes.ALL}
          args={[0.9, 1, 0.35]}
          position={[0, 1, 1.4]}
          onIntersectionEnter={({ other }) => {
            const game = useGame.getState();
            if (
              other.rigidBodyObject?.name === "village-player" &&
              game.started &&
              !game.panel &&
              !useAdventure.getState().activeGame
            ) {
              useAdventure.getState().start("parkour");
            }
          }}
        />
      </Baked>
    </RigidBody>
  );
});
export default ParkourLodge;
