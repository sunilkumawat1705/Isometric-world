"use client";
import { memo } from "react";
import { CuboidCollider } from "@react-three/rapier";
import { Box, Cylinder, Rock } from "./Primitives";
import type { Section } from "@/lib/village/data";

// Static props reuse the village's cached geometry and materials.
const HouseDetails = memo(function HouseDetails({
  kind,
  width = 4.6,
  depth = 4,
}: {
  kind: Section;
  width?: number;
  depth?: number;
}) {
  if (kind === "contact")
    return (
      <group position={[2.4, 0, 2.6]}>
        <CuboidCollider args={[0.4, 0.35, 0.28]} position={[0, 1.4, 0]} />
        <Box
          color="#67472f"
          position={[0, 0.65, 0]}
          scale={[0.15, 1.3, 0.15]}
        />
        <Box color="#587866" position={[0, 1.4, 0]} scale={[0.8, 0.65, 0.55]} />
        <Box
          color="#243b32"
          position={[0, 1.5, 0.29]}
          scale={[0.55, 0.08, 0.03]}
        />
        <Box
          color="#e8d7ae"
          position={[0.1, 1.52, 0.32]}
          rotation={[0, 0, -0.12]}
          scale={[0.35, 0.2, 0.025]}
        />
      </group>
    );
  if (kind === "about")
    return (
      <group position={[3.2, 0, 1]}>
        <CuboidCollider args={[0.75, 0.65, 0.3]} position={[0, 0.65, 0]} />
        <Box color="#785335" position={[0, 0.65, 0]} scale={[1.5, 1.3, 0.6]} />
        {[0, 1, 2].map((i) => (
          <Cylinder
            key={i}
            color="#e4d0a4"
            position={[-0.48 + i * 0.48, 1.45, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.13, 0.5, 0.13]}
          />
        ))}
        <Box
          color="#344e43"
          position={[0, 1.1, 0.32]}
          scale={[1.2, 0.18, 0.035]}
        />
      </group>
    );
  return (
    <>
      {/* Shutters flank the windows without covering the glazing. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.48, 2.15, depth / 2 + 0.23]}>
          {[-1, 1].map((edge) => (
            <Box
              key={edge}
              color="#526b52"
              position={[edge * 0.68, 0, 0]}
              scale={[0.27, 1.12, 0.09]}
            />
          ))}
        </group>
      ))}
      <group position={[width / 2 + 1, 0, 0.8]}>
        <CuboidCollider args={[0.7, 0.5, 0.425]} position={[0, 0.5, 0]} />
        <Box
          color="#795437"
          position={[0, 0.95, 0]}
          scale={[1.4, 0.17, 0.85]}
        />
        {[-1, 1].map((side) => (
          <Box
            key={side}
            color="#67472f"
            position={[side * 0.5, 0.47, 0]}
            scale={[0.15, 0.94, 0.6]}
          />
        ))}
        {kind === "skills" ? (
          ["#a84e39", "#4e7777", "#c1a362"].map((color, i) => (
            <group key={color} position={[-0.4 + i * 0.36, 1.16, 0]}>
              <Box color={color} scale={[0.26, 0.24, 0.5]} />
              <Box
                color="#e6d9b7"
                position={[0.02, 0, 0.02]}
                scale={[0.22, 0.16, 0.49]}
              />
            </group>
          ))
        ) : kind === "projects" ? (
          <>
            <Box
              color="#3d4745"
              position={[0, 1.1, 0]}
              scale={[0.65, 0.15, 0.23]}
            />
            <Box
              color="#987144"
              position={[0.28, 1.17, 0.15]}
              rotation={[0, 0.4, 0]}
              scale={[0.1, 0.1, 0.6]}
            />
            <Box
              color="#657472"
              position={[0.16, 1.2, 0.4]}
              scale={[0.38, 0.2, 0.2]}
            />
            <Cylinder
              color="#536460"
              position={[0.1, 1.14, -0.2]}
              rotation={[Math.PI / 2, 0, 0.35]}
              scale={[0.045, 0.8, 0.045]}
            />
          </>
        ) : (
          <>
            <Box
              color="#daccaa"
              position={[0, 1.06, 0]}
              scale={[0.9, 0.03, 0.55]}
            />
            <Box
              color="#aa4838"
              position={[0.35, 1.14, 0.12]}
              scale={[0.16, 0.15, 0.16]}
            />
            <Cylinder
              color="#e1bb70"
              position={[-0.4, 1.15, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[0.12, 0.5, 0.12]}
            />
          </>
        )}
      </group>
      {kind === "projects" && (
        <group
          position={[-width / 2 - 0.35, 0, depth / 2 + 1.1]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          {/* Village smith: leather apron, rolled sleeves and a hand hammer. */}
          <Box
            color="#44514b"
            position={[0, 0.45, 0]}
            scale={[0.48, 0.9, 0.3]}
          />
          <Box color="#d2b787" position={[0, 1.1, 0]} scale={[0.7, 0.6, 0.4]} />
          <Box
            color="#755036"
            position={[0, 1.04, 0.23]}
            scale={[0.55, 0.7, 0.08]}
          />
          <Rock
            color="#c29b75"
            position={[0, 1.65, 0]}
            scale={[0.27, 0.3, 0.25]}
          />
          <Box
            color="#43443b"
            position={[0, 1.82, -0.06]}
            scale={[0.52, 0.2, 0.4]}
          />
          {[-1, 1].map((side) => (
            <Box
              key={side}
              color="#c29b75"
              position={[side * 0.4, 1.05, 0.2]}
              rotation={[0.45, 0, side * 0.2]}
              scale={[0.18, 0.5, 0.18]}
            />
          ))}
          <Cylinder
            color="#9c7749"
            position={[0.42, 1.15, 0.38]}
            scale={[0.055, 0.5, 0.055]}
          />
          <Box
            color="#64716c"
            position={[0.42, 1.42, 0.38]}
            scale={[0.4, 0.18, 0.2]}
          />
          <CuboidCollider args={[0.45, 0.85, 0.3]} position={[0, 0.85, 0.1]} />
        </group>
      )}
      {kind === "projects" && (
        <group position={[-width / 2 - 0.2, 0, depth / 2 + 2.1]}>
          <Cylinder
            color="#4c5752"
            position={[0, 0.3, 0]}
            scale={[0.42, 0.6, 0.42]}
          />
          <Cylinder
            color="#6ca0a4"
            position={[0, 0.61, 0]}
            scale={[0.35, 0.025, 0.35]}
          />
          <Rock
            color="#8b9590"
            position={[0.06, 0.75, 0]}
            scale={[0.25, 0.12, 0.12]}
          />
        </group>
      )}
    </>
  );
});
export default HouseDetails;
