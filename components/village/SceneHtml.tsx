"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Group, Matrix4, Vector3, type OrthographicCamera } from "three";

// CSS projection math adapted from @react-three/drei Html (MIT).
// See SceneHtml.LICENSE. Only the overlay features used by this scene are exposed.
type Props = Omit<ThreeElements["group"], "children" | "ref"> & {
  children: ReactNode;
  center?: boolean;
  transform?: boolean;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  style?: CSSProperties;
};

function cssMatrix(matrix: Matrix4, multipliers: number[], prefix = "") {
  return `${prefix}matrix3d(${matrix.elements
    .map((value, index) => {
      const scaled = value * multipliers[index];
      return Math.abs(scaled) < 1e-10 ? 0 : scaled;
    })
    .join(",")})`;
}
const cameraMultipliers = [1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1];

export function Html({
  children,
  center,
  transform = false,
  distanceFactor,
  zIndexRange = [16777271, 0],
  style,
  ...props
}: Props) {
  const { camera, size, gl, events, scene } = useThree();
  const group = useRef<Group>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);
  const generation = useRef(0);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const world = useRef(new Vector3());
  const offset = useRef(new Vector3());
  const cameraPosition = useRef(new Vector3());
  const direction = useRef(new Vector3());
  const target = events.connected || gl.domElement.parentElement;

  useLayoutEffect(() => {
    const lifecycle = generation;
    const lease = ++lifecycle.current;
    // Strict Mode replays effects synchronously. Reuse its root until a real
    // unmount; creating another root on the same element would race as well.
    const el = element.current ?? document.createElement("div");
    element.current = el;
    const currentRoot = root.current ?? createRoot(el);
    root.current = currentRoot;
    el.style.cssText = "position:absolute;top:0;left:0;transform-origin:0 0;";
    if (transform) {
      el.style.pointerEvents = "none";
      el.style.overflow = "hidden";
    }
    target?.appendChild(el);
    scene.updateMatrixWorld();
    return () => {
      el.remove();
      // React cannot synchronously tear down a DOM root during the R3F commit.
      // A microtask runs after that commit, and an effect replay cancels disposal.
      queueMicrotask(() => {
        if (lifecycle.current !== lease) return;
        currentRoot.unmount();
        root.current = null;
        element.current = null;
      });
    };
  }, [target, transform, scene]);

  useLayoutEffect(() => {
    root.current?.render(
      transform ? (
        <div
          ref={outer}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            transformStyle: "preserve-3d",
            pointerEvents: "none",
          }}
        >
          <div
            ref={inner}
            style={{ position: "absolute", pointerEvents: "auto" }}
          >
            <div style={style}>{children}</div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            transform: center ? "translate3d(-50%,-50%,0)" : undefined,
            ...style,
          }}
        >
          {children}
        </div>
      ),
    );
  }, [children, center, transform, style, size]);

  useFrame(() => {
    if (!group.current || !element.current) return;
    const el = element.current;
    camera.updateMatrixWorld();
    group.current.updateWorldMatrix(true, false);
    const position = world.current.setFromMatrixPosition(
      group.current.matrixWorld,
    );
    const cameraPos = cameraPosition.current.setFromMatrixPosition(
      camera.matrixWorld,
    );
    const distance = position.distanceTo(cameraPos);
    const behind =
      offset.current
        .copy(position)
        .sub(cameraPos)
        .dot(camera.getWorldDirection(direction.current)) < 0;
    el.style.display = behind ? "none" : "block";
    const [farIndex, nearIndex] = zIndexRange;
    el.style.zIndex = String(
      Math.round(
        nearIndex +
          ((farIndex - nearIndex) * (camera.far - distance)) /
            (camera.far - camera.near),
      ),
    );
    if (transform) {
      const ortho = camera as OrthographicCamera;
      const halfWidth = size.width / 2,
        halfHeight = size.height / 2;
      const fov = camera.projectionMatrix.elements[5] * halfHeight;
      const cameraTransform = ortho.isOrthographicCamera
        ? `scale(${fov})translate(${-(ortho.right + ortho.left) / 2}px,${(ortho.top + ortho.bottom) / 2}px)`
        : `translateZ(${fov}px)`;
      el.style.width = `${size.width}px`;
      el.style.height = `${size.height}px`;
      el.style.perspective = ortho.isOrthographicCamera ? "" : `${fov}px`;
      if (outer.current && inner.current) {
        outer.current.style.transform = `${cameraTransform}${cssMatrix(camera.matrixWorldInverse, cameraMultipliers)}translate(${halfWidth}px,${halfHeight}px)`;
        const factor = (distanceFactor ?? 10) / 400;
        inner.current.style.transform = cssMatrix(
          group.current.matrixWorld,
          [
            factor,
            factor,
            factor,
            1,
            -factor,
            -factor,
            -factor,
            -1,
            factor,
            factor,
            factor,
            1,
            1,
            1,
            1,
            1,
          ],
          "translate(-50%,-50%)",
        );
      }
    } else {
      position.project(camera);
      el.style.transform = `translate3d(${((position.x + 1) * size.width) / 2}px,${((1 - position.y) * size.height) / 2}px,0)`;
    }
  });
  return <group {...props} ref={group} />;
}
