# Game UI and rendering validation

Validation date: 12 October 2026.

## Dedicated parkour entrance

Parkour Lodge occupies the north clearing at (-3, -14), separate from portfolio
houses. A stone approach, gold flag and map marker identify it. Its front doorway
is open, with solid side/back walls and a sensor that detects the kinematic avatar.
Walking inside opens the trial introduction; nearby E/touch/popup interaction and
the journal remain available. Begin enters the arena. Exit returns to (-3, -10.4),
outside the sensor, avoiding an automatic restart. Static lodge meshes reuse the
village's cached geometry/materials. Grass and flowers are excluded from its plot.

New browser coverage walks from the south spawn over the bridge to the lodge,
enters through its doorway, starts the arena, and returns outside on desktop and
phone layouts. The phone flow uses Pause → Return to village. The map marker,
proximity prompt and absence of repeated automatic entry are also checked.

Lodge revision validation: lint, TypeScript, production build and diff checks
passed; **56 unit tests** and **20 affected browser checks** passed. Chrome/ANGLE
Metal covered desktop, tablet and phone viewport layouts. Desktop/phone lodge
screenshots were reviewed; physical mobile devices were not tested.

## Plan and implementation

1. Audit the existing scene, camera, responsive controls and completion lifecycle.
2. Fix overlaps at phone and landscape sizes while retaining usable touch targets.
3. Add house details using cached geometry/materials and physical collision bounds.
4. Keep a single high graphics configuration, reduce unnecessary camera work and
   stop continuous scene rendering/physics while a dialog is open.
5. Offer optional named records only after successful completion; expose records
   from a nearby village records popup and the Adventure journal.
6. Verify the optimized build, unit behavior, browser interactions and screenshots.

Existing uncommitted work was preserved. No deployment or push was performed.

## Fixes

- Small map buttons retain 44px targets and spread apart in narrow map containers.
- Short landscape dialogs keep the map large enough to use and scroll as needed.
- Landscape camera controls and exploration/journal controls occupy separate areas.
- Touch tablets receive full joystick and action-button styling and positioning.
  Dark control surfaces and first-person footer labels preserve contrast over
  sunlit terrain.
- Mobile menus temporarily hide the competing exploration controls; Escape closes
  the menu and restores focus. Opening the journal hides phone camera controls.
- Achievement toasts no longer obscure result or leaderboard dialogs.
- The adventure achievement total comes from actual configured achievements.
- Guild banners no longer cover windows. House props include a smith, tools,
  quenching bucket, shutters, books, scrolls and a postbox, with collision bounds.
- Proximity labels replace permanent building labels and physical wooden signs.
  Only the nearest sign within six world units appears during exploration;
  activity prompts take priority, and dialogs or active trials hide sign popups.
  The bridge-front lamp is removed. Ordinary village names, cottages, a low wooden
  entrance fence and a plain character replace ninja branding and geometry.
- First-person mode hides the welcome vignette, uses
  immediate eye tracking and a shorter far plane, and updates the projection only
  while zoom changes. DOM scene overlays reuse their direction vector.
- All presets and quality heuristics were removed. Detailed materials, physical
  water and 2048px shadows remain enabled; render pixel density is capped at 1.5.
- Scene rendering uses demand mode and physics pauses during dialogs.
- Automatic progress skips unchanged storage writes, including timer updates.
  Storage failures retain in-memory progress and do not interrupt gameplay.

## Record behavior

Names are trimmed, normalized and limited to 24 characters. Records contain
completion time, gems, stars, hearts and completion date. Failed or invalid runs
cannot be submitted. The fastest 50 records rank by time, then gems. A run can be
saved once. Reload retains records; storage errors are visible and retryable.
Records from another tab are merged before writes. Runs outside the fastest fifty
receive an explanatory message instead of a false save confirmation.

This is a browser-local leaderboard, stored under `forest-village-records-v1`.
It is not a shared online competition or a server-verified score system.

## Automated coverage

- Unit tests: movement, zoom, jumping, proximity, terrain/water crossing, clock and
  lunar lighting, course data/hazards, trial framing, adventure lifecycle and
  leaderboard validation, persistence, ranking, duplicates and storage failures.
- Responsive UI: 1920×1080, 1440×900, 1366×768, 1024×768, 820×1180,
  768×1024, 844×390, 568×320, 390×844, 360×640 and 320×568.
- Touch/Retina: 820×1180 with touch events and device scale factor 2; checks touch
  target size, jump input, first-person selection and the 1.5 render-density cap.
- Gameplay: bridge movement, collisions, jumping, map/proximity interaction,
  clickable nearby library/leaderboard labels, label visibility before starting
  and during dialogs, arena entry/exit, pause/reset/restart and trial zoom.
- Record form: desktop and two phone sizes; name entry, single save, ranking panel,
  no horizontal overflow and retention after reload.
- Rendering/navigation: high shaders, camera switching/dragging/zoom, day/night,
  resize, repeated client navigation and JavaScript-free standard portfolio.

The record-form browser tests use a deterministic successful finish via the real
adventure-store snapshot. They do not automatically play all twelve flags; course
math, checkpoints and rewards have unit tests and controller interactions have
separate browser coverage.

## Environment and reproduction

Chrome with ANGLE Metal on Apple M1, serving the local production build. The
software SwiftShader backend stalled during high-resolution screenshot capture;
smaller software-rendered checks passed. Metal completed those desktop checks.
No physical iOS/Android devices or Safari/Firefox engines were available, and no
claim is made about frame rates across all hardware.

```sh
bun run lint
bun run typecheck
bun run test
bun run build
# Start the build locally, then in another terminal:
bunx next start --hostname 127.0.0.1
PLAYWRIGHT_ANGLE=metal \
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
bunx playwright test
```

Omit the browser/backend overrides when using Playwright's installed Chromium
and its default software backend on supported CI hardware. Screenshots are
written to `output/playwright/` (ignored by Git).

## Results

- Lint, TypeScript, production build and `git diff --check`: passed.
- Unit tests: **55 passed** across 9 files, including sign proximity boundaries,
  original waypoint positions and leaderboard actions.
- Final production browser checks: **30 passed** across 8 files (29 in the full
  run and the remaining library check in a focused rerun). The library route
  avoids exterior props and checks wall collision, E interaction, Enter
  activation of its projected popup and jumping after restoring game focus.
  The leaderboard popup is tested with a mouse click.
- Representative screenshots reviewed: desktop welcome, phone welcome,
  first-person view, short landscape map, phone leaderboard and Retina tablet.
