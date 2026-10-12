import { VILLAGE_SPAWN } from "./terrain";
import { create } from "zustand";
import type { MovementState, Section } from "./data";
export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 3;
// Exploring opens on the whole village; zooming in follows the player.
export const DEFAULT_ZOOM = 1;
export type ViewMode = "birdseye" | "first-person";
export const cameraLook = { yaw: Math.PI / 4, pitch: 0 };
interface GameState {
  started: boolean;
  ready: boolean;
  panel: Section | "map" | "settings" | "leaderboard" | null;
  near: Section | null;
  visited: Section[];
  position: [number, number];
  elevation: number;
  motion: MovementState;
  reduced: boolean;
  zoom: number;
  view: ViewMode;
  setZoom: (zoom: number) => void;
  sound: boolean;
  volume: number;
  start: () => void;
  open: (panel: GameState["panel"]) => void;
  close: () => void;
}
export const useGame = create<GameState>((set) => ({
  started: false,
  ready: false,
  panel: null,
  near: null,
  visited: [],
  position: [VILLAGE_SPAWN[0], VILLAGE_SPAWN[2]],
  elevation: VILLAGE_SPAWN[1],
  motion: "idle",
  reduced: false,
  zoom: DEFAULT_ZOOM,
  view: "birdseye",
  setZoom: (zoom) =>
    set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
  sound: false,
  volume: 0.3,
  start: () => set({ started: true }),
  open: (panel) => {
    if (!useGame.getState().panel && typeof document !== "undefined")
      focusOrigin =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    set((s) => ({
      panel,
      visited:
        panel &&
        !["map", "settings", "leaderboard"].includes(panel) &&
        !s.visited.includes(panel as Section)
          ? [...s.visited, panel as Section]
          : s.visited,
    }));
  },
  close: () => set({ panel: null }),
}));
// Frame-critical input is deliberately outside React subscriptions.
export const input = { keys: new Set<string>(), x: 0, y: 0, jumpAt: -Infinity };
export function releaseInput() {
  input.keys.clear();
  input.x = 0;
  input.y = 0;
  input.jumpAt = -Infinity;
}

let focusOrigin: HTMLElement | null = null;
export function restoreFocus() {
  if (focusOrigin?.isConnected && focusOrigin !== document.body)
    focusOrigin.focus();
  else
    document
      .getElementById(
        useGame.getState().started ? "world-input" : "explore-button",
      )
      ?.focus();
}
