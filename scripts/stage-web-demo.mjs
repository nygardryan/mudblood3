/* Trenchworks: WW2 — stage the WEB DEMO into dist-web-demo/ (gitignored).
   Mirrors shells/mobile/scripts/sync-www.mjs: copies the shipped file subset
   from shells/file-manifest.json, then flips the staged js/demo-flag.js to
   `true` — the repo's copy stays false forever. Deploy the output directory to
   the demo's OWN origin: a separate origin means separate localStorage, which
   is what keeps demo players' shop/escalation/save data apart from the full
   web game without any shared-blob hazards. (?demo=1 on the full game remains
   the zero-staging way to test demo mode in a dev browser.)

   Run from anywhere: node scripts/stage-web-demo.mjs */
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-web-demo');

const { entries, excludeSuffixes } = JSON.parse(
  readFileSync(join(root, 'shells', 'file-manifest.json'), 'utf8'),
);

rmSync(out, { recursive: true, force: true });   // no stale files, ever
mkdirSync(out, { recursive: true });

for (const { path } of entries) {
  cpSync(join(root, path), join(out, path), {
    recursive: true,
    filter: (src) => !excludeSuffixes.some((suf) => src.endsWith(suf)),
  });
}

writeFileSync(join(out, 'js', 'demo-flag.js'), "'use strict';\nconst TW_DEMO_BUILD = true;\n");

console.log('dist-web-demo/ staged (' + entries.map((e) => e.path).join(', ') +
  ') with js/demo-flag.js flipped to true — deploy to the demo\'s own origin');
