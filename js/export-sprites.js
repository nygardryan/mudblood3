/* Trenchworks: WW2 — sprite pack exporter.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   Renders every drawable in the game to a transparent PNG and hands the lot back
   as one ZIP, so an artist has a correctly-sized, correctly-anchored reference
   for each thing they're replacing. The ZIP's manifest.json is the SAME file
   js/sprites.js reads, so the round trip is: export → unzip into assets/sprites/
   → repaint the PNGs in place → reload.

   Three things make an export match the running game rather than approximate it:

   - It bakes through the very painters the game draws with, at the same world
     footprints and anchors makeSprite() uses, so a repainted PNG lands on the
     same pixels the procedural art occupied.
   - It runs with the pack SUSPENDED (SPRITES.suspend), or exporting on top of an
     installed pack would re-encode that pack instead of the procedural art.
   - It swaps the mutable globals `ctx` and `G` the way codex.js's renderPortrait
     does, since some recipes call the game's own draw functions. `G.time` is
     pinned to 0 so anything that breathes or pulses exports at a fixed phase. */
'use strict';

// Device pixels per world unit for exported art. Four is the point where a
// 48-unit soldier lands on a 192px sprite — enough room for an artist to work
// over, and still an exact power-of-two downscale to the 1:1 desktop blit.
const EXPORT_SS = 4;

/* ---- the definition table ---------------------------------------------- */

