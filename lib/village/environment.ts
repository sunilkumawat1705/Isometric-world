// Local civil time drives the stylized sun; no location permission is needed.
// Lunar phase is an approximation using the mean synodic month (NASA:
// https://science.nasa.gov/moon/moon-phases/), not an astronomical ephemeris.
export const SYNODIC_DAYS = 29.530588853;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
export function environmentAt(date: Date) {
  const hour =
    date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
  const altitude = Math.sin(sunAngle);
  const t = Math.max(0, Math.min(1, (altitude + 0.12) / 0.35));
  const daylight = t * t * (3 - 2 * t);
  const phase =
    ((((date.getTime() - NEW_MOON) / 86400000 / SYNODIC_DAYS) % 1) + 1) % 1;
  const illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const names = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];
  return {
    hour,
    sunAngle,
    altitude,
    daylight,
    phase,
    illumination,
    moonName: names[Math.round(phase * 8) % 8],
    period:
      daylight < 0.1
        ? "Night"
        : daylight < 0.9
          ? hour < 12
            ? "Dawn"
            : "Dusk"
          : "Day",
  };
}
export const environmentRuntime = { daylight: 1 };
