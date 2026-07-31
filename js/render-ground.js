/* Trenchworks: WW2 — the ground layer (terrain biomes, painted once per game).
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// device pixels per world unit to back the ground bitmap with. The ground is a
// W×H world-space layer composited under the camera zoom; on mobile that zoom
// upscales it, so we render it at enough real pixels to stay crisp at the
// resting (cover) zoom. Pinching in further softens it gracefully. Desktop
// draws 1:1, and the factor is capped to bound the bitmap's memory.
function groundRenderScale() {
  if (!mobileViewActive()) return 1;
  const displayDensity = canvas.width * coverZoom() / W;
  return clamp(Math.ceil(displayDensity), 1, 4);
}

// ── biomes ──────────────────────────────────────────────────────────────────
// Each endless faction fights on its own ground, so a run reads as a theatre and
// not just a different set of sprites. newGame sets G.enemyFaction immediately
// BEFORE it calls paintGround, so the biome is resolved once, baked into the
// ground bitmap, and costs the running sim nothing — no draw call anywhere else
// needs to know which one is up. Every non-endless mode (tutorials, campaigns)
// reports 'de', so the Western Front field everything was authored against is
// untouched by all of this.
//
// A biome is: a base fill, the mottle blobs stirred into it, a `detail` pass for
// the signature terrain, and the colours of the deploy trench cut through it.
// Nothing here is load-bearing for gameplay — the ground is pure decoration, and
// blood/craters (js/damage.js) are translucent, so they sit correctly on any base.
const GROUND_BIOMES = {
  // the Wehrmacht's Western Front: churned farm mud under patchy grass
  de: {
    base: '#5c5a3f',
    mottle: [
      'rgba(90,88,60,0.25)', 'rgba(78,76,52,0.25)', 'rgba(104,100,66,0.2)',
      'rgba(70,66,46,0.22)', 'rgba(96,94,58,0.18)',
    ],
    detail: paintWesternFrontDetail,
    trench: { lip: 'rgba(46,42,28,0.85)', cut: 'rgba(30,27,18,0.9)', plank: 'rgba(74,60,38,0.9)' },
  },
  // the Imperial Japanese Army's Pacific island: black volcanic sand, ash flows,
  // jungle rot and fallen fronds. The darkest field of the four.
  jp: {
    // ASHEN, not jungle-green. A dark green floor was tried first and it
    // camouflaged the player's own olive-drab troops — same hue, same value,
    // and picking your men out is the whole game. The green lives in the
    // undergrowth scattered on top instead, which is where it reads anyway.
    base: '#6a6a58',
    // low-contrast: broad dark blobs here read as CAMOUFLAGE, since they're the
    // same shape family as the mottle above them, just bigger
    mottle: [
      'rgba(96,98,80,0.18)', 'rgba(74,76,62,0.2)', 'rgba(86,94,68,0.16)',
      'rgba(58,60,50,0.16)', 'rgba(110,110,94,0.14)',
    ],
    detail: paintIslandDetail,
    trench: { lip: 'rgba(32,32,24,0.85)', cut: 'rgba(18,18,14,0.9)', plank: 'rgba(122,112,68,0.8)' },
  },
  // The Horde's blight: dead grey earth cracked open, rot standing in the hollows,
  // and the bones of whatever came through before you.
  zo: {
    base: '#4a4740',
    mottle: [
      'rgba(60,56,50,0.3)', 'rgba(38,36,32,0.32)', 'rgba(70,72,54,0.18)',
      'rgba(54,50,46,0.28)', 'rgba(80,76,68,0.16)',
    ],
    detail: paintBlightDetail,
    trench: { lip: 'rgba(44,42,38,0.85)', cut: 'rgba(26,25,22,0.9)', plank: 'rgba(92,88,76,0.85)' },
  },
  // the Regio Esercito's North Africa: open ochre desert, wind ripples, loose
  // stone and dry scrub. The brightest field, and the most open-looking.
  it: {
    base: '#82704a',
    // faint, for the same reason as the island's: sand is a fine grain with
    // ripples over it, and mottle at the Western Front's alpha reads as paint
    mottle: [
      'rgba(146,128,84,0.13)', 'rgba(112,96,60,0.15)', 'rgba(96,82,52,0.15)',
      'rgba(158,142,100,0.1)', 'rgba(128,110,68,0.12)',
    ],
    detail: paintDesertDetail,
    trench: { lip: 'rgba(74,62,38,0.8)', cut: 'rgba(50,42,26,0.88)', plank: 'rgba(130,114,74,0.9)' },
  },
};

function groundBiome() {
  return GROUND_BIOMES[enemyFaction()] || GROUND_BIOMES.de;
}

// ── ground art: the sprite-pack seam for a biome ────────────────────────────
// A biome's four procedural passes collapse into TWO flat plates a pack can
// replace (js/sprites.js), and they are two rather than one because they are
// separately useful: an artist may repaint the field and keep the engine's
// trench, or cut a hand-drawn trench through ground that is still procedural.
// Each falls through on its own, the way every other sprite in the pack does.
//
//   terrain_<f>         the whole playable field, blitted at the origin and
//                       stretched to W×H. Opaque — it is the bottom of the frame.
//   terrain_<f>_trench  the deploy strip, laid over the field at TRENCH_SPR_X.
//
// Unlike everything else in the pack these are baked ONCE per run into
// groundCanvas rather than blitted per frame, and that costs two things a
// per-frame sprite gets for free: a pack that finishes loading after the field
// was painted has to ask for a repaint (refreshGroundArt), and a repaint is only
// safe while the bitmap is still clean — see there.
const TRENCH_SPR_X = DEPLOY_X - 5;   // leftmost pixel the procedural trench touches (a plank)
const TRENCH_SPR_W = 16;             // through to DEPLOY_X + 11, the far side of the lip

// what the ground bitmap currently on screen was painted from. Compared rather
// than assumed, so toggling a pack that has no ground art in it never reshuffles
// a procedural field for nothing.
let groundArt = null;

function groundArtState(f) {
  return {
    faction: f,
    field: SPRITES.has(terrainSpriteId(f)),
    trench: SPRITES.has(terrainTrenchSpriteId(f)),
  };
}

function paintGround(level) {
  // (re)size the ground bitmap for the current display density, then pre-scale
  // the context so all world-coordinate drawing — here and the runtime wrecks,
  // craters and blood painted into gctx later — lands at the higher resolution
  const scale = groundRenderScale();
  groundCanvas.width = Math.round(W * scale);
  groundCanvas.height = Math.round(H * scale);
  gctx.setTransform(scale, 0, 0, scale, 0, 0);

  const biome = groundBiome();
  const art = groundArtState(enemyFaction());
  groundArt = art;

  if (art.field) gctx.drawImage(SPRITES.get(terrainSpriteId(art.faction)).img, 0, 0, W, H);
  else paintBiomeField(biome);

  if (art.trench) {
    gctx.drawImage(SPRITES.get(terrainTrenchSpriteId(art.faction)).img,
      TRENCH_SPR_X, 0, TRENCH_SPR_W, H);
  } else {
    paintBiomeTrench(biome);
  }
}

// The base fill and everything stirred into it. Split out of paintGround so the
// exporter can bake the same pass onto its own canvas — an artist paints over
// the exact field they are replacing.
function paintBiomeField(biome, g = gctx) {
  g.fillStyle = biome.base;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = pick(biome.mottle);
    g.beginPath();
    g.ellipse(rand(0, W), rand(0, H), rand(4, 18), rand(3, 10), rand(0, 3), 0, 7);
    g.fill();
  }
  biome.detail(g);
}

// The trench line marking your deploy zone — a vertical strip now that the
// field runs left to right. `ox` shifts it off DEPLOY_X, which is how the
// exporter bakes a 16px strip rather than a full-width plate.
function paintBiomeTrench(biome, g = gctx, ox = 0) {
  const x = DEPLOY_X + ox;
  const t = biome.trench;
  g.fillStyle = t.lip;
  g.fillRect(x - 3, 0, 14, H);
  g.fillStyle = t.cut;
  g.fillRect(x, 0, 7, H);
  for (let y = 8; y < H; y += 26) {
    g.fillStyle = t.plank;
    g.fillRect(x - 5, y, 4, 12);
  }
}

// A pack landed, or was toggled, after the field was baked. This is the ground's
// half of what invalidateDecals (js/render-decals.js) does for the decal layer —
// but a ground bitmap cannot simply be rebuilt on demand the way that one can.
// Wrecks, blast scorch and blown emplacements are stamped into it permanently as
// the fight goes on and are recorded NOWHERE ELSE, so a repaint costs the run its
// own history. Hence the two callers being told apart:
//
// - the pack finishing its load is not something the player did, and silently
//   wiping a wave-40 field's wrecks for it would be indefensible. It repaints
//   only while the bitmap is still clean, which G.time answers exactly rather
//   than conservatively: every one of those stamps needs combat to have
//   happened. So a pack that arrives before the first tick lands on the run in
//   progress, and one that arrives later waits for the next newGame.
// - flipping ART OFF/ON is a deliberate act whose whole point is to re-render,
//   and a ground that stubbornly kept the artist's field while every man on it
//   went procedural would read as the toggle being broken. That one forces it.
//
// Either way the state comparison runs FIRST, so a pack carrying no ground art —
// the common case, since terrain is the one thing an artist can skip entirely —
// never reshuffles a procedural field or costs a single wreck.
function refreshGroundArt(force) {
  if (!G || !groundArt) return;
  const next = groundArtState(enemyFaction());
  if (next.faction === groundArt.faction && next.field === groundArt.field
    && next.trench === groundArt.trench) return;
  if (!force && G.time > 0) return;
  paintGround(G.level);
  // the stamp log (js/save.js) means a forced repaint no longer costs the run
  // its wrecks — replay them onto the fresh bitmap
  replayGroundStamps(G.groundStamps || []);
}

// ── biome detail passes ─────────────────────────────────────────────────────

function paintWesternFrontDetail(g) {
  // grass tufts
  for (let i = 0; i < 240; i++) {
    g.strokeStyle = 'rgba(84,96,50,0.6)';
    g.lineWidth = 1;
    const x = rand(0, W), y = rand(0, H);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rand(-2, 2), y - rand(2, 5));
    g.stroke();
  }
}

function paintIslandDetail(g) {
  // NO broad canopy-shade ellipses here. Tried twice, at 0.3 and at 0.1: they
  // are the same shape as the mottle, only bigger, so the eye groups them with
  // it and the field reads as a camouflage pattern rather than as ground. There
  // is no alpha that fixes that — below ~0.08 they simply stop existing.
  // Tonal variation is the mottle's job; the island's character is the ash,
  // grit and undergrowth below.
  //
  // scorched volcanic ash: small and black, so it reads as burnt ground
  for (let i = 0; i < 130; i++) {
    g.fillStyle = pick(['rgba(24,22,20,0.26)', 'rgba(36,34,30,0.22)']);
    g.beginPath();
    g.ellipse(rand(0, W), rand(0, H), rand(3, 13), rand(2, 8), rand(0, 3), 0, 7);
    g.fill();
  }
  // pumice and coral grit through the volcanic sand
  for (let i = 0; i < 300; i++) {
    g.fillStyle = pick(['rgba(216,212,190,0.3)', 'rgba(180,176,156,0.28)', 'rgba(140,136,122,0.28)']);
    g.beginPath();
    g.ellipse(rand(0, W), rand(0, H), rand(0.6, 1.9), rand(0.5, 1.3), rand(0, 3), 0, 7);
    g.fill();
  }
  // jungle undergrowth: CLUMPED, not scattered. Single blades at the Western
  // Front's density vanish against ground this dark — a clump is a shape.
  for (let i = 0; i < 300; i++) {
    const x = rand(0, W), y = rand(0, H);
    g.strokeStyle = pick(['rgba(84,116,44,0.6)', 'rgba(62,94,36,0.6)', 'rgba(104,132,52,0.5)']);
    g.lineWidth = 1;
    const blades = randi(5, 8);
    for (let b = 0; b < blades; b++) {
      const bx = x + rand(-4, 4), by = y + rand(-2.5, 2.5);
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + rand(-3.5, 3.5), by - rand(4, 10));
      g.stroke();
    }
  }
  // fallen palm fronds — the one silhouette that says Pacific outright
  for (let i = 0; i < 30; i++) paintPalmFrond(g, rand(0, W), rand(0, H));
}

function paintPalmFrond(g, x, y) {
  const a = rand(0, Math.PI * 2), len = rand(15, 27);
  g.strokeStyle = pick(['rgba(92,104,48,0.5)', 'rgba(70,86,38,0.55)']);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.6);
  g.stroke();
  g.lineWidth = 0.8;
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    const px = x + Math.cos(a) * len * t, py = y + Math.sin(a) * len * 0.6 * t;
    // leaflets shorten toward the tip, which is what keeps it a frond and not a fishbone
    const rib = (5.5 + rand(-1, 1)) * (1 - t * 0.55);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(a + 1.15) * rib, py + Math.sin(a + 1.15) * rib * 0.6);
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(a - 1.15) * rib, py + Math.sin(a - 1.15) * rib * 0.6);
    g.stroke();
  }
}

function paintBlightDetail(g) {
  // standing rot: the pools the dead came out of
  for (let i = 0; i < 26; i++) {
    const x = rand(0, W), y = rand(0, H), rx = rand(5, 30), ry = rx * rand(0.4, 0.75);
    g.fillStyle = 'rgba(38,46,26,0.3)';
    g.beginPath(); g.ellipse(x, y, rx, ry, rand(0, 3), 0, 7); g.fill();
    g.fillStyle = 'rgba(84,104,46,0.22)';
    g.beginPath(); g.ellipse(x, y, rx * 0.72, ry * 0.72, rand(0, 3), 0, 7); g.fill();
    g.fillStyle = 'rgba(112,132,58,0.16)';
    g.beginPath(); g.ellipse(x + rand(-3, 3), y + rand(-2, 2), rx * 0.34, ry * 0.34, 0, 0, 7); g.fill();
  }
  // the earth split open by drought
  for (let i = 0; i < 70; i++) paintFissure(g, rand(0, W), rand(0, H));
  // brittle dead grass — sparse, grey, and bent over
  for (let i = 0; i < 150; i++) {
    g.strokeStyle = pick(['rgba(104,98,78,0.45)', 'rgba(84,80,64,0.5)']);
    g.lineWidth = 1;
    const x = rand(0, W), y = rand(0, H);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rand(-4, 4), y - rand(2, 4));
    g.stroke();
  }
  // bones, and every so often a ribcage
  for (let i = 0; i < 90; i++) paintBone(g, rand(0, W), rand(0, H));
  for (let i = 0; i < 7; i++) paintRibcage(g, rand(14, W - 14), rand(14, H - 14));
}

function paintFissure(g, x, y) {
  g.strokeStyle = pick(['rgba(24,22,18,0.45)', 'rgba(32,29,25,0.4)']);
  g.lineWidth = rand(0.8, 1.7);
  g.beginPath();
  g.moveTo(x, y);
  let a = rand(0, Math.PI * 2), cx = x, cy = y;
  const segs = randi(3, 6);
  for (let i = 0; i < segs; i++) {
    a += rand(-0.7, 0.7);
    const len = rand(5, 15);
    cx += Math.cos(a) * len; cy += Math.sin(a) * len * 0.6;
    g.lineTo(cx, cy);
  }
  g.stroke();
}

function paintBone(g, x, y) {
  const a = rand(0, Math.PI * 2), len = rand(2.5, 6);
  const dx = Math.cos(a) * len, dy = Math.sin(a) * len * 0.6;
  g.strokeStyle = 'rgba(198,192,170,0.4)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x - dx, y - dy);
  g.lineTo(x + dx, y + dy);
  g.stroke();
}

// Deliberately larger and paler than a scale drawing would be. At the size the
// bones around it are drawn, the spine and its ribs merge into one dark knot
// that reads as an insect — the cage has to be big enough for daylight between
// the ribs, and pale enough to read as bone rather than as another fissure.
function paintRibcage(g, x, y) {
  const a = rand(0, Math.PI * 2), ca = Math.cos(a), sa = Math.sin(a);
  const half = rand(9, 13);
  g.strokeStyle = 'rgba(204,198,176,0.5)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x - ca * half, y - sa * half * 0.6);
  g.lineTo(x + ca * half, y + sa * half * 0.6);
  g.stroke();
  g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const t = i / 2.6, rib = 7 - Math.abs(i) * 1.3;
    const bx = x + ca * half * t, by = y + sa * half * 0.6 * t;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + Math.cos(a + 1.45) * rib, by + Math.sin(a + 1.45) * rib * 0.6);
    g.moveTo(bx, by);
    g.lineTo(bx + Math.cos(a - 1.45) * rib, by + Math.sin(a - 1.45) * rib * 0.6);
    g.stroke();
  }
}

function paintDesertDetail(g) {
  // dune shadow: broad soft bands, laid before the ripples so they read as relief
  for (let i = 0; i < 12; i++) {
    g.fillStyle = pick(['rgba(88,74,44,0.09)', 'rgba(150,134,92,0.08)']);
    g.beginPath();
    g.ellipse(rand(0, W), rand(0, H), rand(70, 170), rand(22, 55), rand(-0.3, 0.3), 0, 7);
    g.fill();
  }
  // fine sand grain, under the ripples
  for (let i = 0; i < 900; i++) {
    g.fillStyle = pick(['rgba(196,180,138,0.16)', 'rgba(92,78,48,0.14)', 'rgba(168,152,110,0.13)']);
    g.beginPath();
    g.ellipse(rand(0, W), rand(0, H), rand(0.5, 1.4), rand(0.4, 1), 0, 0, 7);
    g.fill();
  }
  // wind ripples: a lit crest with its shadow tucked under it. SHORT and angled
  // — long near-horizontal strokes read as wood grain, not sand, because the
  // field is wider than it is deep and they end up spanning it.
  for (let i = 0; i < 300; i++) paintSandRipple(g, rand(-20, W), rand(0, H));
  // loose stone
  for (let i = 0; i < 150; i++) paintDesertStone(g, rand(0, W), rand(0, H));
  // dry scrub: sparse, tan, and clumped rather than scattered like grass
  for (let i = 0; i < 70; i++) {
    const x = rand(0, W), y = rand(0, H);
    g.strokeStyle = pick(['rgba(120,110,64,0.5)', 'rgba(96,90,52,0.5)', 'rgba(140,128,80,0.4)']);
    g.lineWidth = 1;
    for (let b = 0; b < 6; b++) {
      const bx = x + rand(-3, 3), by = y + rand(-2, 2);
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + rand(-3, 3), by - rand(2, 5));
      g.stroke();
    }
  }
}

function paintSandRipple(g, x, y) {
  // ±0.3rad and 60px was still wood grain: at that spread neighbouring crests
  // stay parallel long enough to fuse end-to-end across a 540px field. Short
  // arcs at a wide spread keep the drift without ever forming a continuous line.
  const a = rand(-0.6, 0.6), len = rand(15, 44);
  const ca = Math.cos(a), sa = Math.sin(a);
  // bow the crest off its own axis rather than straight down the y — a curve
  // bulging one fixed way across the whole field lines every ripple up
  const amp = rand(2.5, 7) * (Math.random() < 0.5 ? -1 : 1);
  const cx = x + ca * len / 2 - sa * amp, cy = y + sa * len / 2 + ca * amp;
  const ex = x + ca * len, ey = y + sa * len;
  g.lineWidth = rand(1, 2);
  g.strokeStyle = 'rgba(78,64,38,0.15)';
  g.beginPath();
  g.moveTo(x, y + 1.6);
  g.quadraticCurveTo(cx, cy + 1.6, ex, ey + 1.6);
  g.stroke();
  g.strokeStyle = 'rgba(180,164,120,0.18)';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(cx, cy, ex, ey);
  g.stroke();
}

function paintDesertStone(g, x, y) {
  const r = rand(1.4, 4);
  g.fillStyle = 'rgba(46,36,20,0.22)';
  g.beginPath(); g.ellipse(x + r * 0.4, y + r * 0.5, r, r * 0.62, 0, 0, 7); g.fill();
  g.fillStyle = pick(['rgba(164,150,114,0.5)', 'rgba(140,126,94,0.5)', 'rgba(180,168,132,0.4)']);
  g.beginPath(); g.ellipse(x, y, r, r * 0.66, rand(0, 3), 0, 7); g.fill();
}
