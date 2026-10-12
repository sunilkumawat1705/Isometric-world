import { beforeEach, describe, expect, it } from "vitest";
import { useAdventure, adventureRuntime } from "../lib/village/minigames/store";
import { useGame } from "../lib/village/store";
import { crystals, nearestActivity } from "../lib/village/minigames/config";
import {
  PARKOUR_ENTRANCE,
  PARKOUR_LODGE,
  PARKOUR_RETURN,
} from "../lib/village/minigames/entrance";
import { locations } from "../lib/village/data";
import { villageStepAllowed } from "../lib/village/terrain";

beforeEach(() => {
  useAdventure.setState({
    activeGame: null,
    phase: "idle",
    collected: [],
    achievements: [],
    completedGames: [],
    personalBests: {},
    garden: [null, null, null],
  });
  useGame.setState({ panel: null });
});
describe("adventure lifecycle and rewards", () => {
  it("keeps the shortest parkour time across rounds", () => {
    const s = useAdventure.getState();
    for (const time of [12, 10, 15]) {
      s.start("parkour");
      s.play();
      s.complete(time);
    }
    expect(useAdventure.getState().personalBests.parkour).toBe(10);
    expect(adventureRuntime.respawn).not.toBeNull();
  });
  it("collects only known crystals once and rewards the complete set", () => {
    const s = useAdventure.getState();
    s.collect("unknown");
    for (const c of crystals) {
      s.collect(c.id);
      s.collect(c.id);
    }
    expect(useAdventure.getState().collected).toHaveLength(8);
    expect(useAdventure.getState().achievements).toEqual(["crystals"]);
  });
});
describe("activity input and scoring", () => {
  it("puts the lodge in its own clearing with a safe return approach", () => {
    for (const location of locations) {
      expect(
        Math.hypot(
          PARKOUR_LODGE[0] - location.position[0],
          PARKOUR_LODGE[2] - location.position[2],
        ),
      ).toBeGreaterThan(6);
    }
    expect(
      villageStepAllowed(
        PARKOUR_RETURN[0],
        PARKOUR_RETURN[2],
        PARKOUR_ENTRANCE[0],
        PARKOUR_ENTRANCE[2],
      ),
    ).toBe(true);
    expect(PARKOUR_RETURN[2]).toBeGreaterThan(PARKOUR_ENTRANCE[2] + 1);
  });
  it("selects an activity only within its interaction radius", () => {
    expect(nearestActivity(-3, -11.8)?.id).toBe("parkour");
    expect(nearestActivity(-7, 8.8)).toBeNull();
    expect(nearestActivity(0, 5)).toBeNull();
  });
});
