/* Vendors the game's Google Fonts into assets/fonts/ + css/fonts.css.
   Fetches the same css2 URLs style.css imported, keeps the latin and latin-ext
   faces, downloads each woff2 and emits @font-face rules pointing at the local
   files. latin-ext is kept because the leaderboard name field is free text: a
   player typing an accented name got the webfont from Google before, and a
   latin-only bundle would drop them onto a system font mid-word.

   It also vendors each family's LICENSE, which is not optional — bundling the
   binaries is what makes the notice a redistribution requirement, where
   hot-linking Google was compliant by construction. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/home/ryanlap/Desktop/budblood3';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const FONTS_REPO = 'https://raw.githubusercontent.com/google/fonts/main/';

const CSS_URLS = [
  'https://fonts.googleapis.com/css2?family=Saira+Stencil+One&family=Oswald:wght@400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@600;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Special+Elite&family=JetBrains+Mono:wght@400;500;700&display=swap',
];

// the subsets the game's text can actually reach. Everything else Google serves
// (cyrillic, greek, vietnamese, ...) is dropped — it is weight for glyphs no
// screen in this game renders.
const SUBSETS = ['latin', 'latin-ext'];

const slugOf = (family) => family.toLowerCase().replace(/\s+/g, '-');
const repoSlug = (family) => family.toLowerCase().replace(/\s+/g, '');

const faces = new Map();   // "family|style|weight|subset" -> {..., subset}

for (const cssUrl of CSS_URLS) {
  const res = await fetch(cssUrl, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`css fetch ${res.status} for ${cssUrl}`);
  const css = await res.text();
  // blocks look like: /* latin */ @font-face { font-family: 'X'; font-style: normal; font-weight: 400; ... src: url(https://...woff2) format('woff2'); unicode-range: U+...; }
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const subset = m[1];
    if (!SUBSETS.includes(subset)) continue;
    const body = m[2];
    const family = /font-family:\s*'([^']+)'/.exec(body)[1];
    const style = /font-style:\s*(\w+)/.exec(body)[1];
    const weight = /font-weight:\s*(\d+)/.exec(body)[1];
    const url = /src:\s*url\((https:[^)]+)\)/.exec(body)[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(body)[1].trim();
    faces.set(`${family}|${style}|${weight}|${subset}`,
      { family, style, weight, url, unicodeRange, subset });
  }
}

mkdirSync(join(ROOT, 'assets/fonts'), { recursive: true });

// ---- licenses -------------------------------------------------------------
// Most of these are OFL; Special Elite is Apache-2.0. Don't assume — the whole
// point of vendoring the file is that the claim is checked against the source.
const families = [...new Set([...faces.values()].map(f => f.family))].sort();
const licenses = [];
for (const family of families) {
  const candidates = [
    ['ofl/' + repoSlug(family) + '/OFL.txt', 'OFL-1.1'],
    ['apache/' + repoSlug(family) + '/LICENSE.txt', 'Apache-2.0'],
    ['ufl/' + repoSlug(family) + '/UFL.txt', 'UFL-1.0'],
  ];
  let done = false;
  for (const [path, id] of candidates) {
    const res = await fetch(FONTS_REPO + path);
    if (!res.ok) continue;
    const name = `${slugOf(family)}-LICENSE.txt`;
    writeFileSync(join(ROOT, 'assets/fonts', name), await res.text());
    licenses.push({ family, id, name });
    console.log(`${name}  ${id}`);
    done = true;
    break;
  }
  if (!done) throw new Error(`no license found upstream for "${family}" — do not ship it unlicensed`);
}

// ---- css ------------------------------------------------------------------
const byLicense = new Map();
for (const l of licenses) {
  if (!byLicense.has(l.id)) byLicense.set(l.id, []);
  byLicense.get(l.id).push(l.family);
}
const licenseLines = [...byLicense.entries()]
  .map(([id, fams]) => `      ${id}: ${fams.join(', ')}`)
  .join('\n');

let out = `/* Trenchworks: WW2 — bundled webfonts (latin + latin-ext), vendored from
   Google Fonts so the shells work OFFLINE: these ${families.length} families were the
   game's ONE runtime network dependency, and a Steam offline launch or an
   airplane-mode phone fell back to system fonts.

   Every family's license is vendored beside its woff2 in assets/fonts/ as
   <family>-LICENSE.txt, and both ship in the desktop and mobile bundles.
   Bundling the binaries is what makes that notice a redistribution
   requirement — hot-linking Google was compliant by construction.
${licenseLines}

   Regenerate with the vendor-fonts script if families/weights change; keep
   css/style.css's import of this file as its ONLY font source. */\n`;

for (const f of [...faces.values()].sort((a, b) =>
    a.family.localeCompare(b.family) || a.weight - b.weight ||
    a.subset.localeCompare(b.subset))) {
  const suffix = f.subset === 'latin' ? '' : '-ext';
  const name = `${slugOf(f.family)}-${f.weight}${f.style === 'italic' ? '-italic' : ''}${suffix}.woff2`;
  const res = await fetch(f.url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`font fetch ${res.status} for ${f.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(ROOT, 'assets/fonts', name), buf);
  console.log(`${name}  ${(buf.length / 1024).toFixed(1)} KB`);
  out += `
@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url('../assets/fonts/${name}') format('woff2');
  unicode-range: ${f.unicodeRange};
}
`;
}

writeFileSync(join(ROOT, 'css/fonts.css'), out);
console.log(`\ncss/fonts.css written with ${faces.size} faces, ${licenses.length} licenses`);
