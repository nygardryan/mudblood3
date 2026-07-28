/* Trenchworks: WW2 — external sprite pack loader.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   The other half of the seam sprite-cache.js describes. Every cached bitmap in
   the game is a procedural draw baked into an offscreen canvas; a sprite pack
   swaps that bitmap for an artist's PNG. Nothing about the blit changes — a
   record here has the exact shape makeSprite() returns ({img, w, h, ax, ay}),
   and `img` being an <img> rather than a <canvas> is invisible to drawImage.

   Two rules hold this together:

   - CHECK EXTERNAL FIRST, and never let an external record into _spriteCache.
     `sprite()` re-bakes any record whose `ss` doesn't match the current
     supersample, and a per-instance corpse record carries the same guard; an
     <img> has one fixed resolution and would be re-baked forever. Every call
     site asks SPRITES.get() *before* it reaches the cache, so sprite-cache.js
     needed no changes at all.
   - MISSING IS NORMAL. No pack, a half-finished pack, one deleted PNG — each
     falls straight through to the procedural art with no console noise, the
     same contract audio.js gives a missing .ogg. With no pack installed the
     game runs the code it ran before this file existed: get() returns null on
     an empty Map before it touches anything.

   Facing is NOT part of an id. The procedural soldier bakes 48 directional
   frames because much of a man's belt kit is screen-fixed rather than
   face-relative; a pack ships ONE image per unit and the engine rotates it at
   blit. Art is authored in the same local frame its painter draws in, so the
   rotation each call site already passes is the rotation the sprite wants. */
'use strict';

const CUSTOM_SPRITES_KEY = 'useCustomSprites';

const SPRITES = (() => {
  const BASE = 'assets/sprites/';
  const MANIFEST = 'manifest.json';

  // id -> {img, w, h, ax, ay}. Empty unless a pack is installed, which is what
  // makes get() free on the hot path.
  const recs = new Map();
  let enabled = localStorage.getItem(CUSTOM_SPRITES_KEY) !== '0';
  let state = 'idle';        // idle | loading | ready | none  ('none' = no pack found)
  let loading = null;
  let listed = 0;            // sprites the manifest named, incl. ones that failed to load
  let ppu = 0;               // px per world unit the pack was authored at (advisory)

  // Every other consumer asks get() afresh each frame and picks up a change for
  // free. The two layers that hold BAKED pixels — the decals (js/render-decals.js)
  // and the ground itself (js/render-ground.js) — are the ones that have to be
  // told, since neither redraws on its own. `deliberate` separates a player
  // flipping the pack on from one merely finishing its load: only the ground
  // cares, and refreshGroundArt is where the reason is written down.
  function bakedLayersDirty(deliberate) {
    if (typeof invalidateDecals === 'function') invalidateDecals();
    if (typeof refreshGroundArt === 'function') refreshGroundArt(deliberate);
  }

  function recordFrom(id, m) {
    const w = +m.w, h = +m.h;
    if (!(w > 0) || !(h > 0)) return null;
    const ax = Number.isFinite(+m.ax) ? +m.ax : w / 2;
    const ay = Number.isFinite(+m.ay) ? +m.ay : h / 2;
    return { img: null, w, h, ax, ay, id };
  }

  async function loadOne(id, m) {
    const rec = recordFrom(id, m);
    if (!rec) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = BASE + (m.file || (id + '.png'));
    try {
      await img.decode();     // throws on 404 or a corrupt file
    } catch (_) {
      return;                 // silent: this one sprite stays procedural
    }
    rec.img = img;
    recs.set(id, rec);
  }

  async function load() {
    if (loading) return loading;
    state = 'loading';
    loading = (async () => {
      let man = null;
      try {
        const res = await fetch(BASE + MANIFEST);
        if (!res.ok) throw new Error(res.statusText);
        man = await res.json();
      } catch (_) {
        state = 'none';       // no pack installed — the common case, not an error
        return;
      }
      const table = (man && man.sprites) || {};
      listed = Object.keys(table).length;
      ppu = +man.px_per_unit || 0;
      await Promise.all(Object.entries(table).map(([id, m]) => loadOne(id, m)));
      state = 'ready';
      bakedLayersDirty();          // the pack landed after the field was stamped
    })();
    return loading;
  }

  // The hot-path accessor. Null means "draw it procedurally".
  function get(id) {
    if (!enabled || recs.size === 0) return null;
    return recs.get(id) || null;
  }

  function has(id) { return get(id) != null; }

  function setEnabled(on) {
    enabled = !!on;
    localStorage.setItem(CUSTOM_SPRITES_KEY, enabled ? '1' : '0');
    if (typeof viewDirty !== 'undefined') viewDirty = true;
    bakedLayersDirty(true);
    return enabled;
  }

  function isEnabled() { return enabled; }

  // Install a record built in-page rather than fetched — the export tool's
  // round-trip check uses this to prove a baked sprite reloads to the same art.
  function register(id, rec) {
    if (!rec || !rec.img) return false;
    recs.set(id, { img: rec.img, w: rec.w, h: rec.h, ax: rec.ax, ay: rec.ay, id });
    bakedLayersDirty(true);
    return true;
  }

  function unregister(id) {
    const had = recs.delete(id);
    bakedLayersDirty(true);
    return had;
  }

  // Run fn with the pack switched off. The exporter bakes the PROCEDURAL art,
  // and several of its recipes call the game's own draw functions — without
  // this, exporting with a pack installed would re-encode the pack.
  function suspend(fn) {
    const was = enabled;
    enabled = false;
    try { return fn(); } finally { enabled = was; }
  }

  function status() {
    return {
      enabled, state, listed, pxPerUnit: ppu,
      count: recs.size,
      loaded: [...recs.keys()].sort(),
    };
  }

  return { load, get, has, setEnabled, isEnabled, register, unregister, suspend, status, BASE };
})();

