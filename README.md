# Canyon Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/berkahmuse/flight-game-berkahmuse-2/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/berkahmuse/flight-game-berkahmuse-2/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A mountain-canyon parcel run: fly a courier plane through delivery rings,
mind the canyon walls, watch your fuel, and land the parcel on the runway.

Built for the [Make the best flight game](https://make.fun/c/best-flight-game-20261126-0057)
competition on [make.fun](https://make.fun).

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server — `node serve.ts` serves it on http://localhost:8081). No
network, no build step, no libraries: plain Canvas 2D and WebAudio.

- **A / D** or **← / →** — steer (bank into the turn)
- **W / S** or **↑ / ↓** — climb and descend
- **SHIFT / CTRL** — throttle up and down
- **SPACE** — boost (burns fuel fast)
- **P** — pause, **R** — restart mission, **1 / 2 / 3** — pick a mission

## The game

Three courier routes, each a deterministic seeded canyon with its own
palette, width, wind and ring layout:

1. **Pine Post Run** — 12 rings, daylight, a gentle first delivery.
2. **Storm Gap** — 16 rings, a narrow dusk canyon with crosswind gusts.
3. **Lantern Field** — 14 rings at night, land by lantern light.

Through every ring: **+100** (dead centre **+150**) and **+4 fuel**.
Land on the runway at the end for **+500** plus a time bonus. Clip a wall
or the canyon floor and the parcel is scattered; run out of fuel and the
courier glides down. The HUD shows altitude, speed, heading with a compass
strip, an attitude indicator, throttle, fuel, rings and score.

## Layout

- `game/` — the playable game (static files only)
  - `game/src/config.js` — tuning, missions, palettes
  - `game/src/random.js` — seeded deterministic randomness
  - `game/src/terrain.js` — canyon, rings and runway generation
  - `game/src/plane.js` — flight physics and the chase-view aircraft
  - `game/src/rings.js` — ring pass detection and drawing
  - `game/src/render.js` — pseudo-3D canyon renderer
  - `game/src/hud.js` — instruments and menu screens
  - `game/src/input.js` — keyboard and mouse
  - `game/src/audio.js` — synthesized engine and effects (WebAudio)
  - `game/src/main.js` — state machine and fixed-step loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`
- `screenshots/` — three real renders of the game (title, flight, landing)

## License

MIT — see [LICENSE](LICENSE).
