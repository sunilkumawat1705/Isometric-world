"use client";
import HouseDetails from "./HouseDetails";
import { memo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, Color, type Group, type InstancedMesh } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import {
  Baked,
  Box,
  Cylinder,
  Glow,
  Rock,
  geometries,
  material,
} from "./Primitives";
import { locations, type VillageLocation } from "@/lib/village/data";
import { useGame } from "@/lib/village/store";

// Storybook roof colours; the map keeps the quieter section colours.
const ROOF: Record<VillageLocation["id"], string> = {
  about: "#d4533e",
  projects: "#eb8a34",
  skills: "#4f8dc0",
  experience: "#d05a43",
  contact: "#4f8dc0",
};
const WALL = "#f2e1ba",
  TIMBER = "#5d3c26";
const BLOOMS = ["#ff8fb3", "#ffd84d", "#fffaf0", "#ff6f61"];
function FlowerBox({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <Box color="#7a4f2e" scale={[0.95, 0.2, 0.28]} />
      <Rock
        color="#5e9e3b"
        position={[0, 0.14, 0]}
        scale={[0.42, 0.12, 0.13]}
      />
      {[-0.32, -0.12, 0.1, 0.3].map((fx, i) => (
        <Rock
          key={fx}
          color={BLOOMS[i]}
          position={[fx, 0.22, 0.04]}
          scale={[0.08, 0.07, 0.08]}
        />
      ))}
    </group>
  );
}
function Smoke({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null),
    reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    ref.current.children.forEach((puff, i) => {
      const t = (clock.elapsedTime * 0.22 + i / 5) % 1;
      puff.position.set(
        Math.sin(t * 4 + i) * 0.3,
        t * 2.6,
        Math.cos(t * 3) * 0.2,
      );
      puff.scale.setScalar(0.16 + t * 0.38);
    });
  });
  return (
    <group ref={ref} position={position}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, i * 0.5, 0]} scale={0.2 + i * 0.07}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ecebe2"
            transparent
            opacity={0.32}
            depthWrite={false}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function Window({
  x,
  y,
  z,
  side = false,
}: {
  x: number;
  y: number;
  z: number;
  side?: boolean;
}) {
  return (
    <group position={[x, y, z]} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
      <Box color="#4f321f" scale={[0.95, 1.2, 0.13]} />
      <Box
        color="#ffc56a"
        glow
        position={[0, 0, 0.08]}
        scale={[0.72, 0.94, 0.05]}
      />
      <Box color="#5d3c26" position={[0, 0, 0.13]} scale={[0.07, 1, 0.05]} />
      <Box color="#5d3c26" position={[0, 0, 0.13]} scale={[0.8, 0.07, 0.05]} />
      <Box
        color="#a77d4c"
        position={[0, -0.64, 0.12]}
        scale={[1.1, 0.13, 0.4]}
      />
    </group>
  );
}
function RoofTiles({
  color,
  width,
  depth,
}: {
  color: string;
  width: number;
  depth: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const dummy = new Object3D();
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 8; col++) {
        const index = row * 8 + col;
        dummy.position.set(
          (row - 2.5) * width * 0.105,
          0.16,
          ((col - 3.5) * depth) / 8,
        );
        dummy.scale.set(width * 0.115, 0.14, (depth / 8) * 0.95);
        dummy.rotation.set(0, 0.025 * (col % 2), 0);
        dummy.updateMatrix();
        ref.current.setMatrixAt(index, dummy.matrix);
        ref.current.setColorAt(
          index,
          new Color(color).multiplyScalar(row % 2 ? 1 : 1.12),
        );
      }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [color, width, depth]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometries.box, material("#ffffff"), 48]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