SPRITES.load();

/* ---- sprite ids -------------------------------------------------------- */
/* An id is the pack's filename stem, and the single vocabulary shared by the
   draw sites and the exporter — so a sprite the exporter emits is a sprite the
   loader looks for, by construction. Type keys are globally unique across
   UNIT_TYPES/ENEMY_TYPES (rifleman vs erifle, sherman vs panzer), so no side
   suffix is needed; a suffix appears only where one type has two looks. */

// only a medic's weapon presence depends on `armed`; nothing else does
function spriteArmSuffix(a) {
  return (a.type === 'medic' && !a.armed) ? '_unarmed' : '';
}

function soldierSpriteId(a) { return 'soldier_' + a.type + spriteArmSuffix(a); }
function proneSpriteId(a) { return 'prone_' + a.type + spriteArmSuffix(a); }
function tankHullSpriteId(a) { return 'tank_' + a.type + '_hull'; }
function tankTurretSpriteId(a) { return 'tank_' + a.type + '_turret'; }
function jeepHullSpriteId(a) { return 'jeep_' + a.type + '_hull'; }
function jeepGunSpriteId(a) { return 'jeep_' + a.type + '_gun'; }
function bikeSpriteId(a) { return 'bike_' + a.type; }
function v2HullSpriteId(a) { return 'v2_' + a.type + '_hull'; }
function v2RailSpriteId(a) { return 'v2_' + a.type + '_rail'; }
function halftrackSpriteId(e) { return 'halftrack_' + e.type + (e.unloaded ? '_unloaded' : '_loaded'); }
function corpseSpriteId(cp) { return 'corpse_' + (cp.nation || (cp.side === 'us' ? 'us' : 'de')); }

// Blood splats, pools and craters. Three ids for the whole ground layer, because
// a mark's variation is its size and angle rather than its art (js/damage.js).
function groundMarkSpriteId(m) { return 'mark_' + m.type; }

// The terrain under all of it: one plate per biome, keyed on the faction the
// biome is keyed on (js/render-ground.js), plus the deploy trench cut through
// it. These are the only ids in the pack that are baked once per run instead of
// blitted per frame — see refreshGroundArt for what that costs.
function terrainSpriteId(f) { return 'terrain_' + f; }
function terrainTrenchSpriteId(f) { return 'terrain_' + f + '_trench'; }

// A defense's look changes as an engineer fortifies it, so the tier is part of
// the id: base / _fortified / _hardened, matching the `up`/`up2` flags the draw
// functions read. Two kinds don't redraw for a tier at all (a mine, and the camo
// nest's ground layer — its net is what thickens), and listing them here is what
// keeps the draw guard and the exporter asking for the same file: a kind that
// ships one image must not be looked up under three names.
const DEFENSE_SPRITE_TIERS = {
  wire: 3, sandbags: 3, bunker: 3, watchtower: 3,
  camonest_base: 1, camonest_canopy: 3, ammocrate: 3, dummy: 3, mine: 1,
};

function defenseSpriteId(kind, up, up2) {
  if ((DEFENSE_SPRITE_TIERS[kind] || 1) < 2) return 'defense_' + kind;
  return 'defense_' + kind + (up2 ? '_hardened' : up ? '_fortified' : '');
}