// Rebuilt on every export rather than cached: the roster it walks is fixed, and
// building it fresh means a type added to constants.js shows up without anyone
// remembering this file exists.
function spriteDefs() {
  const defs = [];
  const add = (d) => { defs.push(d); return d; };

  /* soldiers ------------------------------------------------------------- */
  // The box is the live bake's, so a repainted man occupies the same ground.
  // Bosses are painted through the same dispatch (paintGermanBoss scales the
  // whole body by BOSS_SPRITE_SCALE), which needs a wider box to hold them.
  const soldierBox = (t) => (t.boss || t.germanBoss ? 76 : SOLDIER_SPR);

  const soldierDef = (key, side, unarmed) => {
    const t = side === 'us' ? UNIT_TYPES[key] : ENEMY_TYPES[key];
    const box = soldierBox(t);
    add({
      id: 'soldier_' + key + (unarmed ? '_unarmed' : ''),
      dir: 'soldiers',
      w: box, h: box, ax: box / 2, ay: box / 2,
      orientation: 'weapon along +x; the engine blits at rot = face',
      gunTip: t.gun || 0,
      bake: (c) => {
        const a = exportActor(key, side);
        if (unarmed) a.armed = false;
        a.face = 0;
        paintSoldierBody(c, a);
      },
    });
    // A prone frame is already a canonical pose rotated at blit, so it maps to a
    // sprite one-to-one — but only for the men the sim can actually put down.
    if (exportCanGoProne(t)) {
      add({
        id: 'prone_' + key + (unarmed ? '_unarmed' : ''),
        dir: 'prone',
        w: PRONE_SPR, h: PRONE_SPR, ax: PRONE_SPR_A, ay: PRONE_SPR_A,
        orientation: 'body along +x; the engine blits at rot = face',
        bake: (c) => {
          const a = exportActor(key, side);
          if (unarmed) a.armed = false;
          a.face = 0;
          paintProneBody(c, a);
        },
      });
    }
  };

  const tankDefs = (key, side) => {
    const t = side === 'us' ? UNIT_TYPES[key] : ENEMY_TYPES[key];
    add({
      id: 'tank_' + key + '_hull', dir: 'vehicles',
      w: TANK_SPR, h: TANK_SPR, ax: TANK_SPR_A, ay: TANK_SPR_A,
      orientation: 'hull at its home heading; the engine blits at rot = (hull angle - home)',
      bake: (c) => paintTankHull(c, exportActor(key, side)),
    });
    // a casemate carries its gun in the hull and has no turret to draw
    if (!t.casemate) {
      add({
        id: 'tank_' + key + '_turret', dir: 'vehicles',
        w: TANK_SPR, h: TANK_SPR, ax: TANK_SPR_A, ay: TANK_SPR_A,
        orientation: 'barrel along +x; the engine blits at rot = turret bearing',
        bake: (c) => paintTankTurret(c, exportActor(key, side)),
      });
    }
  };

  const jeepDefs = (key, side) => {
    add({
      id: 'jeep_' + key + '_hull', dir: 'vehicles',
      w: JEEP_SPR, h: JEEP_SPR, ax: JEEP_SPR_A, ay: JEEP_SPR_A,
      orientation: 'hull at its home heading; the engine blits at rot = (hull angle - home)',
      bake: (c) => paintJeepHull(c, exportActor(key, side)),
    });
    add({
      id: 'jeep_' + key + '_gun', dir: 'vehicles',
      w: JEEP_SPR, h: JEEP_SPR, ax: JEEP_SPR_A, ay: JEEP_SPR_A,
      orientation: 'barrel along +x; the engine blits at rot = face',
      bake: (c) => paintJeepGun(c, exportActor(key, side)),
    });
  };

  /* the player's roster --------------------------------------------------- */
  for (const key of Object.keys(UNIT_TYPES)) {
    const t = UNIT_TYPES[key];
    if (t.tank) { tankDefs(key, 'us'); continue; }
    if (t.vehicle) { jeepDefs(key, 'us'); continue; }
    if (t.atgun) {
      add({
        id: 'emplacement_' + key, dir: 'emplacements',
        w: 52, h: 68, ax: 26, ay: 34,
        orientation: 'barrel up -y, trails down +y; the engine blits at rot = (turret + PI/2)',
        note: 'the ground shadow and the crewman standing behind the piece stay procedural — the crewman rides outside this image',
        bake: (c) => paintATGun(c, exportActor(key, 'us')),
      });
      continue;
    }
    if (t.aagun) {
      add({
        id: 'emplacement_' + key + '_base', dir: 'emplacements',
        w: 48, h: 40, ax: 24, ay: 20,
        orientation: 'upright; the outriggers are staked down and never rotate',
        bake: (c) => paintAAGunBase(c),
      });
      add({
        id: 'emplacement_' + key + '_mount', dir: 'emplacements',
        w: 40, h: 52, ax: 20, ay: 26,
        orientation: 'barrels up -y; the engine blits at rot = (turret + PI/2)',
        note: 'the ground shadow and the loader crouched at the rear stay procedural',
        bake: (c) => paintAAGunMount(c, exportActor(key, 'us')),
      });
      continue;
    }
    soldierDef(key, 'us', false);
    // a medic is the one man whose look depends on being armed
    if (key === 'medic') soldierDef(key, 'us', true);
  }

  /* every enemy army ------------------------------------------------------ */
  for (const key of Object.keys(ENEMY_TYPES)) {
    const t = ENEMY_TYPES[key];
    if (t.shipPart || t.bossPart || t.trainPart) continue;   // handled with their parent below
    if (t.ship || t.hordeBoss || t.itaBoss || t.awalker) continue;
    if (t.tank) { tankDefs(key, 'de'); continue; }
    if (t.vehicle && !t.apc && !t.bike) { jeepDefs(key, 'de'); continue; }
    if (t.apc) {
      for (const unloaded of [false, true]) {
        add({
          id: 'halftrack_' + key + (unloaded ? '_unloaded' : '_loaded'), dir: 'vehicles',
          w: HALFTRACK_SPR, h: HALFTRACK_SPR, ax: HALFTRACK_SPR_A, ay: HALFTRACK_SPR_A,
          orientation: 'upright, nose down +y; blitted unrotated',
          note: 'the procedural body is baked per facing because the bow MG swivels with the crew; a pack ships one image and the MG stops swivelling',
          bake: (c) => {
            const e = exportActor(key, 'de');
            e.face = Math.PI / 2;
            e.unloaded = unloaded;
            paintHalftrackBody(c, e);
          },
        });
      }
      continue;
    }
    if (t.bike) {
      add({
        id: 'bike_' + key, dir: 'vehicles',
        w: BIKE_SPR, h: BIKE_SPR, ax: BIKE_SPR_A, ay: BIKE_SPR_A,
        orientation: 'upright; the engine blits at rot = the weave lean',
        bake: (c) => paintBikeBody(c, exportActor(key, 'de')),
      });
      continue;
    }
    if (t.v2) {
      add({
        id: 'v2_' + key + '_hull', dir: 'vehicles',
        w: V2_SPR, h: V2_SPR, ax: V2_SPR_A, ay: V2_SPR_A,
        orientation: 'hull at its home heading; blitted unrotated',
        bake: (c) => paintV2Hull(c, exportActor(key, 'de')),
      });
      add({
        id: 'v2_' + key + '_rail', dir: 'vehicles',
        w: V2_SPR, h: V2_SPR, ax: V2_SPR_A, ay: V2_SPR_A,
        orientation: 'rail along +x; the engine blits at rot = firing bearing',
        note: 'the round being craned on and the launch flame stay procedural',
        bake: (c) => paintV2Rail(c, exportActor(key, 'de')),
      });
      continue;
    }
    soldierDef(key, 'de', false);
  }

  /* the Yamato ------------------------------------------------------------ */
  // Her belt sections are pure hitboxes drawn inside the hull image, so only
  // three pieces of her are ever painted.
  add({
    id: 'yamato_hull', dir: 'bosses',
    w: YAM_SPR_W, h: YAM_SPR_H, ax: YAM_SPR_W / 2, ay: YAM_SPR_H / 2,
    orientation: 'broadside, bow along -x',
    bake: (c) => paintYamatoHull(c, exportActor('jyamato', 'de')),
  });
  add({
    id: 'yamato_turret', dir: 'bosses',
    w: YAM_TUR_SPR, h: YAM_TUR_SPR, ax: YAM_TUR_SPR_A, ay: YAM_TUR_SPR_A,
    orientation: 'barrels along +x; the engine blits at rot = the battery bearing',
    bake: (c) => paintYamatoTurret(c, exportActor('jyturret', 'de')),
  });
  add({
    id: 'yamato_tub', dir: 'bosses',
    w: YAM_TUB_SPR, h: YAM_TUB_SPR, ax: YAM_TUB_SPR_A, ay: YAM_TUB_SPR_A,
    orientation: 'gun along +x; the engine blits at rot = the tub bearing',
    bake: (c) => paintYamatoTub(c, exportActor('jymg', 'de')),
  });

  /* the Progenitor -------------------------------------------------------- */
  add({
    id: 'progenitor_body', dir: 'bosses',
    w: 104, h: 104, ax: 52, ay: 52,
    orientation: 'upright, crawling down +y; blitted unrotated',
    note: 'the breathing pulse stays procedural',
    bake: (c) => paintProgenitorBody(c, exportActor('zprogen', 'de')),
  });
  add({
    id: 'progenitor_pod', dir: 'bosses',
    w: 24, h: 24, ax: 12, ay: 12,
    orientation: 'upright; the engine scales it as the sac swells to spit',
    bake: (c) => {
      // drawProgenitorPod places itself, so give it the origin and let it
      const p = exportActor('zpod', 'de');
      p.x = 0; p.y = 0; p.spitT = 0;
      drawProgenitorPod(c, p);
    },
  });

  /* the Treno Armato ------------------------------------------------------ */
  add({
    id: 'train_engine', dir: 'bosses',
    w: 40, h: 72, ax: 20, ay: 36,
    orientation: 'nose (the cowcatcher) down +y; blitted unrotated',
    bake: (c) => paintTrainEngine(c, exportActor('itrain', 'de')),
  });
  add({
    id: 'train_wagon_turret', dir: 'bosses',
    w: 40, h: 48, ax: 20, ay: 24,
    orientation: 'upright, along the rails; blitted unrotated',
    bake: (c) => { paintTrainBogies(c, 20); paintTrainBody(c, 20, true); },
  });
  add({
    id: 'train_turret', dir: 'bosses',
    w: 72, h: 72, ax: 36, ay: 36,
    orientation: 'gun along +x; the engine blits at rot = the laid bearing',
    note: 'the muzzle flash stays procedural',
    bake: (c) => paintTrainTurret(c, {}),
  });
  for (const open of [false, true]) {
    add({
      id: 'train_wagon_infantry' + (open ? '_open' : ''), dir: 'bosses',
      w: 40, h: 48, ax: 20, ay: 24,
      orientation: 'upright, along the rails; blitted unrotated',
      bake: (c) => paintTrainInfantryWagon(c, open),
    });
  }
  add({
    id: 'train_wagon_gun', dir: 'bosses',
    w: 40, h: 48, ax: 20, ay: 24,
    orientation: 'upright, along the rails; blitted unrotated',
    note: 'the four gun posts and their crews are separate actors and stay procedural',
    bake: (c) => paintTrainGunWagon(c),
  });
  add({
    id: 'train_wagon_wrecked', dir: 'bosses',
    w: 40, h: 48, ax: 20, ay: 24,
    orientation: 'upright, along the rails; blitted unrotated',
    bake: (c) => paintWreckedWagon(c, 20),
  });

  /* the Alien Walker ------------------------------------------------------ */
  add({
    id: 'walker_awalker', dir: 'bosses',
    w: 88, h: 96, ax: 44, ay: 52,
    orientation: 'upright, feet on the ground plane at local y = ' + AW_GROUND_Y,
    note: 'exported mid-stride at phase 0; the walk cycle stays procedural',
    bake: (c) => paintAlienWalker(c, { walkT: 0, awLane: 1, awPhase: 'approach', awT: 0 }),
  });

  /* defenses -------------------------------------------------------------- */
  // Each is drawn through the game's own draw function against a stub at the
  // origin, the way the placement ghost does it — they carry no overlays, so
  // there is nothing to suppress.
  const DEFENSE_BOXES = {
    wire: [80, 32], sandbags: [60, 44], bunker: [72, 56], watchtower: [48, 48],
    camonest_base: [76, 52], camonest_canopy: [80, 52], ammocrate: [48, 44],
    dummy: [40, 40], mine: [20, 20],
  };
  const DEFENSE_DRAW = {
    wire: drawWire, sandbags: drawSandbag, bunker: drawBunker,
    watchtower: drawWatchtower, camonest_base: drawCamoNestBase,
    camonest_canopy: drawCamoNestCanopy, ammocrate: drawAmmoCrate,
    dummy: drawDummy, mine: drawMine,
  };
  for (const kind of Object.keys(DEFENSE_SPRITE_TIERS)) {
    const [w, h] = DEFENSE_BOXES[kind];
    const tiers = DEFENSE_SPRITE_TIERS[kind];
    for (let tier = 0; tier < tiers; tier++) {
      add({
        id: defenseSpriteId(kind, tier >= 1, tier >= 2), dir: 'defenses',
        w, h, ax: w / 2, ay: h / 2,
        orientation: 'upright; blitted unrotated',
        note: 'battle damage (the splintering an emplacement shows as it is shot up) stays procedural',
        bake: (c) => DEFENSE_DRAW[kind]({
          x: 0, y: 0, up: tier >= 1, up2: tier >= 2, hp: 100, maxhp: 100,
        }),
      });
    }
  }

  /* corpses and effects --------------------------------------------------- */
  // One body per army instead of a pose per type: the procedural corpse randomises
  // its pose and its dismemberment per man, which a single image cannot carry.
  for (const [nation, col] of [['us', '#4f6a3a'], ['de', '#565d67'],
    ['jp', '#6a6a44'], ['zo', '#5c6a4a'], ['it', '#7b7a54']]) {
    add({
      id: 'corpse_' + nation, dir: 'misc',
      w: CORPSE_SPR_W, h: CORPSE_SPR_H, ax: CORPSE_SPR_AX, ay: CORPSE_SPR_AY,
      orientation: 'body along +x; the engine blits at the corpse\'s fixed rot',
      note: 'the procedural corpse picks one of six poses and sometimes loses a limb; a pack ships one body per army',
      bake: (c) => paintCorpse(c, {
        side: nation === 'us' ? 'us' : 'de', nation, col, pose: 0, missing: null,
        arm1: -0.6, arm2: 0.7, leg1: -0.35, leg2: 0.3,
        twist: 0, curl: 0.85, lean: 1, face: 1,
      }),
    });
  }
  add({
    id: 'fx_canopy', dir: 'misc',
    w: CANOPY_SPR, h: CANOPY_SPR, ax: CANOPY_SPR_A, ay: CANOPY_SPR_A,
    orientation: 'overhead disc, fully deployed; the engine scales and fades it as the jumper drops',
    bake: (c) => paintCanopy(c, 1),
  });

  return defs;
}