function Roof({
  color,
  width = 5.8,
  depth = 5.3,
  y = 4,
}: {
  color: string;
  width?: number;
  depth?: number;
  y?: number;
}) {
  const slope = 0.65;
  return (
    <group position={[0, y, 0]}>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[(side * width) / 4, 0.6, 0]}
          rotation={[0, 0, -side * slope]}
        >
          <Box color="#4a2f20" scale={[width * 0.64, 0.2, depth]} />
          <RoofTiles color={color} width={width} depth={depth} />
        </group>
      ))}
      <Box
        color={color}
        position={[0, 1.48, 0]}
        scale={[0.4, 0.3, depth + 0.65]}
      />
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * width * 0.48, -0.2, 0]}
          rotation={[0, 0, side * 0.18]}
        >
          <Box color={color} scale={[0.85, 0.22, depth + 0.45]} />
        </group>
      ))}
    </group>
  );
}
function Cottage({ location }: { location: VillageLocation }) {
  const guild = location.id === "experience",
    forge = location.id === "projects";
  const width = guild ? 6 : 4.6,
    depth = guild ? 5 : 4;
  return (
    <>
      <Box
        color="#9d9d92"
        position={[0, 0.4, 0]}
        scale={[width + 0.35, 0.8, depth + 0.35]}
      />
      <Box color={WALL} position={[0, 2.1, 0]} scale={[width, 3.4, depth]} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            color={TIMBER}
            position={[(side * width) / 2, 2.15, depth / 2 + 0.08]}
            scale={[0.24, 3.7, 0.22]}
          />
          <Box
            color={TIMBER}
            position={[(side * width) / 2, 2.15, -depth / 2]}
            scale={[0.24, 3.7, 0.22]}
          />
          <Window x={side * 1.48} y={2.15} z={depth / 2 + 0.1} />
          <Window x={(side * width) / 2 + 0.1 * side} y={2.2} z={0} side />
        </group>
      ))}
      {[0.8, 3.35].map((y) => (
        <Box
          key={y}
          color={TIMBER}
          position={[0, y, depth / 2 + 0.1]}
          scale={[width, 0.2, 0.2]}
        />
      ))}
      <Box
        color="#654832"
        position={[0, 1.55, depth / 2 + 0.15]}
        scale={[1.15, 2.35, 0.16]}
      />
      <Box
        color="#a37142"
        position={[0, 1.5, depth / 2 + 0.26]}
        scale={[0.9, 2.1, 0.08]}
      />
      <Rock
        color="#e9bb67"
        position={[0.3, 1.5, depth / 2 + 0.34]}
        scale={[0.075, 0.075, 0.075]}
      />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          color="#a5a48c"
          position={[0, 0.12 + i * 0.13, depth / 2 + 0.95 - i * 0.23]}
          scale={[1.65, 0.25, 1 - i * 0.18]}
        />
      ))}
      <Roof color={ROOF[location.id]} width={width + 1.2} depth={depth + 1.1} />
      {[-1, 1].map((side) => (
        <FlowerBox key={side} x={side * 1.48} y={1.42} z={depth / 2 + 0.3} />
      ))}
      <group position={[0.95, 2.75, depth / 2 + 0.3]}>
        <Box color="#2f2b27" scale={[0.2, 0.08, 0.2]} position={[0, 0.2, 0]} />
        <Box color="#ffd27a" glow scale={[0.16, 0.24, 0.16]} />
      </group>
      {location.id === "about" && (
        <group position={[1.4, 0, -0.9]}>
          <Box color="#8f8a80" position={[0, 5.1, 0]} scale={[0.8, 2.6, 0.8]} />
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              color="#a7a195"
              position={[0, 4.2 + i * 0.62, 0]}
              scale={[0.84, 0.1, 0.84]}
            />
          ))}
          <Box
            color="#6f6a62"
            position={[0, 6.45, 0]}
            scale={[0.98, 0.2, 0.98]}
          />
        </group>
      )}
      {guild &&
        [-1, 1].map((i) => (
          <group key={i} position={[i * 2.65, 2.5, depth / 2 + 0.24]}>
            <Box color="#647f58" scale={[0.7, 1.6, 0.06]} />
            <Box color="#e9c979" scale={[0.12, 1.4, 0.07]} />
          </group>
        ))}
      <group position={[-width / 2 - 0.7, 0, 1]}>
        <Cylinder
          color="#805433"
          position={[0, 0.52, 0]}
          scale={[0.48, 1, 0.48]}
        />
        {[0.2, 0.75].map((y) => (
          <Cylinder
            key={y}
            color="#484b3d"
            position={[0, y, 0]}
            scale={[0.5, 0.08, 0.5]}
          />
        ))}
      </group>
      {forge && (
        <group position={[-width / 2 - 1.8, 0, depth / 2 + 0.65]}>
          <Box
            color="#777e70"
            position={[0, 1.7, -1]}
            scale={[2.8, 2.7, 0.45]}
          />
          {[-1, 1].map((side) => (
            <Box
              key={side}
              color="#919681"
              position={[side * 1.2, 1.7, -0.25]}
              scale={[0.4, 2.7, 1.5]}
            />
          ))}
          <Box
            color="#b0ad91"
            position={[0, 2.85, -0.25]}
            scale={[2.9, 0.45, 1.8]}
          />
          <Box
            color="#878c77"
            position={[0, 3.65, -0.75]}
            scale={[0.9, 1.5, 0.8]}
          />
          <Box
            color="#a5a68e"
            position={[0, 4.45, -0.75]}
            scale={[1.1, 0.17, 1]}
          />
          <Box color="#7b7f73" position={[0, 0.5, 0]} scale={[2.7, 1, 2.7]} />
          <Box
            color="#4a4c42"
            position={[0, 1.05, 0]}
            scale={[2.3, 0.2, 2.3]}
          />
          <Box
            color="#ff7a2a"
            glow
            position={[0, 1.4, 0]}
            rotation={[0, 0.6, 0]}
            scale={[0.75, 0.55, 0.75]}
          />
          <Box
            color="#ffd36b"
            glow
            position={[0.1, 1.55, 0.15]}
            rotation={[0, 0.2, 0]}
            scale={[0.38, 0.5, 0.38]}
          />
          <pointLight
            color="#ff873d"
            intensity={8}
            distance={8}
            position={[0, 2, 0]}
          />
          <Box
            color="#333c3b"
            position={[1.5, 1.05, 1.9]}
            scale={[1.4, 0.35, 0.6]}
          />
          <Box
            color="#45504b"
            position={[1.5, 0.65, 1.9]}
            scale={[0.45, 0.6, 0.4]}
          />
          <CuboidCollider args={[1.35, 0.6, 1.35]} position={[0, 0.6, 0]} />
        </group>
      )}
      <group position={[-1, 0, depth / 2 + 1.65]}>
        <Box
          color="#76563c"
          position={[0, 0.35, 0]}
          scale={[1.25, 0.6, 0.55]}
        />
        {[-0.4, 0, 0.4].map((x) => (
          <Rock
            key={x}
            color="#71964f"
            position={[x, 0.7, 0]}
            scale={[0.4, 0.35, 0.4]}
          />
        ))}
      </group>
      {location.id === "about" && (
        <group position={[-3.8, 0, 3.5]}>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} position={[-i * 0.65, 0, 0]}>
              <Box
                color="#997847"
                position={[0, 0.55, 0]}
                scale={[0.13, 1.1, 0.14]}
              />
              <Rock
                color="#77984d"
                position={[0, 0.2, -0.7]}
                scale={[0.45, 0.3, 0.35]}
              />
              <Rock
                color="#e1ba66"
                position={[0, 0.43, -0.7]}
                scale={[0.12, 0.12, 0.12]}
              />
            </group>
          ))}
          <Box
            color="#967449"
            position={[-1, 0.75, 0]}
            scale={[2.5, 0.1, 0.13]}
          />
          <Box
            color="#967449"
            position={[-1, 0.3, 0]}
            scale={[2.5, 0.1, 0.13]}
          />
        </group>
      )}
      <CuboidCollider args={[width / 2, 2, depth / 2]} position={[0, 2, 0]} />
    </>
  );
}
function Tower() {
  return (
    <>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            color="#775237"
            position={[x * 1.5, 2.4, z * 1.5]}
            scale={[0.3, 4.8, 0.3]}
          />
        )),
      )}
      <Box color="#9c754d" position={[0, 4, 0]} scale={[3.7, 0.25, 3.7]} />
      <Box color={WALL} position={[0, 5.2, 0]} scale={[2.9, 2.25, 2.9]} />
      <Window x={0} y={5.3} z={1.5} />
      <Window x={1.5} y={5.3} z={0} side />
      <Roof color={ROOF.contact} width={4.2} depth={4.2} y={6.2} />
      <Box
        color="#8b633e"
        position={[0, 1.9, 2.1]}
        rotation={[0.28, 0, 0]}
        scale={[1.15, 4.1, 0.15]}
      />
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          color="#ba9662"
          position={[0, 0.25 + i * 0.4, 2.65 - i * 0.12]}
          scale={[1.3, 0.1, 0.25]}
        />
      ))}
      <Box color="#725238" position={[0, 8.8, 0]} scale={[0.12, 2, 0.12]} />
      <Box
        color="#b9503e"
        position={[0.45, 9.2, 0]}
        scale={[0.85, 0.5, 0.045]}
      />
      <CuboidCollider args={[1.7, 3.8, 1.7]} position={[0, 3.8, 0]} />
    </>
  );
}
function Buildings() {
  return (
    <>
      {locations.map((location) => {
        const depth = location.id === "experience" ? 5 : 4;
        return (
          <group key={location.id} position={location.position}>
            <RigidBody type="fixed" colliders={false}>
              <Baked>
                {location.id === "contact" ? (
                  <Tower />
                ) : (
                  <Cottage location={location} />
                )}
                <HouseDetails
                  kind={location.id}
                  width={location.id === "experience" ? 6 : 4.6}
                  depth={depth}
                />
              </Baked>
            </RigidBody>
            {location.id === "about" && <Smoke position={[1.4, 6.6, -0.9]} />}
            {location.id === "projects" && (
              <Glow
                position={[-4.1, 1.6, depth / 2 + 0.65]}
                color="#ff8a3a"
                size={3}
                opacity={0.5}
              />
            )}
            {location.id !== "contact" && (
              <Glow
                position={[0.95, 2.75, depth / 2 + 0.45]}
                size={1}
                opacity={0.35}
              />
            )}
          </group>
        );
      })}
    </>
  );
}
export default memo(Buildings);
