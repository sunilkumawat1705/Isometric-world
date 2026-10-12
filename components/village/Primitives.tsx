import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { memo, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ThreeElements } from "@react-three/fiber";
const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.IcosahedronGeometry(1, 1);
const gem = new THREE.IcosahedronGeometry(1, 0);
const cone = new THREE.ConeGeometry(1, 1, 7);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
let realistic = false;
const mats = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: string, glow = false) {
  const key = color + glow;
  if (!mats.has(key)) {
    mats.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        flatShading: true,
        emissive: glow ? color : "#000",
        emissiveIntensity: glow ? 1.35 : 0,
      }),
    );
    configureMaterial(mats.get(key)!);
  }
  return mats.get(key)!;
}
type Props = Omit<ThreeElements["mesh"], "geometry" | "material"> & {
  color: string;
  glow?: boolean;
};
export function Box({ color, glow, ...props }: Props) {
  return (
    <mesh
      geometry={box}
      material={material(color, glow)}
      castShadow
      receiveShadow
      dispose={null}
      {...props}
    />
  );
}
export function Rock({ color, ...props }: Props) {
  return (
    <mesh
      geometry={sphere}
      material={material(color)}
      castShadow
      receiveShadow
      dispose={null}
      {...props}
    />
  );
}
export function Cone({ color, ...props }: Props) {
  return (
    <mesh
      geometry={cone}
      material={material(color)}
      castShadow
      receiveShadow
      dispose={null}
      {...props}
    />
  );
}
export function Cylinder({ color, ...props }: Props) {
  return (
    <mesh
      geometry={cylinder}
      material={material(color)}
      castShadow
      receiveShadow
      dispose={null}
      {...props}
    />
  );
}
export const geometries = { box, sphere, gem, cone, cylinder };

function configureMaterial(mat: THREE.MeshStandardMaterial) {
  mat.roughness = realistic ? 0.78 : 0.95;
  mat.onBeforeCompile = realistic
    ? (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vSurfacePosition;",
          )
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvSurfacePosition = (modelMatrix * vec4(position, 1.0)).xyz;",
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vSurfacePosition;",
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
      float grain = sin(vSurfacePosition.x * 7.0) * sin(vSurfacePosition.z * 9.0);
      float strata = sin(vSurfacePosition.y * 65.0 + sin(vSurfacePosition.x * 9.0) * 2.0);
      diffuseColor.rgb *= 0.97 + grain * 0.015 + strata * 0.015;
    `,
          );
      }
    : THREE.Material.prototype.onBeforeCompile;
  mat.customProgramCacheKey = realistic
    ? () => "forest-realistic-v2"
    : THREE.Material.prototype.customProgramCacheKey;
  mat.needsUpdate = true;
}
export function setRealisticMaterials(enabled: boolean) {
  realistic = enabled;
  mats.forEach(configureMaterial);
}

// Static props are authored as many small primitives. Baking merges every
// cached-material mesh below it into one vertex-coloured mesh (plus one for
// glowing parts) and moves the originals to a layer the cameras never render.
// The originals stay mounted, so auto-colliders and Html anchors keep working.
const HIDDEN_LAYER = 30;
const bakedSolid = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  flatShading: true,
});
mats.set("baked", bakedSolid);
configureMaterial(bakedSolid);
const bakedGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
const cachedMaterials = () => new Set<THREE.Material>(mats.values());
function paint(
  source: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  color: THREE.Color,
) {
  const geometry = (
    source.index ? source.toNonIndexed() : source.clone()
  ) as THREE.BufferGeometry;
  for (const name of Object.keys(geometry.attributes))
    if (name !== "position" && name !== "normal")
      geometry.deleteAttribute(name);
  geometry.applyMatrix4(matrix);
  const count = geometry.getAttribute("position").count,
    colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
export const Baked = memo(function Baked({
  children,
}: {
  children: ReactNode;
}) {
  const root = useRef<THREE.Group>(null);
  const [baked, setBaked] = useState<{
    solid: THREE.BufferGeometry | null;
    glow: THREE.BufferGeometry | null;
  } | null>(null);
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert(),
      known = cachedMaterials(),
      solid: THREE.BufferGeometry[] = [],
      glow: THREE.BufferGeometry[] = [],
      hidden: THREE.Object3D[] = [],
      local = new THREE.Matrix4(),
      instance = new THREE.Matrix4(),
      tint = new THREE.Color();
    const visit = (object: THREE.Object3D) => {
      if (object.userData.baked || object.userData.dynamic) return;
      const mesh = object as THREE.Mesh;
      if (
        mesh.isMesh &&
        !Array.isArray(mesh.material) &&
        known.has(mesh.material)
      ) {
        const mat = mesh.material as THREE.MeshStandardMaterial,
          lit = mat.emissiveIntensity > 0;
        local.multiplyMatrices(inverse, mesh.matrixWorld);
        const target = lit ? glow : solid;
        const instanced = mesh as THREE.InstancedMesh;
        if (instanced.isInstancedMesh) {
          for (let i = 0; i < instanced.count; i++) {
            instanced.getMatrixAt(i, instance);
            if (instanced.instanceColor) instanced.getColorAt(i, tint);
            else tint.setRGB(1, 1, 1);
            tint.multiply(mat.color);
            target.push(
              paint(
                mesh.geometry,
                instance.premultiply(local),
                lit ? tint.multiplyScalar(1.7) : tint,
              ),
            );
          }
        } else
          target.push(
            paint(
              mesh.geometry,
              local,
              lit ? tint.copy(mat.color).multiplyScalar(1.7) : mat.color,
            ),
          );
        mesh.layers.set(HIDDEN_LAYER);
        hidden.push(mesh);
      }
      object.children.forEach(visit);
    };
    group.children.forEach(visit);
    const next = {
      solid: solid.length ? mergeGeometries(solid) : null,
      glow: glow.length ? mergeGeometries(glow) : null,
    };
    solid.concat(glow).forEach((g) => g.dispose());
    setBaked(next);
    return () => {
      hidden.forEach((mesh) => mesh.layers.set(0));
      next.solid?.dispose();
      next.glow?.dispose();
    };
  }, []);
  return (
    <group ref={root}>
      {children}
      {baked?.solid && (
        <mesh
          geometry={baked.solid}
          material={bakedSolid}
          castShadow
          receiveShadow
          userData={{ baked: true }}
        />
      )}
      {baked?.glow && (
        <mesh
          geometry={baked.glow}
          material={bakedGlow}
          userData={{ baked: true }}
        />
      )}
    </group>
  );
});

// Soft additive halo for lamps and fire; cheaper than a bloom pass.
let haloTexture: THREE.CanvasTexture | null = null;
export function halo() {
  if (haloTexture) return haloTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!,
    gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  haloTexture = new THREE.CanvasTexture(canvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  return haloTexture;
}
export function Glow({
  color = "#ffc46b",
  size = 1.6,
  opacity = 0.55,
  ...props
}: Omit<ThreeElements["sprite"], "scale"> & {
  color?: string;
  size?: number;
  opacity?: number;
}) {
  return (
    <sprite scale={size} userData={{ dynamic: true }} {...props}>
      <spriteMaterial
        map={halo()}
        color={color}
        opacity={opacity}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}
