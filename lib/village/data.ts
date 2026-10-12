import { portfolio, projects, experiences, skillGroups } from "@/lib/portfolio";
export { portfolio, projects, experiences, skillGroups };
export type Section =
  "about" | "projects" | "skills" | "experience" | "contact";
export interface VillageLocation {
  id: Section;
  name: string;
  subtitle: string;
  position: [number, number, number];
  color: string;
  radius: number;
}
export const locations: VillageLocation[] = [
  {
    id: "about",
    name: "Village Hall",
    subtitle: "About Sunil · education & certifications",
    position: [-9, 0, -8],
    color: "#b9503e",
    radius: 5,
  },
  {
    id: "projects",
    name: "Workshop",
    subtitle: "Projects & professional work",
    position: [6, 0, -7],
    color: "#c77a3b",
    radius: 5,
  },
  {
    id: "skills",
    name: "Village Library",
    subtitle: "Technical skills",
    position: [-11, 0, 5],
    color: "#477b70",
    radius: 5,
  },
  {
    id: "experience",
    name: "Guild Hall",
    subtitle: "Professional experience",
    position: [7, 0, 7],
    color: "#9d493a",
    radius: 5,
  },
  {
    id: "contact",
    name: "Village Post",
    subtitle: "Contact & resume",
    position: [16, 0, -1],
    color: "#547d78",
    radius: 5,
  },
];
export const movement = {
  walkSpeed: 4,
  runSpeed: 7,
  acceleration: 15,
  deceleration: 22,
  jumpVelocity: 7,
  gravityScale: 1,
  rotationSpeed: 12,
  groundCheckDistance: 0.15,
  coyoteTime: 0.1,
  jumpBufferTime: 0.15,
} as const;
export type MovementState =
  "idle" | "walk" | "run" | "jump" | "fall" | "land" | "interact";
