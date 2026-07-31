/* Stages the game core from the repo root into www/ for `cap sync`.
   ZERO transforms — every file ships byte-identical; this exists only because
   Capacitor copies webDir wholesale with no exclude support, so pointing it at
   the repo root would ship .git, .claude/, shells/ (recursively) and *.bak.
   The subset lives in shells/file-manifest.json — the single list shared with
   shells/desktop/electron-builder.cjs. Edit that file, not this one. */
import { cpSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
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

console.log('www/ staged from repo root (' + entries.map((e) => e.path).join(', ') + ')');
