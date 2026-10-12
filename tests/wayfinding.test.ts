import { describe, expect, it } from "vitest";
import { nearbyWaypoint, villageWaypoints } from "../lib/village/wayfinding";

describe("village proximity labels", () => {
  it("only shows a label inside the six-unit proximity radius", () => {
    expect(nearbyWaypoint(100, 100)).toBeNull();
    expect(nearbyWaypoint(-19, 24)).toBeNull();
    expect(nearbyWaypoint(-18.99, 24)?.title).toBe("Meadow Mill");
  });
  it("keeps the entrance directions at the original sign location", () => {
    expect(nearbyWaypoint(1, 24)?.title).toBe("Forest Village");
    expect(nearbyWaypoint(3.9, 24)?.detail).toContain("Bridge ahead");
  });
  it("chooses one nearest label and preserves landmark actions", () => {
    for (const waypoint of villageWaypoints) {
      expect(nearbyWaypoint(waypoint.x, waypoint.z)).toEqual(waypoint);
    }
    expect(nearbyWaypoint(-3.8, 7.5)?.action).toBe("leaderboard");
  });
});
