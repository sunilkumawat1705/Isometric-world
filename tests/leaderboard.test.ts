import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  playerName,
  readRecords,
  useLeaderboard,
  RECORDS_KEY,
  type CompletedRun,
} from "../lib/village/minigames/leaderboard";
import { useAdventure } from "../lib/village/minigames/store";
const run: CompletedRun = {
  id: "run-1",
  game: "parkour",
  seconds: 45.12,
  gems: 6,
  hearts: 3,
  stars: 2,
  completedAt: "2026-10-12T00:00:00.000Z",
};
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  useLeaderboard.setState({ records: [], loaded: false, error: null });
  useAdventure.setState({
    activeGame: null,
    phase: "idle",
    completedRun: null,
    personalBests: {},
    completedGames: [],
    achievements: [],
  });
});
describe("browser leaderboard", () => {
  it("normalizes names and rejects empty names", () => {
    expect(playerName("  Village\n  Runner  ")).toBe("Village Runner");
    expect(playerName("a".repeat(30))).toHaveLength(24);
    expect(useLeaderboard.getState().save(run, "   ")).toBe(false);
    expect(data.has(RECORDS_KEY)).toBe(false);
  });
  it("saves once, reloads records, and ranks by time then gems", () => {
    const board = useLeaderboard.getState();
    expect(board.save(run, "Visitor")).toBe(true);
    expect(board.save(run, "Duplicate")).toBe(true);
    board.save({ ...run, id: "run-2", seconds: 30 }, "Fast");
    board.save({ ...run, id: "run-3", seconds: 30, gems: 10 }, "Collector");
    useLeaderboard.setState({ records: [], loaded: false });
    board.load();
    expect(useLeaderboard.getState().records.map((r) => r.name)).toEqual([
      "Collector",
      "Fast",
      "Visitor",
    ]);
  });
  it("filters invalid storage entries and bounds the board", () => {
    expect(
      readRecords([
        null,
        {},
        { ...run, name: "x", seconds: -1 },
        { ...run, name: "x", stars: 0 },
      ]),
    ).toEqual([]);
    expect(
      readRecords(
        Array.from({ length: 80 }, (_, i) => ({
          ...run,
          id: String(i),
          seconds: i + 1,
          name: "Runner",
        })),
      ),
    ).toHaveLength(50);
  });
  it("reports storage failures without marking a record saved", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(useLeaderboard.getState().save(run, "Visitor")).toBe(false);
    expect(useLeaderboard.getState().records).toHaveLength(0);
    expect(useLeaderboard.getState().error).toMatch(/could not be saved/);
  });
  it("merges another tab's records without duplicates", () => {
    data.set(RECORDS_KEY, JSON.stringify([{ ...run, name: "Other tab" }]));
    useLeaderboard
      .getState()
      .save({ ...run, id: "run-2", seconds: 20 }, "Here");
    expect(useLeaderboard.getState().records).toHaveLength(2);
  });
  it("refuses a run outside the fastest fifty instead of claiming it was saved", () => {
    data.set(
      RECORDS_KEY,
      JSON.stringify(
        Array.from({ length: 50 }, (_, i) => ({
          ...run,
          id: String(i),
          seconds: i + 1,
          name: "Runner",
        })),
      ),
    );
    expect(
      useLeaderboard.getState().save({ ...run, seconds: 100 }, "Slow"),
    ).toBe(false);
    expect(useLeaderboard.getState().error).toMatch(/fastest 50/);
  });
  it("creates a completion snapshot only for a successful run", () => {
    const game = useAdventure.getState();
    game.start("parkour");
    game.play();
    game.fail();
    expect(useAdventure.getState().completedRun).toBeNull();
    game.play();
    game.complete(32.1);
    expect(useAdventure.getState().completedRun).toMatchObject({
      seconds: 32.1,
      game: "parkour",
      stars: 1,
    });
    const completed = useAdventure.getState().completedRun;
    game.complete(20);
    expect(useAdventure.getState().completedRun).toBe(completed);
    game.play();
    expect(useAdventure.getState().completedRun).toBeNull();
  });
  it("rejects non-finite or non-positive completion times", () => {
    const game = useAdventure.getState();
    game.start("parkour");
    game.play();
    for (const time of [NaN, Infinity, -1, 0]) game.complete(time);
    expect(useAdventure.getState().phase).toBe("playing");
  });
});
