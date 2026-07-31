/* Stages the game core from the repo root into www/ for `cap sync`.
   ZERO transforms — every file ships byte-identical — with ONE deliberate,
   gated exception: under TW_DEMO_BUILD=1 the staged js/demo-flag.js is
   overwritten with `true` after the copy loop (the repo's copy stays false
   forever; this is the mobile spelling of the flip desktop's main.cjs does by
   serving a generated file over tw://). The staging itself exists only because
   Capacitor copies webDir wholesale with no exclude support, so pointing it at
   the repo root would ship .git, .claude/, shells/ (recursively) and *.bak.
   The subset lives in shells/file-manifest.json — the single list shared with
   shells/desktop/electron-builder.cjs. Edit that file, not this one. */
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const shellDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(shellDir, '..', '..');
const www = join(shellDir, 'www');

const { entries, excludeSuffixes } = JSON.parse(
  readFileSync(resolve(shellDir, '..', 'file-manifest.json'), 'utf8'),
);

rmSync(www, { recursive: true, force: true });   // no stale files, ever
mkdirSync(www, { recursive: true });

for (const { path } of entries) {
  cpSync(join(root, path), join(www, path), {
    recursive: true,
    filter: (src) => !excludeSuffixes.some((suf) => src.endsWith(suf)),
  });
}

if (process.env.TW_DEMO_BUILD === '1') {
  writeFileSync(join(www, 'js', 'demo-flag.js'), "'use strict';\nconst TW_DEMO_BUILD = true;\n");
  console.log('DEMO build: www/js/demo-flag.js flipped to true — pair with the `demo` gradle flavor');
}

console.log('www/ staged from repo root (' + entries.map((e) => e.path).join(', ') + ')');
