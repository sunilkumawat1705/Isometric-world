import { Color, type Material } from "three";

// Keep the Standard/Physical lighting pipeline (tone mapping, shadows and IBL).
// Waves perturb the normal in world space, then convert it to view space for PBR.
export function waterShader(
  shader: Parameters<Material["onBeforeCompile"]>[0],
  time: { value: number },
) {
  shader.uniforms.uWaterTime = time;
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying vec3 vWaterWorld;",
    )
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying vec3 vWaterWorld; uniform float uWaterTime;",
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      float waveA = vWaterWorld.x * 0.85 + vWaterWorld.z * 0.55 - uWaterTime * 0.7;
      float waveB = vWaterWorld.x * -1.7 + vWaterWorld.z * 2.1 + uWaterTime * 0.95;
      vec2 slope = vec2(0.85, 0.55) * cos(waveA) * 0.055
                 + vec2(-1.7, 2.1) * cos(waveB) * 0.018;
      normal = normalize(mat3(viewMatrix) * normalize(vec3(-slope.x, 1.0, -slope.y)));
    `,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float swell = sin(vWaterWorld.x * 0.85 + vWaterWorld.z * 0.55 - uWaterTime * 0.7);
      diffuseColor.rgb *= 0.96 + 0.04 * swell;
    `,
    );
}

export type WaterStyle =
  | { kind: "river" }
  | { kind: "pond"; x: number; z: number; rx: number; rz: number }
  | { kind: "lagoon" };

// Stylized turquoise water: deep centre, pale shallows, drifting caustic
// lines, flow streaks, bank foam and sun glints. Foam is emissive so it stays
// bright inside shadows.
export function stylizedWater(
  shader: Parameters<Material["onBeforeCompile"]>[0],
  time: { value: number },
  style: WaterStyle,
  shallow = "#6fdbd6",
  deep = "#1b9dbd",
) {
  waterShader(shader, time);
  // Open lagoons read better with finer, quieter caustics than the river.
  const caustic =
    style.kind === "lagoon"
      ? { scale: 1.5, shallow: 0.1, deep: 0.05 }
      : { scale: 0.9, shallow: 0.2, deep: 0.08 };
  shader.uniforms.uShallow = { value: new Color(shallow) };
  shader.uniforms.uDeep = { value: new Color(deep) };
  const depth =
    style.kind === "river"
      ? `float across = abs(vWaterWorld.z - (14.0 + sin(vWaterWorld.x * 0.18) * 1.8)) / 2.5;
         waterDepth = smoothstep(1.02, 0.2, across);
         float streak = wNoise(vec2(vWaterWorld.x * 0.7 - uWaterTime * 0.9, vWaterWorld.z * 3.2))
                      * wNoise(vec2(vWaterWorld.x * 1.6 - uWaterTime * 1.3, vWaterWorld.z * 5.0 + 3.0));
         waterFoam = smoothstep(0.4, 0.62, streak) * 0.5 + smoothstep(0.84, 0.98, across) * 0.8;`
      : style.kind === "pond"
        ? `float across = length((vWaterWorld.xz - vec2(${style.x.toFixed(2)}, ${style.z.toFixed(2)})) / vec2(${style.rx.toFixed(2)}, ${style.rz.toFixed(2)}));
           waterDepth = smoothstep(1.0, 0.25, across);
           waterFoam = smoothstep(0.86, 0.97, across) * 0.6;`
        : `waterDepth = 0.55 + 0.45 * wNoise(vWaterWorld.xz * 0.05);
           waterFoam = 0.0;`;
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      uniform vec3 uShallow; uniform vec3 uDeep;
      float waterFoam = 0.0;
      vec3 waterTint = vec3(0.0);
      float wHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float wNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
        return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x),
                   mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float wCaustic(vec2 p, float t) {
        vec2 q = p + vec2(sin(p.y * 1.3 + t * 0.8), cos(p.x * 1.1 - t * 0.6)) * 0.55;
        float a = abs(sin(q.x * 2.2 + sin(q.y * 1.7)));
        float b = abs(sin(q.y * 2.0 + sin(q.x * 1.9 + t * 0.4)));
        return pow(1.0 - min(a, b), 6.0);
      }`,
    )
    .replace(
      "diffuseColor.rgb *= 0.96 + 0.04 * swell;",
      `float waterDepth;
      ${depth}
      vec3 water = mix(uShallow, uDeep, waterDepth);
      water += wCaustic(vWaterWorld.xz * ${caustic.scale.toFixed(2)}, uWaterTime) * mix(${caustic.shallow.toFixed(2)}, ${caustic.deep.toFixed(2)}, waterDepth);
      waterFoam += step(0.993, wHash(floor(vWaterWorld.xz * 7.0) + floor(uWaterTime * 1.5))) * 0.45;
      diffuseColor.rgb = water * (0.97 + 0.03 * swell);
      waterTint = water;`,
    )
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      totalEmissiveRadiance += waterTint * 0.22 + vec3(0.92, 0.98, 1.0) * min(waterFoam, 1.0);`,
    );
}
