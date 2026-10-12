import { describe, expect, it } from "vitest";
import { environmentAt, SYNODIC_DAYS } from "../lib/village/environment";
import {
  BRIDGE_X,
  BRIDGE_Z,
  RIVER_HALF_WIDTH,
  riverZ,
  villageStepAllowed,
  WORLD_RADIUS,
} from "../lib/village/terrain";
describe("local-time village sky", () => {
  it("uses civil time for midday, midnight and smooth twilight", () => {
    const at = (hour: number) => environmentAt(new Date(2026, 9, 11, hour));
    expect(at(12).daylight).toBe(1);
    expect(at(0).daylight).toBe(0);
    expect(at(6).daylight).toBeGreaterThan(0);
    expect(at(6).daylight).toBeLessThan(1);
    expect(at(18).daylight).toBeCloseTo(at(6).daylight);
    expect(at(0).period).toBe("Night");
  });
  it("renders a new, quarter, full and waning moon across a lunar month", () => {
    const epoch = Date.UTC(2000, 0, 6, 18, 14);
    const at = (fraction: number) =>
      environmentAt(new Date(epoch + fraction * SYNODIC_DAYS * 86400000));
    expect(at(0).illumination).toBeCloseTo(0);
    expect(at(0.25).illumination).toBeCloseTo(0.5);
    expect(at(0.5).illumination).toBeCloseTo(1);
    expect(at(0.75).moonName).toBe("Last quarter");
    expect(at(1).illumination).toBeCloseTo(0);
    expect(environmentAt(new Date(1990, 0, 1)).phase).toBeGreaterThanOrEqual(0);
  });
});
describe("bridge-only crossings", () => {
  it("allows a complete crossing on the bridge in either direction", () => {
    expect(
      villageStepAllowed(BRIDGE_X, BRIDGE_Z - 5, BRIDGE_X, BRIDGE_Z + 5),
    ).toBe(true);
    expect(
      villageStepAllowed(BRIDGE_X, BRIDGE_Z + 5, BRIDGE_X, BRIDGE_Z - 5),
    ).toBe(true);
  });
  it("blocks water on both banks, long steps and diagonal rail shortcuts", () => {
    for (const x of [-20, -8, 6, 17]) {
      const z = riverZ(x);
      expect(villageStepAllowed(x, z - 4, x, z + 4)).toBe(false);
      expect(villageStepAllowed(x, z + 4, x, z - 4)).toBe(false);
    }
    expect(villageStepAllowed(1, BRIDGE_Z - 5, 5, BRIDGE_Z + 5)).toBe(false);
    expect(
      villageStepAllowed(5, riverZ(5) - RIVER_HALF_WIDTH - 1, 5, riverZ(5)),
    ).toBe(false);
  });
  it("keeps the expanded meadow walkable and prevents leaving the island", () => {
    expect(villageStepAllowed(0, 26, 0, 29)).toBe(true);
    expect(villageStepAllowed(0, 29, 0, WORLD_RADIUS)).toBe(false);
  });
});