// Mirrors tryGoProne's exemptions (js/shooting.js): crews stay in their vehicles,
// Japanese infantry are fanatics who never hit the dirt, and a boss diving would
// hand a damage sponge prone's dodge.
function exportCanGoProne(t) {
  if (t.tank || t.vehicle || t.apc || t.bike || t.fixed) return false;
  if (t.faction === 'jp') return false;
  if (t.boss) return false;
  return true;
}

// A canonical actor of this type: full health, no rank, every action timer at
// rest, facing +x. Built through the game's own factories so a painter finds
// every field it expects, then normalised so two exports of the same type are
// byte-identical (the factories seed cooldowns and wobble from Math.random).
function exportActor(key, side) {
  const a = side === 'us' ? makeUnit(key, 0, 0) : makeEnemy(key, 0, 0);
  a.x = 0; a.y = 0;
  a.hp = a.maxhp;
  a.face = 0;
  a.turret = 0;
  a.rank = 0; a.xp = 0;
  a.wobble = 0;
  a.prone = 0; a.chute = 0;
  a.grenThrowT = 0; a.mortarFireT = 0; a.shotgunBlastT = 0;
  a.flameT = 0; a.slashT = 0; a.spitT = 0; a.atgunFireT = 0;
  a.walkT = 0; a.fireT = 0; a.dropT = 0;
  a.infected = 0;
  return a;
}

