import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createProgressStorage } from "./progressStorage";
import { achievementNames, crystals, trail, type GameId } from "./config";
import {
  MAX_HEARTS,
  RETURN_POSITION,
  ARENA_MIN_X,
  parkourStars,
} from "./course";
import { MAX_ZOOM, releaseInput, useGame } from "../store";
import type { CompletedRun } from "./leaderboard";
export type Phase = "idle" | "playing" | "paused" | "success" | "result";
export type Plant = { seed: string; stage: number; growth: number } | null;
interface AdventureState {
  activeGame: GameId | null;
  completedRun: CompletedRun | null;
  phase: Phase;
  score: number;
  elapsed: number;
  startedAt: number | null;
  completedGames: GameId[];
  achievements: string[];
  personalBests: Partial<Record<GameId, number>>;
  collected: string[];
  garden: Plant[];
  checkpoint: number;
  trialZoom: number;
  setTrialZoom: (zoom: number) => void;
  hearts: number;
  gems: number;
  stars: number;
  parkourBest: { gems: number; stars: number };
  toast: string | null;
  toastSerial: number;
  start: (id: GameId) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  exit: () => void;
  complete: (score?: number) => void;
  collect: (id: string) => void;
  hurt: () => number;
  heal: () => void;
  fail: () => void;
  collectGem: () => void;
  unlock: (id: string) => void;
  notify: (text: string) => void;
  plant: (plot: number, seed: string) => void;
  water: (plot: number) => void;
}
// Only serializable progress is persisted; hydration happens after client mount.
export const useAdventure = create<AdventureState>()(
  persist(
    (set, get) => ({
      activeGame: null,
      completedRun: null,
      phase: "idle",
      score: 0,
      elapsed: 0,
      startedAt: null,
      completedGames: [],
      achievements: [],
      personalBests: {},
      collected: [],
      garden: [null, null, null],
      checkpoint: -1,
      trialZoom: 1,
      setTrialZoom: (zoom) =>
        set({ trialZoom: Math.max(0.6, Math.min(2.2, zoom)) }),
      hearts: MAX_HEARTS,
      gems: 0,
      stars: 0,
      parkourBest: { gems: 0, stars: 0 },
      toast: null,
      toastSerial: 0,
      start: (id) => {
        releaseInput();
        useGame.getState().close();
        set({
          activeGame: id,
          phase: "idle",
          completedRun: null,
          score: 0,
          elapsed: 0,
          startedAt: null,
          checkpoint: -1,
          hearts: MAX_HEARTS,
          gems: 0,
          stars: 0,
        });
      },
      play: () => {
        releaseInput();
        const parkour = get().activeGame === "parkour";
        if (parkour) {
          resetParkourRun();
          useGame.setState({ view: "birdseye", zoom: MAX_ZOOM });
        }
        // The jungle run starts on its first flag; the timer begins immediately.
        set({
          phase: "playing",
          completedRun: null,
          trialZoom: 1,
          elapsed: 0,
          score: 0,
          startedAt: performance.now(),
          checkpoint: parkour ? 0 : -1,
          hearts: MAX_HEARTS,
          gems: 0,
          stars: 0,
        });
        if (parkour) requestRespawn();
      },
      pause: () => {
        if (get().phase === "playing") {
          releaseInput();
          set({ phase: "paused" });
        }
      },
      resume: () => {
        releaseInput();
        set({ phase: "playing" });
      },
      exit: () => {
        releaseInput();
        // Leave the jungle arena only if the player actually entered it.
        if (
          get().activeGame === "parkour" &&
          adventureRuntime.player.x > ARENA_MIN_X
        )
          requestRespawn(RETURN_POSITION);
        set({ activeGame: null, phase: "idle" });
      },
      hurt: () => {
        const s = get();
        if (s.activeGame !== "parkour" || s.phase !== "playing")
          return s.hearts;
        const hearts = Math.max(0, s.hearts - 1);
        set({ hearts });
        if (hearts === 0) get().fail();
        return hearts;
      },
      heal: () => set((s) => ({ hearts: s.hearts + 1 })),
      collectGem: () => set((s) => ({ gems: s.gems + 1 })),
      fail: () => {
        const s = get();
        if (s.phase !== "playing") return;
        releaseInput();
        set({ phase: "result", stars: 0, score: s.elapsed });
        get().notify("Out of hearts · Give the trail another try.");
      },
      notify: (toast) =>
        set((s) => ({ toast, toastSerial: s.toastSerial + 1 })),
      unlock: (id) => {
        if (get().achievements.includes(id)) return;
        set((s) => ({ achievements: [...s.achievements, id] }));
        get().notify(`Achievement unlocked · ${achievementNames[id]}`);
      },
      complete: (value) => {
        const s = get(),
          id = s.activeGame;
        if (!id || s.phase !== "playing") return;
        const score = value ?? s.score;
        if (!Number.isFinite(score) || score <= 0) return;
        const previous = s.personalBests[id];
        const better =
          previous === undefined ||
          (id === "parkour" ? score < previous : score > previous);
        const stars = id === "parkour" ? parkourStars(s.gems, s.hearts) : 0;
        set({
          phase: "success",
          completedRun: {
            id: crypto.randomUUID(),
            game: id,
            seconds: score,
            gems: s.gems,
            stars,
            hearts: s.hearts,
            completedAt: new Date().toISOString(),
          },
          score,
          stars,
          completedGames: [...new Set([...s.completedGames, id])],
          personalBests: better
            ? { ...s.personalBests, [id]: score }
            : s.personalBests,
          parkourBest:
            id === "parkour"
              ? {
                  gems: Math.max(s.parkourBest.gems, s.gems),
                  stars: Math.max(s.parkourBest.stars, stars),
                }
              : s.parkourBest,
        });
        if (id === "parkour" && stars > 0) get().unlock(id);
      },
      collect: (id) => {
        if (!crystals.some((c) => c.id === id) || get().collected.includes(id))
          return;
        set((s) => ({ collected: [...s.collected, id] }));
        if (get().collected.length === crystals.length)
          get().unlock("crystals");
        else
          get().notify(
            `Crystal discovered — ${get().collected.length}/${crystals.length}`,
          );
      },
      plant: (plot, seed) =>
        set((s) => ({
          garden: s.garden.map((p, i) =>
            i === plot ? { seed, stage: 0, growth: 0 } : p,
          ),
        })),
      water: (plot) =>
        set((s) => ({
          garden: s.garden.map((p, i) =>
            i === plot && p && p.stage === 0
              ? { ...p, stage: 1, growth: 0 }
              : p,
          ),
        })),
    }),
    {
      name: "forest-village-adventure-v1",
      skipHydration: true,
      storage: createJSONStorage(() => createProgressStorage()),
      partialize: (s) => ({
        completedGames: s.completedGames,
        achievements: s.achievements,
        personalBests: s.personalBests,
        parkourBest: s.parkourBest,
        collected: s.collected,
        garden: s.garden,
      }),
    },
  ),
);
// Kinematic-body commands and per-run simulation state are transient and never
// stored in localStorage or React state.
export const adventureRuntime = {
  respawn: null as [number, number, number] | null,
  trailTime: 0,
  lastPublish: 0,
  courseTime: 0,
  stepWall: 0,
  live: false,
  invulUntil: -1,
  collected: new Set<string>(),
  defeated: new Set<string>(),
  defeatedAt: {} as Record<string, number>,
  pulses: {} as Record<string, number>,
  launch: null as { vy: number } | null,
  knock: null as { x: number; z: number } | null,
  boost: null as { x: number; z: number } | null,
  splash: null as { x: number; z: number; at: number } | null,
  cameraSnap: false,
  player: { x: 0, y: 0.85, z: 5, vy: 0, grounded: false },
};
export function resetParkourRun() {
  const r = adventureRuntime;
  r.trailTime = 0;
  r.lastPublish = 0;
  r.courseTime = 0;
  r.invulUntil = -1;
  r.collected.clear();
  r.defeated.clear();
  r.defeatedAt = {};
  r.pulses = {};
  r.launch = r.knock = r.boost = r.splash = null;
}
export function requestRespawn(position?: [number, number, number]) {
  const index = Math.max(0, useAdventure.getState().checkpoint),
    p = trail[index];
  adventureRuntime.respawn = position ?? [p[0], p[1] + 0.95, p[2]];
  adventureRuntime.invulUntil = adventureRuntime.courseTime + 0.8;
  releaseInput();
}
export function blocksMovement() {
  const s = useAdventure.getState();
  return (
    !!s.activeGame && !(s.activeGame === "parkour" && s.phase === "playing")
  );
}
