"use client";
import { memo, useId, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Compass,
  Gem,
  Flag,
  LocateFixed,
  Trees,
} from "lucide-react";
import { WORLD_RADIUS, riverZ, BRIDGE_Z } from "@/lib/village/terrain";
import { locations, type Section } from "@/lib/village/data";
import { useGame } from "@/lib/village/store";
import { useAdventure } from "@/lib/village/minigames/store";
import { crystals } from "@/lib/village/minigames/config";
import { PARKOUR_LODGE } from "@/lib/village/minigames/entrance";

const point = (n: number) => Math.round((256 + n * 6.5) * 100) / 100;
const percent = (n: number) => (point(n) / 512) * 100;
const sectionNames: Record<Section, string> = {
  about: "About & education",
  projects: "Projects & work",
  skills: "Technical skills",
  experience: "Experience",
  contact: "Contact & resume",
};
const island =
  "M115 99 Q164 63 242 69 Q320 60 394 115 Q446 163 445 245 Q463 322 398 397 Q338 453 249 447 Q166 458 110 395 Q62 338 68 257 Q55 172 115 99Z";
const routes = [
  [0, 5, -9, -5],
  [-1, 5, -1, -10],
  [-1, -10, -3, -11.8],
  [0, 5, 6, -4],
  [0, 5, -11, 8],
  [0, 5, 7, 10],
  [7, 10, 16, 2],
  [0, 5, 1, 10],
  [1, 10, 1, 21],
  [1, 21, -13, 24],
  [1, 21, 12, 24],
];
const river = Array.from({ length: 37 }, (_, i) => {
  const x = -WORLD_RADIUS + (i * WORLD_RADIUS * 2) / 36;
  return `${i ? "L" : "M"}${point(x)} ${point(riverZ(x))}`;
}).join(" ");
const trees = Array.from({ length: 72 }, (_, i) => {
  const angle = i * 2.39996,
    radius = 169 + Math.sin(i * 13) * 17;
  return {
    x: Math.round((256 + Math.cos(angle) * radius) * 100) / 100,
    y: Math.round((256 + Math.sin(angle) * radius) * 100) / 100,
    r: 9 + (i % 4),
  };
}).filter((t) => t.y < 348 || t.x < 213 || t.x > 298);

