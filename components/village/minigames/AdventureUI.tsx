"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trophy, Gem, Heart, Pause, Play, Minus, Plus } from "lucide-react";
import { activities, achievementNames } from "@/lib/village/minigames/config";
import {
  MAX_HEARTS,
  totalGems,
  checkpoints,
} from "@/lib/village/minigames/course";
import { requestRespawn, useAdventure } from "@/lib/village/minigames/store";
import { releaseInput, useGame } from "@/lib/village/store";
import { useLeaderboard } from "@/lib/village/minigames/leaderboard";
function SaveRecord() {
  const run = useAdventure((s) => s.completedRun);
  const { records, save, load, error } = useLeaderboard();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    load();
  }, [load]);
  if (!run) return null;
  const recorded = saved || records.some((r) => r.id === run.id);
  return (
    <form
      className="save-record"
      onSubmit={(e) => {
        e.preventDefault();
        if (save(run, name)) setSaved(true);
      }}
    >
      {recorded ? (
        <p role="status">
          Record saved. Your run is on the village leaderboard.
        </p>
      ) : (
        <>
          <label htmlFor="runner-name">
            Save your record · What’s your name?
          </label>
          <div className="save-record-fields">
            <input
              id="runner-name"
              name="runnerName"
              autoComplete="nickname"
              maxLength={24}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <button type="submit" disabled={!name.trim()}>
              Save record
            </button>
          </div>
          <small>
            Optional. Records stay in this browser. You can leave without
            saving.
          </small>
          {error && <p role="alert">{error}</p>}
        </>
      )}
      <button
        type="button"
        className="record-board-link"
        onClick={() => useGame.getState().open("leaderboard")}
      >
        View leaderboard
      </button>
    </form>
  );
}
function Result() {
  const game = useAdventure((s) => s.activeGame),
    score = useAdventure((s) => s.score),
    best = useAdventure((s) => s.personalBests),
    stars = useAdventure((s) => s.stars),
    gems = useAdventure((s) => s.gems),
    hearts = useAdventure((s) => s.hearts),
    checkpoint = useAdventure((s) => s.checkpoint),
    phase = useAdventure((s) => s.phase),
    completedRun = useAdventure((s) => s.completedRun),
    failed = !completedRun;
  useEffect(() => {
    if (phase === "success") {
      const id = setTimeout(
        () => useAdventure.setState({ phase: "result" }),
        850,
      );
      return () => clearTimeout(id);
    }
  }, [phase]);
  return (
    <div className="game-result">
      <div
        className={`reward-symbol ${phase === "success" ? "celebrate" : ""}`}
      >
        ✦
      </div>
      <h3>{failed ? "Out of hearts." : "Trail conquered."}</h3>
      <p>
        {failed
          ? `Reached flag ${Math.max(1, checkpoint + 1)} of ${checkpoints.length} · ${gems}/${totalGems} gems`
          : `${score.toFixed(2)} seconds · ${gems}/${totalGems} gems · ${hearts} ${hearts === 1 ? "heart" : "hearts"} left · Best ${best.parkour?.toFixed(2)}s`}
      </p>
      {game === "parkour" && !failed && (
        <div className="star-row" role="img" aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? "earned" : ""}>
              {n <= stars ? "★" : "☆"}
            </span>
          ))}
        </div>
      )}
      {!failed && <SaveRecord key={completedRun?.id} />}
      {game === "parkour" && (
        <>
          {!failed && (
            <p className="star-hint">
              ★ finish · ★ {Math.ceil(totalGems * 0.6)}+ gems · ★{" "}
              {Math.ceil(totalGems * 0.9)}+ gems with 3+ hearts
            </p>
          )}
          <button
            className="primary-button"
            onClick={() => useAdventure.getState().play()}
          >
            <Play size={16} /> {failed ? "Try again" : "Run it again"}
          </button>
        </>
      )}
    </div>
  );
}
// A focused HUD button would otherwise swallow the Space key meant for jumping.
function handOffFocus(action: () => void) {
  action();
  document.getElementById("world-input")?.focus();
}
export default function AdventureUI() {
  const s = useAdventure(),
    started = useGame((g) => g.started),
    panel = useGame((g) => g.panel);
  const [journal, setJournal] = useState(false);
  const activity = activities.find((a) => a.id === s.activeGame),
    parkourLive = s.activeGame === "parkour" && s.phase === "playing";
  useEffect(() => {
    void useAdventure.persist.rehydrate();
  }, []);
  useEffect(() => {
    if (!s.toast) return;
    const timer = setTimeout(
      () => useAdventure.setState({ toast: null }),
      4200,
    );
    return () => clearTimeout(timer);
  }, [s.toast, s.toastSerial]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) useAdventure.getState().pause();
    };
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        useAdventure.getState().activeGame === "parkour" &&
        useAdventure.getState().phase === "playing"
      ) {
        e.preventDefault();
        useAdventure.getState().pause();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (panel && s.phase === "playing") useAdventure.getState().pause();
  }, [panel, s.phase]);
  useEffect(() => {
    if (s.activeGame) releaseInput();
  }, [s.activeGame]);
  if (!started) return null;
  return (
    <>
      {!parkourLive && (
        <aside className="adventure-hud" aria-label="Adventure progress">
          <button
            className="adventure-summary"
            aria-expanded={journal}
            onClick={() => setJournal(!journal)}
          >
            <Gem size={15} /> {s.collected.length}/8 <Trophy size={15} />{" "}
            {s.achievements.length}/{Object.keys(achievementNames).length}{" "}
            <span>{journal ? "Close journal" : "Adventure journal"}</span>
          </button>
          {journal && (
            <div className="adventure-journal">
              <h3>Take a little detour</h3>
              <p>
                Activities are optional. Walk to an activity and press E, or choose
                one here.
              </p>
              {activities.map((a) => (
                <button
                  key={a.id}
                  disabled={!!s.activeGame}
                  onClick={() => {
                    s.start(a.id);
                    setJournal(false);
                  }}
                >
                  <span>
                    {a.name}
                    <small>{a.description}</small>
                  </span>
                  <span>{s.completedGames.includes(a.id) ? "✓" : "→"}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  useGame.getState().open("leaderboard");
                  setJournal(false);
                }}
              >
                <span>
                  Village leaderboard
                  <small>Fastest jungle trial runs on this browser</small>
                </span>
                <Trophy size={18} />
              </button>
              <div className="achievement-badges">
                {Object.entries(achievementNames).map(([id, name]) => (
                  <span
                    key={id}
                    className={s.achievements.includes(id) ? "earned" : ""}
                  >
                    {s.achievements.includes(id) ? "✦" : "◇"} {name}
                  </span>
                ))}
              </div>
              {s.collected.length === 8 && (
                <p>
                  Forest Explorer! You discovered every hidden crystal. Easter
                  egg: the forest’s trees grow from the same seed, 42.
                </p>
              )}
            </div>
          )}
        </aside>
      )}
      {s.toast && !panel && (!s.activeGame || parkourLive) && (
        <div key={s.toastSerial} className="adventure-toast" role="status">
          <span>✦</span>
          {s.toast}
        </div>
      )}
      {parkourLive && (
        <>
          <div className="trail-stats" role="status" aria-label="Run status">
            <span
              className="trail-hearts"
              role="img"
              aria-label={
                s.hearts > MAX_HEARTS
                  ? `${s.hearts} hearts, ${s.hearts - MAX_HEARTS} extra lives`
                  : `${s.hearts} of ${MAX_HEARTS} hearts`
              }
            >
              {Array.from({ length: MAX_HEARTS }, (_, i) => (
                <Heart
                  key={i}
                  size={22}
                  className={i < s.hearts ? "full" : "empty"}
                  fill={i < s.hearts ? "currentColor" : "none"}
                />
              ))}
              {s.hearts > MAX_HEARTS && (
                <b className="bonus-lives">+{s.hearts - MAX_HEARTS}</b>
              )}
            </span>
            <span className="trail-gems" aria-label="Gems collected">
              <Gem size={18} /> {s.gems}
              <small>/{totalGems}</small>
            </span>
            <span className="trail-time">{s.elapsed.toFixed(1)}s</span>
          </div>
          <section className="parkour-hud" aria-label="Parkour challenge">
            <strong>Jungle trial</strong>
            <small className="trail-stage">
              Flag {Math.max(1, s.checkpoint + 1)} / {checkpoints.length}
              <span className="trail-keyboard-hint">
                {" · "}Space jumps · land on grunts to stomp them
              </span>
            </small>
            <div
              className="trial-zoom"
              role="group"
              aria-label="Trial camera zoom"
            >
              <output
                className="sr-only"
                aria-label="Trial zoom"
                aria-live="polite"
              >
                {Math.round(s.trialZoom * 100)}%
              </output>
              <button
                aria-label="Zoom out"
                disabled={s.trialZoom <= 0.6}
                onClick={() =>
                  handOffFocus(() => s.setTrialZoom(s.trialZoom - 0.2))
                }
              >
                <Minus size={16} />
              </button>
              <button
                aria-label="Zoom in"
                disabled={s.trialZoom >= 2.2}
                onClick={() =>
                  handOffFocus(() => s.setTrialZoom(s.trialZoom + 0.2))
                }
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="trail-actions">
              <button
                className="trail-secondary"
                onClick={() => handOffFocus(requestRespawn)}
              >
                Reset to checkpoint
              </button>
              <button
                className="trail-secondary"
                onClick={() => handOffFocus(s.play)}
              >
                Restart
              </button>
              <button onClick={() => handOffFocus(s.pause)}>
                <Pause size={14} /> Pause
              </button>
              <button
                className="trail-secondary"
                onClick={() => handOffFocus(s.exit)}
              >
                Exit
              </button>
            </div>
          </section>
        </>
      )}
      <Dialog.Root
        open={!!activity && !parkourLive && !panel}
        onOpenChange={(open) => {
          if (!open) s.exit();
        }}
      >
        {activity && !parkourLive && !panel && (
          <Dialog.Portal>
            <Dialog.Overlay className="panel-backdrop" />
            <Dialog.Content
              className="portfolio-panel activity-panel"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                document.getElementById("world-input")?.focus();
              }}
            >
              <Dialog.Close className="panel-close" aria-label="Exit activity">
                <X size={20} />
              </Dialog.Close>
              <span className="panel-eyebrow">A LITTLE FOREST ADVENTURE</span>
              <Dialog.Title>{activity.name}</Dialog.Title>
              <Dialog.Description>{activity.description}</Dialog.Description>
              <div className="panel-body">
                {s.phase === "idle" ? (
                  <div className="activity-intro">
                    <div className="reward-symbol">⚑</div>
                    <p>
                      Cross twelve flags through a jungle lagoon: dodge rolling
                      logs and spiked balls, land on grunts to stomp them,
                      bounce on mushrooms, ride the boost pads and rafts, and
                      gather gems. You have five hearts — a splash or a hit
                      costs one, and a splash sends you back to your last flag.
                      Jump with Space or the touch button.
                    </p>
                    <button className="primary-button" onClick={s.play}>
                      <Play size={17} /> Begin
                    </button>
                  </div>
                ) : s.phase === "success" || s.phase === "result" ? (
                  <Result />
                ) : (
                  <>
                    {s.phase === "paused" && (
                      <div className="activity-intro">
                        <p>
                          Your adventure is paused. Adjust camera zoom with + /
                          − while playing, or pinch and scroll.
                        </p>
                        <button className="primary-button" onClick={s.resume}>
                          Resume
                        </button>
                      </div>
                    )}
                  </>
                )}

                {s.phase !== "idle" && (
                  <div className="activity-toolbar">
                    {s.phase === "playing" && (
                      <button onClick={s.pause}>Pause</button>
                    )}
                    {s.phase === "paused" && (
                      <button
                        onClick={() => {
                          requestRespawn();
                          s.resume();
                        }}
                      >
                        Reset to checkpoint
                      </button>
                    )}
                    <button onClick={() => s.start(activity.id)}>
                      Restart challenge
                    </button>
                    <button onClick={s.exit}>Return to village</button>
                  </div>
                )}
                <p className="game-help">
                  Pause the trial to reset, restart, or return to the village.
                </p>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </>
  );
}
