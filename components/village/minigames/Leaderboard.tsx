"use client";
import { useEffect } from "react";
import { useLeaderboard } from "@/lib/village/minigames/leaderboard";
export default function Leaderboard() {
  const { records, load, loaded, error } = useLeaderboard();
  useEffect(() => {
    load();
  }, [load]);
  return (
    <section className="leaderboard" aria-label="Jungle trial records">
      <p>
        Fastest successful runs · saved on this browser. Up to 50 records;
        fastest time wins, then most gems.
      </p>
      {error && <p role="alert">{error}</p>}
      {!loaded ? (
        <p role="status">Loading records…</p>
      ) : records.length === 0 ? (
        <div className="leaderboard-empty">
          <strong>The board is waiting for its first runner.</strong>
          <p>
            Finish the jungle trial and save your name on the result screen.
          </p>
        </div>
      ) : (
        <ol className="leaderboard-list">
          {records.map((r, i) => (
            <li key={r.id}>
              <span className="record-rank" aria-label={`Rank ${i + 1}`}>
                {i + 1}
              </span>
              <span className="record-player">
                <strong>{r.name}</strong>
                <small>
                  {r.gems} gems · {r.stars} {r.stars === 1 ? "star" : "stars"}
                </small>
              </span>
              <strong className="record-time">
                {r.seconds.toFixed(2)}
                <small>seconds</small>
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
