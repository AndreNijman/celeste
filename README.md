# Celeste Browser Clone

A compact, single-file HTML5 Canvas platformer inspired by Celeste (Maddy Makes Games). No build step, no dependencies — open `index.html` in a browser and climb.

## Running

Open `index.html` directly, or serve the folder:

```
npx serve .
```

Progress saves automatically to `localStorage` (berries, cassettes, achievements, chapter bests, audio/accessibility options). Losing focus mid-run auto-pauses and saves.

## Controls

| Action | Input |
| --- | --- |
| Move | A/D or Arrow Keys |
| Jump / select | Z, Space, K, or Enter |
| Dash | X or Shift |
| Climb wall | C (hold), or hold Up / press into the wall (works on the way up too) |
| Pause | ESC |
| Pause menu | Click buttons, or R restart / A achievements / O options / Q quit to menu |
| Restart room | R (also available from pause) |
| Skip tutorial hint | Enter (Prologue) |

Menus, chapter select, achievements, the pause screen and overlays are fully mouse/touch clickable. Gamepad: left stick/D-pad to move, bottom face button jumps, side buttons dash, shoulder buttons climb, Start pauses/menus. Responsive on-screen touch controls with full D-pad (Up, Down, Left, Right) + Climb, Jump, Dash appear on mobile/touch screens.

## Mechanics

- **Dash**: one air dash, refreshed on landing, wall contact, bubbles, and springs. Dashing through **dream blocks** dissolves them for a moment; dashing straight down while grounded converts to a forward dash.
- **Variable jump height**: holding jump softens rising gravity for controllable arcs.
- **Climb/stamina**: grabbing works while ascending as well as falling; climbing drains stamina, ground contact restores it quickly. Wall jumps get a brief steering lockout so kicks carry you away from the wall.
- **Springs** (red = super) launch you; **bubbles** carry you until you pop them with jump.
- **Wind zones** push you mid-air; ice platforms are slippery with sparkle effects.
- **Feather**: 3-second timed glide — hold jump to rise.
- **Seekers & Badeline** chase when you get close and periodically charge.
- **Trigger spikes** arm themselves when approached, then disarm. All spikes use forgiving, direction-aware hitboxes anchored at their base.
- **Dash switches & gate blocks**: dashing into a cyan DASH switch toggles magenta gate bridges — alternate routes and recovery paths in `resort2`, `summit-gale`, and `forsaken-underpass`.
- **Golden strawberry** (farewell-final): only counts if you haven't died since entering the room chain.

## Structure

- 14 chapters (A-Sides + B-Sides + one C-Side + Farewell), **46 rooms** total. Each A-Side hides a **cassette tape** that unlocks its B-Side.
- Branching routes: `forsaken-crossing` can skip ahead through the **Underpass**, `resort-finale` hides a descent detour into the **Old Cellars**, and the Summit chain crosses the wind-swept **Aurora Crossing**.
- Room geometry comes from curated design data in `CURATED_ROOM_DESIGNS` (game.js); legacy procedural rooms are overwritten by it.
- One crystal heart ends the story (summit-peak, via Farewell).

## Achievements

18 tracked, persisted in the save: firsts (death/strawberry/dash/wall jump/feather/cassette/heart), collection goals (10 strawberries, full-chapter sets, all cassettes), challenge goals (chapter under par time, deathless chapter, C-Side completion, visit every chapter, golden berry, wind riding in Farewell). In-game notifications pop up on unlock, and a dedicated paginated Achievements screen can be viewed anytime from the main menu or pause menu.

## Options

High Contrast Mode, Reduced Motion (disables screen shake & heavy particle effects), Music toggle, Sound Effects toggle, Ghost Replay (replays Madeline's best run as a semi-transparent guide), and a 2-step confirmed "Reset Save Data" option.

## Development

### Level validator

```
node tools/check-levels.mjs
```

Loads game.js in a VM sandbox, builds every room, and verifies:
- spawn points are standable and safe
- exits, strawberries, cassettes, hearts, feathers and dash switches are reachable (models jump/dash/climb/spring/bubble arcs)
- no flag targets missing rooms; chapters reference real rooms
- hazard-overlap integrity: spikes never sit on springs/spawns/exits/pickups, mover endpoints stay clear of spikes, bubbles aren't buried in terrain
- Kevin blocks are modeled as solid (catches pickups embedded in them)
- dash-switch/gate integrity: switches must target real gate blocks, raised gates must never overlap hazards/pickups/spawns/switches

Exit code reflects issue count; output lists each problem as `[roomId] message`.

### Headless playtests

```
node tools/playtest.mjs
```

Boots the real game loop in a VM sandbox and drives scripted keyboard input frame-by-frame: movement, variable jump height, dashes, wall grabs + stamina drain, spike deaths, pause/restart semantics, dash switch → gate activation, bubble pops, feather glide, room transitions, save round-trips and the ending flow (36 checks). Exit code reflects failures.

### Architecture notes

- Fixed logical resolution 320×180 scaled to fit; pixel-art rendering (`imageSmoothingEnabled = false`).
- Physics runs on variable dt clamped to 1/30 s; collision is AABB tile-based with separate axis resolution.
- Static terrain is pre-rendered once per room into an offscreen canvas; only entities/effects redraw per frame. Particles are capped at 600.
- All audio is synthesized at runtime via WebAudio (oscillators + noise buffer + filters) — no assets. Music pairs a root drone with a fifth-interval pad voice.
- Known dormant content: none — dash switches/cassette blocks are now used in three rooms.

*Celeste is © Maddy Makes Games (Maddy Thorson & Noel Berry). This is an unaffiliated fan homage.*
