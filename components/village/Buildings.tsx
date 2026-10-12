"use client";
import HouseDetails from "./HouseDetails";
import { useRef, useLayoutEffect } from "react";
import { Object3D, Color, type InstancedMesh } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Box, Cone, Cylinder, Rock, geometries, material } from "./Primitives";
import { locations, type VillageLocation } from "@/lib/village/data";

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
      <Box color="#543d2d" scale={[0.95, 1.2, 0.13]} />
      <Box
        color="#ffcf7e"
        glow
        position={[0, 0, 0.08]}
        scale={[0.72, 0.94, 0.05]}
      />
      <Box color="#66452e" position={[0, 0, 0.13]} scale={[0.07, 1, 0.05]} />
      <Box color="#66452e" position={[0, 0, 0.13]} scale={[0.8, 0.07, 0.05]} />
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
          <Box color="#4c392c" scale={[width * 0.64, 0.2, depth]} />
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
  const library = location.id === "skills",
    guild = location.id === "experience",
    forge = location.id === "projects";
  const width = guild ? 6 : 4.6,
    depth = guild ? 5 : 4;
  return (
    <>
      <Box
        color="#8c9186"
        position={[0, 0.4, 0]}
        scale={[width + 0.35, 0.8, depth + 0.35]}
      />
      <Box
        color={library ? "#c5c6a2" : "#e1ce9f"}
        position={[0, 2.1, 0]}
        scale={[width, 3.4, depth]}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            color="#6a4a35"
            position={[(side * width) / 2, 2.15, depth / 2 + 0.08]}
            scale={[0.24, 3.7, 0.22]}
          />
          <Box
            color="#6a4a35"
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
          color="#6a4a35"
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
      <Roof
        color={library ? "#578589" : location.color}
        width={width + 1.2}
        depth={depth + 1.1}
      />
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
          <Cone
            color="#ff873d"
            position={[0, 1.65, 0]}
            scale={[0.6, 1.2, 0.6]}
          />
          <Cone
            color="#ffd28a"
            position={[0, 1.45, 0.2]}
            scale={[0.35, 0.85, 0.35]}
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
      <Box color="#d9c9a0" position={[0, 5.2, 0]} scale={[2.9, 2.25, 2.9]} />
      <Window x={0} y={5.3} z={1.5} />
      <Roof color="#578589" width={4.2} depth={4.2} y={6.2} />
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
export default function Buildings() {
  return (
    <>
      {locations.map((location) => (
        <group key={location.id} position={location.position}>
          <RigidBody type="fixed" colliders={false}>
            {location.id === "contact" ? (
              <Tower />
            ) : (
              <Cottage location={location} />
            )}
            <HouseDetails
              kind={location.id}
              width={location.id === "experience" ? 6 : 4.6}
              depth={location.id === "experience" ? 5 : 4}
            />
          </RigidBody>
        </group>
      ))}
    </>
  );
}
