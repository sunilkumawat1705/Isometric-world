import { PARKOUR_ENTRANCE } from "./entrance";
export type GameId = "parkour";
export const activities: {
  id: GameId;
  name: string;
  prompt: string;
  position: [number, number, number];
  description: string;
}[] = [
  {
    id: "parkour",
    name: "Jungle trial",
    prompt: "Parkour Lodge · Enter jungle trial",
    position: PARKOUR_ENTRANCE,
    description:
      "Reach twelve flags: master precision jumps, faster logs, narrow bridges, and spiked ascents.",
  },
];
// Inside the tree ring and outside every building/forge collider.
export const crystals: { id: string; position: [number, number, number] }[] = [
  { id: "arrival", position: [2, 0.8, 5] },
  { id: "house-trail", position: [-5, 0.8, -4] },
  { id: "north-trail", position: [0, 0.8, -11] },
  { id: "forge-trail", position: [10, 0.8, -3] },
  { id: "lookout-trail", position: [19, 0.8, 3] },
  { id: "guild-trail", position: [11, 0.8, 5] },
  { id: "library-trail", position: [-14, 0.8, 8.5] },
  { id: "south-clearing", position: [0, 0.8, 20] },
];
export { trail } from "./course";
export const achievementNames: Record<string, string> = {
  crystals: "Forest Explorer",
  parkour: "Trail Runner",
};
export function nearestActivity(x: number, z: number) {
  return (
    activities
      .map((a) => ({
        ...a,
        distance: Math.hypot(x - a.position[0], z - a.position[2]),
      }))
      .filter((a) => a.distance < 1.9)
      .sort((a, b) => a.distance - b.distance)[0] ?? null
  );
}
