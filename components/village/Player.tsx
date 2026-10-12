"use client";
import { useEffect, useRef, useState } from "react";
import { Html } from "@/components/village/SceneHtml";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { Box, Rock } from "./Primitives";
import { VILLAGE_SPAWN, villageStepAllowed } from "@/lib/village/terrain";
import { movement, type MovementState } from "@/lib/village/data";
import { canJump, cameraMovement, nearestLocation } from "@/lib/village/logic";
import {
  adventureRuntime,
  blocksMovement,
  requestRespawn,
  useAdventure,
} from "@/lib/village/minigames/store";
import { trialFraming } from "@/lib/village/minigames/camera";
import { playCue } from "@/lib/village/minigames/audio";
import {
  ARENA_MIN_X,
  BOOST_SECONDS,
  KILL_Y,
  checkpoints,
  nearestCheckpointIndex,
} from "@/lib/village/minigames/course";
import {
  cameraLook,
  input,
  MAX_ZOOM,
  MIN_ZOOM,
  releaseInput,
  useGame,
} from "@/lib/village/store";

function ArrivalPin() {
  const started = useGame((s) => s.started),
    view = useGame((s) => s.view);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!started) return;
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [started]);
  if (!visible || (started && view === "first-person")) return null;
  return (
    <Html
      position={[0, 2.5, 0]}
      center
      zIndexRange={[7, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="arrival-pin"
        role="status"
        aria-label="You are here"
        title="You are here"
      >
        <span className="arrival-dot" />
      </div>
    </Html>
  );
}

function CharacterModel({
  visual,
  limbs,
}: {
  visual: React.RefObject<THREE.Group | null>;
  limbs: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={visual} position={[0, -0.73, 0]} rotation={[0, Math.PI, 0]}>
      <group ref={limbs}>
        <group position={[-0.17, 0.3, 0]}>
          <Box color="#344653" scale={[0.23, 0.5, 0.27]} />
          <Box
            color="#3d392f"
            position={[0, -0.18, 0.08]}
            scale={[0.25, 0.18, 0.38]}
          />
        </group>
        <group position={[0.17, 0.3, 0]}>
          <Box color="#344653" scale={[0.23, 0.5, 0.27]} />
          <Box
            color="#3d392f"
            position={[0, -0.18, 0.08]}
            scale={[0.25, 0.18, 0.38]}
          />
        </group>
        <group position={[-0.39, 0.9, 0]}>
          <Box color="#59839a" scale={[0.2, 0.55, 0.25]} />
          <Rock
            color="#efc69d"
            position={[0, -0.25, 0]}
            scale={[0.12, 0.13, 0.12]}
          />
        </group>
        <group position={[0.39, 0.9, 0]}>
          <Box color="#59839a" scale={[0.2, 0.55, 0.25]} />
          <Rock
            color="#efc69d"
            position={[0, -0.25, 0]}
            scale={[0.12, 0.13, 0.12]}
          />
        </group>
      </group>
      <Box color="#59839a" position={[0, 0.86, 0]} scale={[0.6, 0.66, 0.38]} />
      <Box
        color="#253744"
        position={[0, 0.65, 0.02]}
        scale={[0.62, 0.13, 0.41]}
      />
      <Box
        color="#697e52"
        position={[0, 0.92, -0.32]}
        scale={[0.49, 0.55, 0.25]}
      />
      <Rock
        color="#efc69d"
        position={[0, 1.43, 0.025]}
        scale={[0.32, 0.35, 0.3]}
      />
      <Rock
        color="#67462e"
        position={[0, 1.65, -0.035]}
        scale={[0.34, 0.17, 0.31]}
      />
      <Box
        color="#67462e"
        position={[0, 1.62, 0.26]}
        scale={[0.42, 0.14, 0.1]}
      />
      {[-1, 1].map((i) => (
        <Rock
          key={i}
          color="#353b30"
          position={[i * 0.13, 1.45, 0.29]}
          scale={[0.035, 0.043, 0.025]}
        />
      ))}
    </group>
  );
}
export default function Player() {
  const body = useRef<RapierRigidBody>(null),
    visual = useRef<THREE.Group>(null),
    limbs = useRef<THREE.Group>(null);
  const { world, rapier } = useRapier();
  const controller = useRef<ReturnType<
    typeof world.createCharacterController
  > | null>(null);
  const physicsTime = useRef(0),
    jumpUntil = useRef(-Infinity),
    lastJumpInput = useRef(-Infinity);
  const velocity = useRef({ x: 0, y: 0, z: 0 }),
    state = useRef<MovementState>("idle"),
    lastGround = useRef(-Infinity),
    controlLockUntil = useRef(-Infinity),
    boostUntil = useRef(-Infinity),
    boostVelocity = useRef({ x: 0, z: 0 }),
    lastPublish = useRef(0),
    landedAt = useRef(-Infinity),
    wasGrounded = useRef(false);
  const cameraTarget = useRef(new THREE.Vector3()),
    cameraDesired = useRef(new THREE.Vector3());
  const previousCamera = useRef<THREE.Camera | null>(null);
  useEffect(() => {
    const c = world.createCharacterController(0.025);
    c.enableAutostep(0.4, 0.2, true);
    c.enableSnapToGround(0.2);
    c.setApplyImpulsesToDynamicBodies(true);
    c.setCharacterMass(65);
    c.setMaxSlopeClimbAngle(Math.PI / 4);
    c.setMinSlopeSlideAngle(Math.PI / 3);
    controller.current = c;
    useGame.setState({ ready: true });
    return () => {
      world.removeCharacterController(c);
      controller.current = null;
      releaseInput();
    };
  }, [world]);
  useBeforePhysicsStep(() => {
    const rb = body.current,
      c = controller.current;
    if (!rb || !c) return;
    const game = useGame.getState(),
      dt = 1 / 60,
      now = performance.now() / 1000;
    physicsTime.current += dt;
    const simulationNow = physicsTime.current;
    const adventure = useAdventure.getState();
    if (adventureRuntime.respawn) {
      const [x, y, z] = adventureRuntime.respawn,
        from = rb.translation();
      // Entering or leaving the jungle arena should cut, not pan, the camera.
      if (Math.abs(from.x - x) > 20) adventureRuntime.cameraSnap = true;
      rb.setTranslation({ x, y, z }, true);
      rb.setNextKinematicTranslation({ x, y, z });
      adventureRuntime.respawn = null;
      adventureRuntime.launch =
        adventureRuntime.knock =
        adventureRuntime.boost =
          null;
      velocity.current = { x: 0, y: 0, z: 0 };
      jumpUntil.current = -Infinity;
      lastGround.current = -Infinity;
      controlLockUntil.current = boostUntil.current = -Infinity;
      Object.assign(adventureRuntime.player, { x, y, z, vy: 0 });
      return;
    }
    const parkour =
      adventure.activeGame === "parkour" &&
      adventure.phase === "playing" &&
      adventure.checkpoint >= 0;
    if (parkour) {
      const p = rb.translation();
      // Falling into the lagoon costs a heart and returns to the last flag.
      if (p.y < KILL_Y) {
        adventureRuntime.splash = {
          x: p.x,
          z: p.z,
          at: adventureRuntime.courseTime,
        };
        adventure.hurt();
        playCue("splash");
        requestRespawn();
        return;
      }
    }
    const active = game.started && !game.panel && !blocksMovement();
    if (
      active &&
      input.jumpAt !== -Infinity &&
      input.jumpAt !== lastJumpInput.current
    ) {
      lastJumpInput.current = input.jumpAt;
      jumpUntil.current = simulationNow + movement.jumpBufferTime;
    }
    if (!active) jumpUntil.current = -Infinity;
    const x = active
      ? Number(input.keys.has("d") || input.keys.has("arrowright")) -
        Number(input.keys.has("a") || input.keys.has("arrowleft")) +
        input.x
      : 0;
    const y = active
      ? Number(input.keys.has("w") || input.keys.has("arrowup")) -
        Number(input.keys.has("s") || input.keys.has("arrowdown")) +
        input.y
      : 0;
    const direction = cameraMovement(
        x,
        y,
        game.view === "first-person" ? cameraLook.yaw : Math.PI / 4,
      ),
      running = input.keys.has("shift"),
      speed = running ? movement.runSpeed : movement.walkSpeed;
    const blend =
        1 -
        Math.exp(
          -(x || y ? movement.acceleration : movement.deceleration) * dt,
        ),
      v = velocity.current;
    // Knock-back briefly overrides steering; boost pads hold a fixed velocity.
    if (simulationNow >= controlLockUntil.current) {
      v.x += (direction.x * speed - v.x) * blend;
      v.z += (direction.z * speed - v.z) * blend;
    } else {
      v.x *= 0.985;
      v.z *= 0.985;
    }
    const knock = adventureRuntime.knock;
    if (knock) {
      v.x = knock.x;
      v.z = knock.z;
      v.y = 5.2;
      controlLockUntil.current = simulationNow + 0.3;
      boostUntil.current = -Infinity;
      lastGround.current = -Infinity;
      adventureRuntime.knock = null;
    }
    const boost = adventureRuntime.boost;
    if (boost) {
      boostVelocity.current = boost;
      boostUntil.current = simulationNow + BOOST_SECONDS;
      adventureRuntime.boost = null;
    }
    if (simulationNow < boostUntil.current) {
      v.x = boostVelocity.current.x;
      v.z = boostVelocity.current.z;
    }
    const grounded = c.computedGrounded();
    if (parkour && grounded) {
      const p = rb.translation(),
        index = adventure.checkpoint + 1,
        reached = nearestCheckpointIndex(p.x, p.y, p.z);
      if (reached === index) {
        useAdventure.setState({ checkpoint: index });
        playCue("rune");
        if (index === checkpoints.length - 1) {
          playCue("win");
          adventure.complete(adventureRuntime.trailTime);
        } else adventure.notify(`Checkpoint ${index + 1} reached`);
      }
    }
    if (grounded) {
      lastGround.current = simulationNow;
      if (v.y < 0) v.y = 0;
    }
    if (
      active &&
      canJump(
        grounded,
        simulationNow - lastGround.current,
        movement.jumpBufferTime - (jumpUntil.current - simulationNow),
      )
    ) {
      v.y = movement.jumpVelocity;
      input.jumpAt = -Infinity;
      jumpUntil.current = -Infinity;
      lastGround.current = -Infinity;
    }
    const launch = adventureRuntime.launch;
    if (launch) {
      v.y = launch.vy;
      lastGround.current = -Infinity;
      jumpUntil.current = -Infinity;
      adventureRuntime.launch = null;
    }
    v.y -= 18 * movement.gravityScale * dt;
    c.computeColliderMovement(
      rb.collider(0),
      {
        x: v.x * dt,
        y: v.y * dt,
        z: v.z * dt,
      },
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const move = c.computedMovement(),
      p = rb.translation();
    if (
      p.x < ARENA_MIN_X &&
      !villageStepAllowed(p.x, p.z, p.x + move.x, p.z + move.z)
    ) {
      // Slide along the bank instead of sticking when moving diagonally.
      if (villageStepAllowed(p.x, p.z, p.x + move.x, p.z)) move.z = 0;
      else if (villageStepAllowed(p.x, p.z, p.x, p.z + move.z)) move.x = 0;
      else move.x = move.z = 0;
    }
    rb.setNextKinematicTranslation({
      x: p.x + move.x,
      y: p.y + move.y,
      z: p.z + move.z,
    });
    Object.assign(adventureRuntime.player, {
      x: p.x + move.x,
      y: p.y + move.y,
      z: p.z + move.z,
      vy: v.y,
      grounded: c.computedGrounded(),
    });
    if (c.computedGrounded() && !wasGrounded.current) landedAt.current = now;
    wasGrounded.current = c.computedGrounded();
    state.current = game.panel
      ? "interact"
      : !c.computedGrounded()
        ? v.y > 0
          ? "jump"
          : "fall"
        : now - landedAt.current < 0.16
          ? "land"
          : Math.hypot(v.x, v.z) > 0.2
            ? running
              ? "run"
              : "walk"
            : "idle";
    if (now - lastPublish.current > 0.1) {
      lastPublish.current = now;
      const near = nearestLocation(p.x, p.z)?.id || null;
      useGame.setState({
        position: [Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100],
        elevation: Math.round(p.y * 100) / 100,
        motion: state.current,
        ...(game.near !== near ? { near } : {}),
      });
    }
  });
  useFrame(({ clock, camera, size }, delta) => {
    const game = useGame.getState(),
      p = body.current?.translation();
    if (!p) return;
    const v = velocity.current,
      walking = state.current === "walk" || state.current === "run",
      stride = walking
        ? Math.sin(clock.elapsedTime * (state.current === "run" ? 16 : 10)) *
          0.6
        : 0;
    if (visual.current) {
      if (Math.hypot(v.x, v.z) > 0.1) {
        const angle = Math.atan2(v.x, v.z),
          diff = Math.atan2(
            Math.sin(angle - visual.current.rotation.y),
            Math.cos(angle - visual.current.rotation.y),
          );
        visual.current.rotation.y +=
          diff * (1 - Math.exp(-movement.rotationSpeed * delta));
      }
      visual.current.position.y =
        -0.73 + (game.reduced ? 0 : Math.sin(clock.elapsedTime * 3) * 0.018);
      visual.current.scale.y = state.current === "land" ? 0.92 : 1;
      const hurtBlink =
        useAdventure.getState().activeGame === "parkour" &&
        useAdventure.getState().phase === "playing" &&
        adventureRuntime.invulUntil > adventureRuntime.courseTime &&
        Math.floor(clock.elapsedTime * 14) % 2 === 0;
      visual.current.visible =
        !hurtBlink && !(game.started && game.view === "first-person");
    }
    if (limbs.current)
      limbs.current.children.forEach((limb, i) => {
        limb.rotation.x = game.reduced ? 0 : stride * (i % 2 ? -1 : 1);
      });
    const inArena = p.x > ARENA_MIN_X;
    if (
      game.started &&
      game.view === "first-person" &&
      camera instanceof THREE.PerspectiveCamera
    ) {
      // Match the eye to physics immediately; smoothing here adds input latency.
      camera.position.set(p.x, p.y + 0.78, p.z);
      camera.rotation.set(cameraLook.pitch, cameraLook.yaw, 0, "YXZ");
      const fov = 85 - ((game.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 30;
      if (Math.abs(fov - camera.fov) > 0.01) {
        camera.fov +=
          (fov - camera.fov) * (1 - Math.exp(-8 * Math.min(delta, 0.1)));
        camera.updateProjectionMatrix();
      }
      return;
    }
    const framing = trialFraming(
      p,
      useAdventure.getState().checkpoint,
      size.width,
      size.height,
      useAdventure.getState().trialZoom,
    );
    cameraDesired.current.set(
      game.started ? (inArena ? framing.x : p.x) : 0,
      game.started ? p.y : 2,
      game.started ? (inArena ? framing.z : p.z) : 0,
    );
    const trialZoom = framing.zoom;
    if (adventureRuntime.cameraSnap || previousCamera.current !== camera) {
      adventureRuntime.cameraSnap = false;
      cameraTarget.current.copy(cameraDesired.current);
      previousCamera.current = camera;
      if (camera instanceof THREE.OrthographicCamera)
        camera.zoom = inArena
          ? trialZoom
          : Math.min(size.width / 58, size.height / 43) *
            (game.started ? 1.32 : 0.3) *
            (inArena ? 1.12 : 1) *
            game.zoom;
    }
    cameraTarget.current.lerp(
      cameraDesired.current,
      1 - Math.exp(-(inArena ? 4 : 2.2) * delta),
    );
    camera.position.set(
      cameraTarget.current.x + 38,
      cameraTarget.current.y + 42,
      cameraTarget.current.z + 38,
    );
    camera.lookAt(cameraTarget.current);
    const ortho = camera as THREE.OrthographicCamera;
    const targetZoom = inArena
      ? trialZoom
      : Math.min(size.width / 58, size.height / 43) *
        (game.started ? 1.32 : 0.3) *
        (inArena ? 1.12 : 1) *
        game.zoom;
    if (Math.abs(targetZoom - ortho.zoom) > 0.01) {
      ortho.zoom +=
        (targetZoom - ortho.zoom) * (1 - Math.exp(-3 * Math.min(delta, 0.1)));
      ortho.updateProjectionMatrix();
    }
  });
  return (
    <RigidBody
      ref={body}
      name="village-player"
      type="kinematicPosition"
      colliders={false}
      position={VILLAGE_SPAWN}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.4, 0.32]} />
      <CharacterModel visual={visual} limbs={limbs} />
      <ArrivalPin />
    </RigidBody>
  );
}