function MapTerrain() {
  const gridId = useId();
  return (
    <svg className="map-terrain" viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <pattern
          id={gridId}
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M32 0H0V32"
            fill="none"
            stroke="#527468"
            strokeWidth=".6"
            opacity=".3"
          />
        </pattern>
      </defs>
      <rect width="512" height="512" fill="#1c3b32" />
      <rect width="512" height="512" fill={`url(#${gridId})`} />
      <circle
        cx="256"
        cy="256"
        r="226"
        fill="none"
        stroke="#63816c"
        strokeWidth="1"
        opacity=".35"
      />
      <path d={island} fill="#526f52" transform="translate(0 7)" />
      <path d={island} fill="#91a373" stroke="#c0c698" strokeWidth="1.5" />
      <path
        d="M130 112Q180 81 249 86Q326 82 386 131M120 128Q177 99 249 101Q317 98 374 144M113 145Q179 115 248 116Q320 117 365 158"
        fill="none"
        stroke="#637c55"
        strokeWidth="1.5"
        opacity=".6"
      />
      <path
        d="M105 307Q120 378 198 410Q275 436 352 395M119 302Q145 369 206 393Q279 414 342 384"
        fill="none"
        stroke="#6d875e"
        strokeWidth="1"
        opacity=".6"
      />
      <path
        d="M144 97Q240 49 363 100L356 135Q248 91 144 127Z"
        fill="#b4ae87"
        stroke="#797f60"
      />
      <path
        d="M161 107Q248 72 342 110M178 115Q248 94 323 120"
        fill="none"
        stroke="#838b68"
        strokeWidth="2"
      />
      {trees.map((tree, i) => (
        <g key={i}>
          <circle cx={tree.x + 2} cy={tree.y + 3} r={tree.r} fill="#54714f" />
          <circle
            cx={tree.x}
            cy={tree.y}
            r={tree.r}
            fill={i % 3 ? "#658451" : "#486d50"}
          />
          <circle
            cx={tree.x - 2}
            cy={tree.y - 3}
            r={tree.r * 0.58}
            fill="#80965d"
            opacity=".7"
          />
        </g>
      ))}
      <path d={river} stroke="#4a7b7a" strokeWidth="29" fill="none" />
      <path d={river} stroke="#83b8b0" strokeWidth="19" fill="none" />
      <path
        d={river}
        stroke="#bdd7c6"
        strokeWidth="1.5"
        fill="none"
        opacity=".7"
      />
      {routes.map(([sx, sz, ex, ez], i) => (
        <path
          key={i}
          d={`M${point(sx)} ${point(sz)} Q${point((sx + ex) / 2 + 1.1)} ${point((sz + ez) / 2)} ${point(ex)} ${point(ez)}`}
          fill="none"
          stroke="#e0d2a1"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ))}
      <rect
        x={point(1) - 10}
        y={point(BRIDGE_Z - 4.5)}
        width="20"
        height={6.5 * 9}
        rx="2"
        fill="#79593c"
        stroke="#d8bc88"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M${point(1) - 9} ${point(BRIDGE_Z - 4.2 + i)}H${point(1) + 9}`}
          stroke="#c6a777"
          strokeWidth="2"
        />
      ))}
      <path
        d="M237 424H275M239 419H273M243 422V437M269 422V437"
        stroke="#8a4632"
        strokeWidth="5"
      />
      {locations.map((location) => (
        <g
          key={location.id}
          transform={`translate(${point(location.position[0])},${point(location.position[2])})`}
        >
          <rect x="-19" y="-16" width="38" height="32" rx="3" fill="#6d8159" />
          <rect x="-14" y="-12" width="28" height="24" rx="2" fill="#dac79b" />
          <path
            d="M-17 -4L0 -17 17 -4 0 7Z"
            fill={location.color}
            stroke="#324f3d"
            strokeWidth="1.5"
          />
        </g>
      ))}
      <g
        transform={`translate(${point(PARKOUR_LODGE[0])},${point(PARKOUR_LODGE[2])})`}
      >
        <rect x="-14" y="-12" width="28" height="24" fill="#dac79b" />
        <path
          d="M-17 -4L0 -17 17 -4 0 7Z"
          fill="#557a58"
          stroke="#324f3d"
          strokeWidth="1.5"
        />
      </g>
      <g fill="#f0ddaa" fontFamily="inherit" fontSize="10" letterSpacing="1.4">
        <text x="256" y="48" textAnchor="middle">
          NORTH FOREST
        </text>
        <text x="128" y="463" textAnchor="middle">
          FOREST TRAIL
        </text>
        <text x="359" y="418" textAnchor="middle">
          SOUTH RIVER
        </text>
      </g>
      <g transform="translate(464 47)" fill="none" stroke="#d4cba3">
        <path d="M0 -14V14M-8 0H8M0 -14 -4 -4 0 -6 4 -4Z" fill="#d4cba3" />
        <text
          x="0"
          y="-21"
          textAnchor="middle"
          fill="#d4cba3"
          stroke="none"
          fontSize="11"
        >
          N
        </text>
      </g>
      <path
        d="M38 468H97M38 464V472M97 464V472"
        stroke="#c5ca9f"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const MemoizedMapTerrain = memo(MapTerrain);

export default function VillageMap({ compact = false }: { compact?: boolean }) {
  const position = useGame((s) => s.position);
  const open = useGame((s) => s.open);
  const visited = useGame((s) => s.visited);
  const collected = useAdventure((s) => s.collected);
  const [selected, setSelected] = useState<Section | null>(null);
  const [showCrystals, setShowCrystals] = useState(false);
  const inVillage = Math.hypot(...position) <= WORLD_RADIUS;
  const map = (
    <div className={`village-map ${compact ? "compact" : ""}`}>
      <MemoizedMapTerrain />
      <span
        className="map-parkour"
        role={compact ? undefined : "img"}
        aria-label={compact ? undefined : "Parkour Lodge · north clearing"}
        title="Parkour Lodge · walk inside to enter the jungle trial"
        style={{
          left: `${percent(PARKOUR_LODGE[0])}%`,
          top: `${percent(PARKOUR_LODGE[2])}%`,
        }}
      >
        <Flag size={compact ? 7 : 14} />
      </span>
      {!compact &&
        showCrystals &&
        crystals
          .filter((c) => !collected.includes(c.id))
          .map((c) => (
            <span
              key={c.id}
              className="map-crystal"
              title="Uncollected crystal"
              style={{
                left: `${percent(c.position[0])}%`,
                top: `${percent(c.position[2])}%`,
              }}
            >
              <Gem size={12} />
            </span>
          ))}
      {locations.map((location, i) => {
        const style = {
          left: `${percent(location.position[0])}%`,
          top: `${percent(location.position[2])}%`,
        };
        const discovered = visited.includes(location.id);
        return compact ? (
          <span
            key={location.id}
            className={`compact-landmark ${discovered ? "visited" : ""}`}
            style={style}
          />
        ) : (
          <button
            key={location.id}
            data-landmark={location.id}
            className={`map-landmark ${discovered ? "visited" : ""} ${selected === location.id ? "selected" : ""}`}
            style={{
              left: `calc(50% + (${percent(location.position[0])}% - 50%) * var(--map-pin-spread, 1))`,
              top: `calc(50% + (${percent(location.position[2])}% - 50%) * var(--map-pin-spread, 1))`,
            }}
            aria-label={`Open ${location.name} from map`}
            title={`${location.name} · ${sectionNames[location.id]}`}
            onMouseEnter={() => setSelected(location.id)}
            onFocus={() => setSelected(location.id)}
            onClick={() => open(location.id)}
          >
            {i + 1}
            <span className="visually-hidden">
              {discovered ? " · Visited" : " · Unexplored"}
            </span>
          </button>
        );
      })}
      {inVillage && (
        <span
          className="map-player"
          style={{
            left: `${percent(position[0])}%`,
            top: `${percent(position[1])}%`,
          }}
          title="Your position"
          role={compact ? undefined : "img"}
          aria-label={compact ? undefined : "Your position"}
        >
          <span />
        </span>
      )}
    </div>
  );
  if (compact) return map;
  return (
    <div className="map-explorer">
      <div className="map-canvas-area">
        <div className="map-toolbar">
          <span>
            <Compass size={16} /> Village field guide
          </span>
          <button
            aria-pressed={showCrystals}
            onClick={() => setShowCrystals(!showCrystals)}
          >
            <Gem size={15} /> Crystals
          </button>
        </div>
        {map}
        <div className="map-legend">
          <span>
            <i className="legend-player" /> You are here
          </span>
          <span>
            <i className="legend-visited" /> Visited
          </span>
          <span>
            <i className="legend-trail" /> Walking trails
          </span>
          <span>
            <Flag size={12} /> Parkour Lodge
          </span>
        </div>
        {!inVillage && (
          <p className="map-away">
            <LocateFixed size={15} /> You’re in the jungle trial. The map shows
            the main village.
          </p>
        )}
      </div>
      <aside className="map-destinations" aria-label="Map destinations">
        <div className="map-directory-heading">
          <h3>Find your way</h3>
          <span>
            {visited.length} / {locations.length} visited
          </span>
        </div>
        <p>Choose a landmark to explore my portfolio.</p>
        <div className="map-destination-list">
          {locations.map((location, i) => (
            <button
              key={location.id}
              className={selected === location.id ? "selected" : ""}
              onMouseEnter={() => setSelected(location.id)}
              onFocus={() => setSelected(location.id)}
              onClick={() => open(location.id)}
              aria-label={`Explore ${location.name}`}
            >
              <span
                className={`destination-number ${visited.includes(location.id) ? "visited" : ""}`}
              >
                {visited.includes(location.id) ? <Check size={15} /> : i + 1}
              </span>
              <span className="destination-copy">
                <strong>{location.name}</strong>
                <small>{sectionNames[location.id]}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
        <div className="map-field-note">
          <Trees size={17} />
          <span>
            Follow the forest trails.
            <br />
            Parkour Lodge is in the north clearing.
          </span>
        </div>
        <div className="map-collection">
          <Gem size={15} />
          <span>
            {collected.length} of {crystals.length} crystals collected
          </span>
        </div>
      </aside>
    </div>
  );
}
