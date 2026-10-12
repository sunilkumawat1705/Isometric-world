import { create } from "zustand";
import type { GameId } from "./config";

export const RECORDS_KEY = "forest-village-records-v1";
export const MAX_RECORDS = 50;
export type CompletedRun = {
  id: string;
  game: GameId;
  seconds: number;
  gems: number;
  stars: number;
  hearts: number;
  completedAt: string;
};
export type GameRecord = CompletedRun & { name: string };
export function playerName(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}
export function rankRecords(records: GameRecord[]) {
  return [...records]
    .sort(
      (a, b) =>
        a.seconds - b.seconds ||
        b.gems - a.gems ||
        a.completedAt.localeCompare(b.completedAt),
    )
    .slice(0, MAX_RECORDS);
}
export function validRun(value: unknown): value is CompletedRun {
  if (!value || typeof value !== "object") return false;
  const r = value as CompletedRun;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    r.id.length <= 100 &&
    r.game === "parkour" &&
    Number.isFinite(r.seconds) &&
    r.seconds > 0 &&
    Number.isInteger(r.gems) &&
    r.gems >= 0 &&
    Number.isInteger(r.hearts) &&
    r.hearts > 0 &&
    Number.isInteger(r.stars) &&
    r.stars >= 1 &&
    r.stars <= 3 &&
    typeof r.completedAt === "string" &&
    Number.isFinite(Date.parse(r.completedAt))
  );
}
export function readRecords(value: unknown): GameRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return rankRecords(
    value
      .filter((r): r is GameRecord => {
        if (
          !validRun(r) ||
          typeof (r as GameRecord).name !== "string" ||
          !playerName((r as GameRecord).name) ||
          seen.has(r.id)
        )
          return false;
        seen.add(r.id);
        return true;
      })
      .map((r) => ({ ...r, name: playerName(r.name) })),
  );
}
interface LeaderboardState {
  records: GameRecord[];
  loaded: boolean;
  error: string | null;
  load: () => void;
  save: (run: CompletedRun, name: string) => boolean;
}
export const useLeaderboard = create<LeaderboardState>((set, get) => ({
  records: [],
  loaded: false,
  error: null,
  load: () => {
    if (get().loaded) return;
    try {
      const raw = localStorage.getItem(RECORDS_KEY);
      set({
        records: raw ? readRecords(JSON.parse(raw)) : [],
        loaded: true,
        error: null,
      });
    } catch {
      set({
        loaded: true,
        error:
          "Saved records could not be read. Browser storage may be unavailable.",
      });
    }
  },
  save: (run, value) => {
    const name = playerName(value);
    if (!name || !validRun(run)) {
      set({ error: "Enter a name to save a completed run." });
      return false;
    }
    if (get().records.some((r) => r.id === run.id)) return true;
    try {
      // Merge records from other tabs before saving this run.
      const raw = localStorage.getItem(RECORDS_KEY);
      const stored = raw ? readRecords(JSON.parse(raw)) : [];
      const records = readRecords([
        { ...run, name },
        ...stored,
        ...get().records,
      ]);
      if (!records.some((r) => r.id === run.id)) {
        set({
          error:
            "The board holds the fastest 50 runs. Beat the last time to enter.",
        });
        return false;
      }
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      set({ records, loaded: true, error: null });
      return true;
    } catch {
      set({
        error:
          "Your record could not be saved. Allow browser storage and try again.",
      });
      return false;
    }
  },
}));
