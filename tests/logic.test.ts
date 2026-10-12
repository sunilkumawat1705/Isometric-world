import { describe, expect, it } from "vitest";
import {
  cameraMovement,
  canJump,
  nearestLocation,
  seeded,
} from "../lib/village/logic";
import { locations, projects } from "../lib/village/data";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  useGame,
} from "../lib/village/store";
describe("camera-relative movement", () => {
  it("follows the first-person heading while keeping analog movement normalized", () => {
    expect(cameraMovement(0, 1, 0)).toEqual({ x: 0, z: -1 });
    expect(cameraMovement(0, 1, Math.PI / 2).x).toBeCloseTo(-1);
    expect(cameraMovement(1, 0, Math.PI / 2).z).toBeCloseTo(-1);
    expect(Math.hypot(...Object.values(cameraMovement(1, 1, 1.8)))).toBeCloseTo(
      1,
    );
  });
  it("normalizes diagonals and preserves analog speed", () => {
    expect(Math.hypot(...Object.values(cameraMovement(1, 1)))).toBeCloseTo(1);
    expect(Math.hypot(...Object.values(cameraMovement(0.25, 0)))).toBeCloseTo(
      0.25,
    );
  });
  it("maps screen up to the camera forward diagonal", () => {
    const direction = cameraMovement(0, 1);
    expect(direction.x).toBeLessThan(0);
    expect(direction.z).toBeLessThan(0);
    expect(cameraMovement(0, 0)).toEqual({ x: 0, z: 0 });
  });
});
describe("camera zoom", () => {
  it("starts at the village-wide zoom and clamps gesture and button updates", () => {
    expect(useGame.getState().zoom).toBe(DEFAULT_ZOOM);
    useGame.getState().setZoom(20);
    expect(useGame.getState().zoom).toBe(MAX_ZOOM);
    useGame.getState().setZoom(0.1);
    expect(useGame.getState().zoom).toBe(MIN_ZOOM);
    useGame.getState().setZoom(1.8);
    expect(useGame.getState().zoom).toBe(1.8);
    useGame.getState().setZoom(DEFAULT_ZOOM);
  });
});
describe("jump buffering", () => {
  it("requires both available ground and recent input", () => {
    expect(canJump(true, 0, 0.1)).toBe(true);
    expect(canJump(false, 0.08, 0.1)).toBe(true);
    expect(canJump(false, 0.2, 0)).toBe(false);
    expect(canJump(true, 0, 0.2)).toBe(false);
  });
});
describe("proximity selection", () => {
  it("finds every entrance and excludes distant objects", () => {
    for (const l of locations)
      expect(nearestLocation(l.position[0], l.position[2] + 3)?.id).toBe(l.id);
    expect(nearestLocation(100, 100)).toBeNull();
  });
  it("chooses the nearest overlapping target", () => {
    const a = {
        ...locations[0],
        position: [0, 0, 0] as [number, number, number],
      },
      b = { ...locations[1], position: [2, 0, 0] as [number, number, number] };
    expect(nearestLocation(1.8, 3, [a, b])?.id).toBe(b.id);
  });
});
describe("portfolio and navigation", () => {
  it("has unique identifiers and meaningful project content", () => {
    expect(new Set(locations.map((l) => l.id)).size).toBe(5);
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
    for (const p of projects) {
      expect(p.description.length).toBeGreaterThan(20);
      expect(p.tags.length).toBeGreaterThan(0);
    }
    expect(projects.filter((p) => p.category === "Applications")).toHaveLength(
      1,
    );
  });
  it("tracks visits once and preserves position when closing", () => {
    useGame.setState({ visited: [], position: [3, 4] });
    useGame.getState().open("projects");
    useGame.getState().close();
    useGame.getState().open("projects");
    expect(useGame.getState().visited).toEqual(["projects"]);
    expect(useGame.getState().position).toEqual([3, 4]);
    useGame.getState().open("map");
    expect(useGame.getState().visited).toHaveLength(1);
  });
  it("places decorations reproducibly", () => {
    const a = seeded(42),
      b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
