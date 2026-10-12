"use client";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Box } from "./Primitives";

export default function VillageGate() {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, 0, 21]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 3, 0, 0]}>
          <Box
            color="#856443"
            position={[0, 0.7, 0]}
            scale={[0.28, 1.4, 0.28]}
          />
          <Box
            color="#c1a375"
            position={[0, 1.45, 0]}
            scale={[0.36, 0.12, 0.36]}
          />
          {[0.45, 1.05].map((y) => (
            <Box
              key={y}
              color="#9d7b51"
              position={[side * 1.2, y, 0]}
              scale={[2.4, 0.12, 0.12]}
            />
          ))}
          <CuboidCollider args={[0.18, 0.75, 0.18]} position={[0, 0.75, 0]} />
          <CuboidCollider
            args={[1.2, 0.6, 0.08]}
            position={[side * 1.2, 0.6, 0]}
          />
        </group>
      ))}
    </RigidBody>
  );
}
