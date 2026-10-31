# DOCKSTAR

*A 1980s docking shooter — stack your ship, break the swarm.*

DOCKSTAR is an original homage to the docking arcades of 1980 (the spirit of
games like Moon Cresta, with zero copied assets): a vertical shoot 'em up
built around one idea — **your ship is a stack**.

**v1.1 “widescreen & color”**: the playfield now adapts to your screen —
400×300 widescreen on landscape/desktop displays, 240×320 portrait on phones,
switching live — with a **fullscreen** button (or **F**; in sandboxed readers
it falls back to a maximized view). Every enemy family got its own color and
bigger, shaded sprites, the bosses their own palettes, and space gained a
cratered moon and colored parallax stars.

## The docking idea

You start with a lone **FIGHTER**. After every boss, a module drifts down
through the debris: catch it to dock it and grow. But a hit only destroys the
**top module** — you keep flying whatever is left.

| Stack | Flies like | Fires |
|-------|-----------|-------|
| `F` fighter | fast, tiny | single shot |
| `F+C` | medium | twin cannons |
| `F+C+R` full stack | slow, tall, risky | twin + diagonal spread |
| `C` or `C+R` (fighter lost) | steady | twin (+ heavy center) |
| `R` alone (last one standing) | slow | heavy shots, double damage |

Bigger stacks hit harder but are easier to hit — the classic risk/reward of
the genre. Perfect docking (aligned within 3 px) pays **1000** points.

## The swarm

Five enemy types per wave set — drones, sine-weaving moths, telegraphed
diving darts, volley-firing spitters and splitters that break into homing
minis — then a **boss**, and the bosses keep growing: **GATEKEEPER**,
**GEMINI**, the serpent **OUROBOROS** and the fortress **BASTION**, cycling
again with MK-II stats, more turrets, walls and spirals. How far can one
stack go?

3 lives, extra ships at 20 000 then every 50 000 points, hi-score kept
locally.

## Controls

- **Arrows / WASD / ZQSD** — move · **Space / X / K** — fire (hold for autofire)
- Touch: **drag** to fly (autofire while touching)
- **F** or the header button — fullscreen (maximized fallback where blocked)
- **P** pause · **M** mute · **H** how to play (title screen)
- Title: fire / tap to start. Game over: fire / tap to retry, **T** menu.

Interface in **English** (default), **French** and **Spanish**.

## Run locally

Everything is static and self-contained (no network, no audio files — every
sound is synthesized live with WebAudio). `index.html` is the published
autonomous bundle required by LOB7 (all styles and scripts inlined, zero
external reference); it is **generated** from `index.src.html` +
`assets/*.js|css` — never edit it by hand. The build tool and the Node test
suite live in the Z Code workshop (outside this repository).

```bash
python -m http.server 8127       # then open http://localhost:8127/
```

## Tests

The engine (`assets/engine.js`) is pure JavaScript shared by the browser
game and the Node test suite: module stack statistics and tear-down order,
docking precision bonuses, wave-plan generation, boss scaling (HP frozen at
stage 8), serpent connectivity, touch steering, scoring and extra lives,
determinism of the seeded simulation, plus i18n/font coverage (every UI
string in EN/FR/ES renders with the built-in 5×7 bitmap font).

## Project structure

```
index.src.html       HTML source (development references)
assets/style.css     manga paper page (ink / white / vermillion)
assets/font.js       5x7 bitmap arcade font (data + mapper)
assets/sprites.js    pixel sprites (player modules, enemies, serpent, parts)
assets/audio.js      WebAudio synth (all sound effects)
assets/i18n.js       EN / FR / ES strings
assets/engine.js     pure simulation (browser + Node)
assets/game.js       canvas rendering, input, screens
index.html           autonomous published bundle (generated)
LOB7-GAME.json       LOB7 manifest
LOB7-ATTRIBUTION.json LOB7 attribution (schema v1)
cover.png            cover (rendered from the game's own sprites and font)
```

`window.__dockstar` exposes a small read-only introspection hook
(`st`, `screen`, `paused`, `start()`, `paint()`) used for QA screenshots.

## Credits & license

A game by Cédric Bernadac, created with AI agents (Z Code & Kimi K3.1 Pro).
Code under the [MIT license](LICENSE). Produced automatically with Z Code in
the Z Code game workshop; see `LOB7-ATTRIBUTION.json` for contributions.
