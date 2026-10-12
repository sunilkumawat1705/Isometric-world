import { locations } from "./data";

export const villageWaypoints = [
  ...locations.map((location) => ({
    x: location.position[0] + 2.8,
    z: location.position[2] + 3.6,
    title: location.name,
    detail:
      location.id === "contact" ? "Letters & visitors" : "Visitors welcome",
    action: location.id,
  })),
  {
    x: -2.4,
    z: 9.8,
    title: "River bridge →",
    detail: "No swimming",
    action: null,
  },
  {
    x: 3.9,
    z: 24,
    title: "Forest Village",
    detail: "Bridge ahead · Farm →",
    action: null,
  },
  {
    x: -13,
    z: 24,
    title: "Meadow Mill",
    detail: "Grain & gardens",
    action: null,
  },
  {
    x: -3.8,
    z: 7.5,
    title: "Village records",
    detail: "View the jungle trial leaderboard",
    action: "leaderboard" as const,
  },
];
export function nearbyWaypoint(x: number, z: number) {
  let closest: (typeof villageWaypoints)[number] | null = null;
  let distance = 6;
  for (const waypoint of villageWaypoints) {
    const next = Math.hypot(x - waypoint.x, z - waypoint.z);
    if (next < distance) {
      closest = waypoint;
      distance = next;
    }
  }
  return closest;
}
