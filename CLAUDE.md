# Trenchworks: WW2 — agent notes

WW2 squad-defense game. Plain HTML5 Canvas + vanilla JS, **no build step, no
package.json, no test framework**. Scripts in `js/` share one global scope and
load in dependency order via `index.html` (`main.js` second-to-last,
`test-api.js` last). See README.md for gameplay and the per-file map.

## Running it

Serve statically — `.claude/launch.json` already defines a `static-server`
config (python3 http.server). Use the preview/browser tooling, not Bash.

## Testing — use `window.TEST`

**Do not try to test this game visually or via the DOM.** Known environment
gotchas, discovered the hard way:

- **Screenshots time out** — the continuous rAF render loop keeps the
  compositor busy, so screenshot capture never settles.
- **The accessibility tree is blind** — all gameplay is canvas pixels;
  `read_page` sees ~2 of the ~70 real buttons and none of the game.
- **The game loop is frozen under automation** — hidden tabs throttle
  `requestAnimationFrame` to a standstill, so after starting a game,
  `G.time` never advances on its own.

The in-page harness `js/test-api.js` (global `TEST`) packages the workarounds.
Drive it via JS execution in the game tab; every call returns plain JSON.

```js
TEST.help()                        // API + valid level ids / difficulties / unit & enemy keys
TEST.start('endless', 'easy')      // validated start — THROWS on bad ids
                                   // (bare startGame() silently falls back to endless!)
TEST.deploy('gunner', 0.5, 0.75)   // free placement; (0..1] coords = fractions of field
TEST.step(30)                      // advance 30 sim-seconds (pumps update() manually), redraws
TEST.state()                       // {mode, phase, wave, tp, kills, breaches, units, enemies, ...}
TEST.stepUntil(g => g.kills > 0, 60)
TEST.spawnEnemy('panzer', 0.5, 0.1)  // defense modes only
TEST.reset()                       // back to main menu
```

`deploy`/`spawnEnemy` accept off-field coords (they don't block) but return
`offField: true` with a `warning` when a placement lands outside the playable
field — check it so a typo'd coordinate doesn't silently sit a unit off-screen.
Negative y above the top edge is valid *staging* for `spawnEnemy` (enemies march
in from there), so it isn't flagged; for defenders it is.

Assault/axis campaign levels (attacker modes — sides are **inverted**: your
men live in `G.enemies`, scripted defenders in `G.units`):

```js
TEST.start('axis1')                // build phase; attacker types come from ENEMY_TYPES ('erifle', ...)
TEST.deploy('erifle', 0.5, 0.05)   // deploy attackers in the top strip
TEST.startWave()                   // diagnoses instead of silently no-oping
// note: G.kills does NOT count attacker deaths in these modes — watch
// unit/enemy counts, breaches, or G.over instead:
TEST.stepUntil(g => g.over || g.breaches > 0 || !g.enemies.some(e => !e.dead), 120)
```

Useful internals when TEST isn't enough: game state is the global `G`
(`js/state.js:105` for its shape), `update(dt)` steps the sim, `draw()`
renders, level catalog is `LEVELS`, unit catalogs are `UNIT_TYPES` /
`ENEMY_TYPES` (internal keys, not README display names).
