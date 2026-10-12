"use client";
import { useEffect } from "react";
import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { cameraLook, useGame } from "@/lib/village/store";
import { clamp } from "@/lib/village/logic";
import { useAdventure, blocksMovement } from "@/lib/village/minigames/store";

export default function CameraControls() {
  const view = useGame((s) => s.view);
  const started = useGame((s) => s.started);
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const pointers = new Map<number, { x: number; y: number }>();
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const enabled = () => !useGame.getState().panel && !blocksMovement();
    const down = (event: PointerEvent) => {
      if (!enabled() || event.button !== 0 || pointers.size >= 2) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = distance();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!enabled()) return;
      const game = useGame.getState();
      if (pointers.size === 2 && before > 0) {
        const adventure = useAdventure.getState();
        if (adventure.activeGame === "parkour")
          adventure.setTrialZoom((adventure.trialZoom * distance()) / before);
        else game.setZoom((game.zoom * distance()) / before);
      } else if (game.started && game.view === "first-person") {
        cameraLook.yaw =
          (cameraLook.yaw - (event.clientX - previous.x) * 0.005) %
          (Math.PI * 2);
        cameraLook.pitch = clamp(
          cameraLook.pitch - (event.clientY - previous.y) * 0.005,
          -1.1,
          1.1,
        );
      }
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    };
    const reset = () => {
      for (const id of pointers.keys()) {
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      }
      pointers.clear();
    };
    const wheel = (event: WheelEvent) => {
      if (!enabled()) return;
      event.preventDefault();
      const game = useGame.getState();
      const adventure = useAdventure.getState();
      if (adventure.activeGame === "parkour")
        adventure.setTrialZoom(
          adventure.trialZoom * Math.exp(-event.deltaY * 0.002),
        );
      else game.setZoom(game.zoom * Math.exp(-event.deltaY * 0.002));
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", reset);
    return () => {
      reset();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", reset);
    };
  }, [canvas, view, started]);
  return started && view === "first-person" ? (
    <PerspectiveCamera makeDefault fov={55} near={0.08} far={160} />
  ) : (
    <OrthographicCamera
      makeDefault
      position={[38, 42, 38]}
      zoom={18}
      near={0.1}
      far={250}
    />
  );
}
