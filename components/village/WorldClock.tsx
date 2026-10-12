"use client";
import { useEffect, useState } from "react";
import { environmentAt } from "@/lib/village/environment";
export default function WorldClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);
  if (!now) return <span>Living village · local time</span>;
  const sky = environmentAt(now);
  return (
    <span
      title="Your local clock · approximate lunar phase · dawn at 06:00, dusk at 18:00"
      data-testid="world-clock"
      data-period={sky.period}
    >
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
      {sky.period} · {sky.moonName} ({Math.round(sky.illumination * 100)}%)
    </span>
  );
}
