"use client";
/* Three.js lights, uniforms and scene are mutable renderer objects. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { environmentAt, environmentRuntime } from "@/lib/village/environment";
import { adventureRuntime } from "@/lib/village/minigames/store";
import { ARENA_MIN_X } from "@/lib/village/minigames/course";
import { seeded } from "@/lib/village/logic";
export default function LivingSky() {
  const sun = useRef<THREE.DirectionalLight>(null),
    moonlight = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null),
    hemi = useRef<THREE.HemisphereLight>(null);
  const moon = useRef<THREE.Mesh>(null),
    stars = useRef<THREE.Points>(null);
  const lastUpdate = useRef(-Infinity);
  const colors = useMemo(
    () => ({
      night: new THREE.Color("#122236"),
      day: new THREE.Color("#2f5b3a"),
      dusk: new THREE.Color("#5d4636"),
      sky: new THREE.Color(),
    }),
    [],
  );
  const uniforms = useMemo(
    () => ({ lightDirection: { value: new THREE.Vector3(0, 0, 1) } }),
    [],
  );
  const starPositions = useMemo(() => {
    const random = seeded(302),
      positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      positions[i * 3] = (random() - 0.5) * 140;
      positions[i * 3 + 1] = 25 + random() * 55;
      positions[i * 3 + 2] = -25 - random() * 65;
    }
    return positions;
  }, []);
  useFrame(({ clock, scene, camera }) => {
    if (moon.current) {
      moon.current.quaternion.copy(camera.quaternion);
      moon.current.position.set(0.6, 0.58, 0.5).unproject(camera);
    }
    if (clock.elapsedTime - lastUpdate.current < 1) return;
    lastUpdate.current = clock.elapsedTime;
    const sky = environmentAt(new Date()),
      d = sky.daylight;
    environmentRuntime.daylight = d;
    const cx =
      adventureRuntime.player.x > ARENA_MIN_X
        ? Math.round(adventureRuntime.player.x)
        : 0;
    const cz = cx ? Math.round(adventureRuntime.player.z) : 0;
    colors.sky
      .copy(colors.night)
      .lerp(colors.dusk, Math.sin(d * Math.PI) * 0.7)
      .lerp(colors.day, d);
    scene.background = null;
    const host = document
      .getElementById("world-input")
      ?.closest<HTMLElement>(".village-experience");
    host?.style.setProperty("--village-sky", `#${colors.sky.getHexString()}`);
    host?.style.setProperty("--daylight", d.toFixed(2));
    scene.environmentIntensity = 0.2 * (0.2 + d * 0.8);
    if (ambient.current) ambient.current.intensity = 0.18 + d * 0.2;
    if (hemi.current) hemi.current.intensity = 0.3 + d * 1.05;
    if (sun.current) {
      sun.current.intensity = d * 2.7;
      sun.current.color.set(d < 0.9 ? "#ffb36b" : "#ffd9a0");
      // Afternoon light rakes in from the left of the isometric view.
      sun.current.position.set(
        cx + Math.cos(sky.sunAngle) * 28,
        Math.max(4, sky.altitude * 35),
        cz + 14,
      );
      sun.current.target.position.set(cx, 0, cz);
      sun.current.target.updateMatrixWorld();
    }
    if (moonlight.current)
      moonlight.current.intensity = (1 - d) * (0.15 + sky.illumination * 0.4);
    if (moon.current) {
      moon.current.visible = d < 0.95;
      uniforms.lightDirection.value.set(
        Math.sin(sky.phase * Math.PI * 2),
        0,
        -Math.cos(sky.phase * Math.PI * 2),
      );
    }
    if (stars.current) {
      stars.current.position.set(cx, 0, cz);
      (stars.current.material as THREE.PointsMaterial).opacity =
        (1 - d) * (0.9 - sky.illumination * 0.3);
    }
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.38} color="#fff3df" />
      <hemisphereLight ref={hemi} args={["#fff1d8", "#86913f", 1.35]} />
      <directionalLight
        ref={sun}
        position={[-15, 30, 10]}
        intensity={2.7}
        color="#ffe1b0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-normalBias={0.025}
        shadow-bias={-0.0002}
        shadow-radius={4}
      />
      <directionalLight
        ref={moonlight}
        position={[20, 30, -20]}
        intensity={0}
        color="#a5caff"
      />
      <mesh ref={moon} position={[-24, 30, -28]} rotation={[0, Math.PI / 4, 0]}>
        <sphereGeometry args={[2.2, 32, 24]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader="varying vec3 n; void main(){ n = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
          fragmentShader="varying vec3 n; uniform vec3 lightDirection; void main(){ float lit = smoothstep(-0.025,0.025,dot(normalize(n),lightDirection)); float grain = sin(n.x*47.0)*sin(n.y*39.0)*0.04; gl_FragColor = vec4(mix(vec3(0.08,0.12,0.19),vec3(0.93,0.92,0.79)+grain,lit),1.0); }"
        />
      </mesh>
      <points ref={stars}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#e4efff"
          size={0.16}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
    </>
  );
}
