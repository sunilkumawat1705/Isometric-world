"use client";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import World from "./World";
import Player from "./Player";
import CameraControls from "./CameraControls";
import AdventureWorld from "./minigames/AdventureWorld";
import RealisticLighting from "./RealisticLighting";
import { useGame } from "@/lib/village/store";
import { useAdventure } from "@/lib/village/minigames/store";
function ContextRecovery() {
  const router = useRouter(),
    gl = useThree((s) => s.gl);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      router.push("/portfolio");
    };
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, router]);
  return null;
}
export default function Scene() {
  const panel = useGame((s) => s.panel);
  const activityModal = useAdventure(
    (s) => !!s.activeGame && s.phase !== "playing",
  );
  const suspended = !!panel || activityModal;
  return (
    <Canvas
      frameloop={suspended ? "demand" : "always"}
      orthographic
      camera={{ position: [38, 42, 38], zoom: 18, near: 0.1, far: 250 }}
      dpr={[1, 1.5]}
      shadows="percentage"
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
    >
      <ContextRecovery />
      <CameraControls />
      <Suspense fallback={null}>
        <Physics paused={suspended} timeStep={1 / 60} gravity={[0, -18, 0]}>
          <RealisticLighting />
          <World />
          <AdventureWorld />
          <Player />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