/* ---- baking ------------------------------------------------------------- */

// Render one definition onto its own transparent canvas. The transform is
// makeSprite's, so the art lands exactly where the live bake puts it — only the
// density differs (EXPORT_SS rather than the display's).
function bakeSpriteCanvas(def) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(def.w * EXPORT_SS));
  cv.height = Math.max(1, Math.ceil(def.h * EXPORT_SS));
  const c = cv.getContext('2d');
  c.setTransform(EXPORT_SS, 0, 0, EXPORT_SS, def.ax * EXPORT_SS, def.ay * EXPORT_SS);

  // renderPortrait's swap, for the recipes that call the game's own draw
  // functions: those write to the module-global ctx and read G.
  const savedCtx = ctx, savedG = G;
  ctx = c;
  G = { selected: [], time: 0, cardsOwned: null, wave: 0, mode: 'export', difficulty: null };
  try {
    SPRITES.suspend(() => def.bake(c));
  } finally {
    ctx = savedCtx;
    G = savedG;
  }
  return cv;
}

// True if nothing was drawn — an all-transparent canvas means the recipe missed,
// and silently shipping a blank PNG would look like art the artist forgot.
function canvasIsBlank(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
  return true;
}

// toDataURL rather than toBlob, and NOT for convenience: toBlob hands its
// result back through a task callback, and a background tab throttles those to
// about one a second — an export of the whole roster would take minutes and look
// hung to anyone who clicked the button and switched tabs. This encodes inline.
function canvasToBytes(cv) {
  const url = cv.toDataURL('image/png');
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---- a store-only ZIP --------------------------------------------------- */
// PNGs are already deflated, so compressing them again buys nothing and would
// cost a deflate implementation. Method 0 (stored) is a length, a CRC and the
// bytes — which is why this fits in one screen and needs no dependency.

const _crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = _crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// `files` is [{name, bytes}]. Names may contain '/' — a reader makes the folders.
function makeStoreZip(files) {
  const enc = new TextEncoder();
  const entries = files.map((f) => {
    const name = enc.encode(f.name);
    return { name, bytes: f.bytes, crc: crc32(f.bytes) };
  });

  const LOCAL = 30, CENTRAL = 46, EOCD = 22;
  let size = EOCD;
  for (const e of entries) size += LOCAL + e.name.length + e.bytes.length + CENTRAL + e.name.length;

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let p = 0;
  // one fixed timestamp (1980-01-01), so two exports of the same art are two
  // identical files and a diff shows only what actually changed
  const DOS_TIME = 0, DOS_DATE = 0x0021;

  for (const e of entries) {
    e.offset = p;
    view.setUint32(p, 0x04034B50, true);        // local file header
    view.setUint16(p + 4, 20, true);            // version needed
    view.setUint16(p + 6, 0, true);             // flags
    view.setUint16(p + 8, 0, true);             // method: stored
    view.setUint16(p + 10, DOS_TIME, true);
    view.setUint16(p + 12, DOS_DATE, true);
    view.setUint32(p + 14, e.crc, true);
    view.setUint32(p + 18, e.bytes.length, true);
    view.setUint32(p + 22, e.bytes.length, true);
    view.setUint16(p + 26, e.name.length, true);
    view.setUint16(p + 28, 0, true);            // extra field length
    p += LOCAL;
    out.set(e.name, p); p += e.name.length;
    out.set(e.bytes, p); p += e.bytes.length;
  }

  const dirStart = p;
  for (const e of entries) {
    view.setUint32(p, 0x02014B50, true);        // central directory header
    view.setUint16(p + 4, 20, true);            // version made by
    view.setUint16(p + 6, 20, true);            // version needed
    view.setUint16(p + 8, 0, true);
    view.setUint16(p + 10, 0, true);
    view.setUint16(p + 12, DOS_TIME, true);
    view.setUint16(p + 14, DOS_DATE, true);
    view.setUint32(p + 16, e.crc, true);
    view.setUint32(p + 20, e.bytes.length, true);
    view.setUint32(p + 24, e.bytes.length, true);
    view.setUint16(p + 28, e.name.length, true);
    view.setUint16(p + 30, 0, true);            // extra
    view.setUint16(p + 32, 0, true);            // comment
    view.setUint16(p + 34, 0, true);            // disk number
    view.setUint16(p + 36, 0, true);            // internal attrs
    view.setUint32(p + 38, 0, true);            // external attrs
    view.setUint32(p + 42, e.offset, true);
    p += CENTRAL;
    out.set(e.name, p); p += e.name.length;
  }

  view.setUint32(p, 0x06054B50, true);          // end of central directory
  view.setUint16(p + 8, entries.length, true);
  view.setUint16(p + 10, entries.length, true);
  view.setUint32(p + 12, p - dirStart, true);
  view.setUint32(p + 16, dirStart, true);
  return out;
}

/* ---- the export --------------------------------------------------------- */

function spriteManifest(defs) {
  const sprites = {};
  for (const d of defs) {
    const m = {
      file: d.dir + '/' + d.id + '.png',
      w: d.w, h: d.h, ax: d.ax, ay: d.ay,
      orientation: d.orientation,
    };
    if (d.gunTip) m.gunTip = d.gunTip;
    if (d.note) m.note = d.note;
    sprites[d.id] = m;
  }
  return {
    format: 1,
    generated: new Date().toISOString(),
    px_per_unit: EXPORT_SS,
    readme: 'Drop this folder in as assets/sprites/. Every PNG here is the game\'s '
      + 'current procedural art, rendered on transparency at ' + EXPORT_SS + ' px per world '
      + 'unit. Repaint any of them in place at any resolution you like — w/h/ax/ay are '
      + 'WORLD units and the engine scales your image to them, so only the aspect ratio '
      + 'and the anchor matter. Delete a PNG (or its entry here) and that piece falls '
      + 'back to the procedural art. `ax`/`ay` locate the actor\'s own point inside the '
      + 'image; `gunTip` is how far along +x its rounds spawn, so a barrel should end there.',
    sprites,
  };
}

// Render every definition. `download` false renders and reports without building
// a Blob or touching the DOM, which is how the harness runs it.
async function exportSpritePack(opts = {}) {
  const download = opts.download !== false;
  const defs = spriteDefs();
  const files = [];
  const errors = [];
  const blank = [];

  for (const def of defs) {
    try {
      const cv = bakeSpriteCanvas(def);
      if (canvasIsBlank(cv)) blank.push(def.id);
      files.push({ name: def.dir + '/' + def.id + '.png', bytes: canvasToBytes(cv) });
    } catch (e) {
      errors.push({ id: def.id, message: String((e && e.message) || e) });
    }
  }

  const manifest = spriteManifest(defs.filter((d) => !errors.some((e) => e.id === d.id)));
  files.push({
    name: 'manifest.json',
    bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  });

  const zip = makeStoreZip(files);
  if (download) {
    const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trenchworks-sprites.zip';
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    ok: errors.length === 0,
    count: files.length - 1,
    bytes: zip.length,
    pxPerUnit: EXPORT_SS,
    downloaded: download,
    ids: defs.map((d) => d.id),
    blank,
    errors,
  };
}

// Bake one sprite, encode it as a PNG, load that PNG back through the loader and
// report how far the two renders drift. This is the check that the exported
// geometry is the geometry the draw path will blit at: a bad anchor or a clipped
// box shows up here as a diff, with no files written and no server involved.
async function spriteRoundtrip(id) {
  const def = spriteDefs().find((d) => d.id === id);
  if (!def) throw new Error('unknown sprite id "' + id + '" — try TEST.exportSprites({download:false}).ids');

  const baked = bakeSpriteCanvas(def);
  const bytes = canvasToBytes(baked);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }

  // draw both at the SAME transform the game blits at, then compare
  const shot = (src) => {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(def.w); cv.height = Math.ceil(def.h);
    const c = cv.getContext('2d');
    if (src === 'proc') {
      c.setTransform(1, 0, 0, 1, def.ax, def.ay);
      const sc = ctx, sg = G;
      ctx = c;
      G = { selected: [], time: 0, cardsOwned: null, wave: 0, mode: 'export', difficulty: null };
      try { SPRITES.suspend(() => def.bake(c)); } finally { ctx = sc; G = sg; }
    } else {
      c.drawImage(img, 0, 0, def.w, def.h);
    }
    return c.getImageData(0, 0, cv.width, cv.height).data;
  };

  const a = shot('proc'), b = shot('img');
  let diff = 0, lit = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] || b[i + 3]) lit++;
    diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1])
      + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]);
  }
  return {
    id, w: def.w, h: def.h, ax: def.ax, ay: def.ay,
    pngBytes: bytes.length,
    litPixels: lit,
    // mean absolute channel difference over the box, 0..255. The export is baked
    // at EXPORT_SS and compared at 1x, so a few units of resampling drift is
    // expected; tens of units means the anchor or the box is wrong.
    meanChannelDiff: +(diff / a.length).toFixed(2),
  };
}
