import type { CSSProperties } from "react";
import { seeded } from "@/lib/village/logic";

// Decorative, static layers around the canvas: an out-of-focus forest behind
// the island, and drifting leaves, motes and light shafts in front of it.
// Everything is seeded so server and client markup match.
type Cluster = {
  x: number;
  y: number;
  r: number;
  leaves: number;
  size: number;
  colors: string[];
};
const FAR: Cluster[] = [
  {
    x: 40,
    y: 30,
    r: 230,
    leaves: 26,
    size: 120,
    colors: ["#1f3f26", "#28512f", "#335f36", "#4f7a37"],
  },
  {
    x: -30,
    y: 430,
    r: 210,
    leaves: 22,
    size: 110,
    colors: ["#19331f", "#21432a", "#2a5230"],
  },
  {
    x: 140,
    y: 900,
    r: 300,
    leaves: 30,
    size: 140,
    colors: ["#1a3521", "#24482b", "#3b6532", "#4f7d38"],
  },
  {
    x: 720,
    y: 960,
    r: 230,
    leaves: 22,
    size: 120,
    colors: ["#19321f", "#22442a", "#2d5732"],
  },
  {
    x: 1580,
    y: 900,
    r: 260,
    leaves: 26,
    size: 130,
    colors: ["#1a3421", "#24472b", "#3a6432"],
  },
  {
    x: 1650,
    y: 400,
    r: 230,
    leaves: 24,
    size: 120,
    colors: ["#1d3a23", "#28502f", "#3a6735", "#557f39"],
  },
  {
    x: 1380,
    y: -50,
    r: 250,
    leaves: 24,
    size: 120,
    colors: ["#20402a", "#2c5732", "#4a7a3a", "#6b9a44"],
  },
  {
    x: 1150,
    y: 40,
    r: 170,
    leaves: 16,
    size: 110,
    colors: ["#244a2d", "#33603a", "#4f7f3c"],
  },
  {
    x: 430,
    y: 760,
    r: 160,
    leaves: 14,
    size: 110,
    colors: ["#21452b", "#2f5a35", "#466f36"],
  },
  {
    x: 760,
    y: -70,
    r: 200,
    leaves: 20,
    size: 110,
    colors: ["#1a3521", "#22452a", "#2d5732"],
  },
];
const NEAR: Cluster[] = [
  {
    x: -40,
    y: 950,
    r: 160,
    leaves: 12,
    size: 190,
    colors: ["#142a18", "#1d3a22", "#3f6a2e", "#577f34"],
  },
  {
    x: 1660,
    y: 780,
    r: 120,
    leaves: 9,
    size: 170,
    colors: ["#132817", "#1c3921", "#36602b"],
  },
  {
    x: 1320,
    y: -40,
    r: 110,
    leaves: 8,
    size: 150,
    colors: ["#142a18", "#1d3a22", "#4a7431"],
  },
];
function leaves(clusters: Cluster[], seed: number) {
  const random = seeded(seed);
  return clusters.flatMap((c) =>
    Array.from({ length: c.leaves }, () => {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * c.r,
        l = c.size * (0.6 + random() * 0.6),
        w = l * (0.22 + random() * 0.12);
      return {
        transform: `translate(${(c.x + Math.cos(a) * r).toFixed(1)} ${(
          c.y +
          Math.sin(a) * r
        ).toFixed(1)}) rotate(${(random() * 360).toFixed(1)})`,
        d: `M0 0Q${(l / 2).toFixed(1)} ${(-w).toFixed(1)} ${l.toFixed(1)} 0Q${(
          l / 2
        ).toFixed(1)} ${w.toFixed(1)} 0 0Z`,
        fill: c.colors[Math.floor(random() * c.colors.length)],
        opacity: Number((0.75 + random() * 0.25).toFixed(2)),
      };
    }),
  );
}
const farLeaves = leaves(FAR, 11),
  nearLeaves = leaves(NEAR, 23);
const bokeh = (() => {
  const random = seeded(5);
  return Array.from({ length: 26 }, () => ({
    cx: (random() < 0.5 ? random() * 520 : 1080 + random() * 520).toFixed(1),
    cy: (random() * 900).toFixed(1),
    r: (8 + random() * 26).toFixed(1),
    opacity: (0.08 + random() * 0.22).toFixed(2),
  }));
})();
const fallingLeaves = (() => {
  const random = seeded(17);
  return Array.from({ length: 12 }, (_, i) => ({
    "--x": `${(8 + random() * 88).toFixed(1)}%`,
    "--s": `${(9 + random() * 10).toFixed(1)}px`,
    "--d": `${(13 + random() * 10).toFixed(1)}s`,
    "--delay": `${(-random() * 20).toFixed(1)}s`,
    "--b": `${i % 4 === 0 ? 1.5 : 0}px`,
    "--hue": `${(random() * 40 - 20).toFixed(0)}deg`,
  })) as CSSProperties[];
})();
const motes = (() => {
  const random = seeded(29);
  return Array.from({ length: 14 }, () => ({
    "--x": `${(30 + random() * 68).toFixed(1)}%`,
    "--y": `${(15 + random() * 75).toFixed(1)}%`,
    "--d": `${(7 + random() * 8).toFixed(1)}s`,
    "--delay": `${(-random() * 10).toFixed(1)}s`,
  })) as CSSProperties[];
})();

function Foliage({
  items,
  className,
}: {
  items: ReturnType<typeof leaves>;
  className: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {items.map((leaf, i) => (
        <path
          key={i}
          d={leaf.d}
          transform={leaf.transform}
          fill={leaf.fill}
          opacity={leaf.opacity}
        />
      ))}
    </svg>
  );
}

export function ForestBackdrop() {
  return (
    <div className="forest-backdrop" aria-hidden="true">
      <Foliage items={farLeaves} className="forest-far" />
      <svg
        className="forest-bokeh"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <radialGradient id="bokeh-dot">
            <stop offset="0" stopColor="#e6f59a" />
            <stop offset="1" stopColor="#e6f59a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {bokeh.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill="url(#bokeh-dot)"
            opacity={dot.opacity}
          />
        ))}
      </svg>
    </div>
  );
}

export function ForestForeground() {
  return (
    <div className="forest-foreground" aria-hidden="true">
      <div className="sun-rays">
        <span />
        <span />
        <span />
        <span />
      </div>
      <Foliage items={nearLeaves} className="forest-near" />
      {fallingLeaves.map((style, i) => (
        <span key={i} className="falling-leaf" style={style} />
      ))}
      {motes.map((style, i) => (
        <span key={i} className="forest-mote" style={style} />
      ))}
    </div>
  );
}

export function TiltShift() {
  return <div className="tilt-shift" aria-hidden="true" />;
}
