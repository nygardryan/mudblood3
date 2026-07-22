// Changelog data + screen wiring. Newest entry first.
// Each entry: { date: 'YYYY-MM-DD', title: optional heading, changes: [strings] }.
// Add a new object to the TOP of this array whenever you ship changes.
const CHANGELOG = [
  {
    date: '2026-07-22',
    title: 'Cards, Settings & Visual Polish',
    changes: [
      'New cards: Flamer Tank and Passenger.',
      'Redesigned the settings panel with sections, custom sliders, and pill toggles.',
      'Added a mobile info box and enlarged the unit inspector.',
      'Updated emplacements and body graphics.',
      'Assorted style, sound, and rendering improvements.',
    ],
  },
  {
    date: '2026-07-22',
    title: 'Background Music',
    changes: [
      'Added a background music playlist (drop tracks into assets/music/).',
      'New settings: music volume slider and music mute toggle.',
    ],
  },
  {
    date: '2026-07-21',
    title: 'Cards & Combat Updates',
    changes: [
      'Added pre-battle loadout screen.',
      'New cards: Grease Monkey, Vampire, Double Time.',
      'Updated gunfire animation.',
      'New aircraft design.',
      'Explosion effects update.',
      'Balance adjustments across units and support.',
    ],
  },
  {
    date: '2026-07-20',
    title: 'Cards, Menus & Emplacements',
    changes: [
      'Redesigned the main menu and level-select screens.',
      'Rebuilt the shop and renamed ribbons to Medals.',
      'Added card slots and several new cards.',
      'New emplacements including the anti-air gun.',
      'Removed the medic\'s gun; updated the Codex.',
      'Balance tuning: mines, razor wire, Rifled Slugs accuracy.',
      'New V2 rocket design and assorted render fixes.',
    ],
  },
];

function renderChangelog() {
  const list = el('changelog-list');
  if (!list) return;
  list.innerHTML = CHANGELOG.map(entry => {
    const heading = entry.title ? ` &middot; ${entry.title}` : '';
    const items = entry.changes.map(c => `<li>${c}</li>`).join('');
    return `<div class="cl-entry">
      <div class="cl-date">${entry.date}${heading}</div>
      <ul class="cl-changes">${items}</ul>
    </div>`;
  }).join('');
}

function openChangelog() {
  renderChangelog();
  el('changelog').classList.remove('hidden');
  el('intro').classList.add('hidden');
}

function closeChangelog() {
  el('changelog').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

el('changelog-btn').addEventListener('click', openChangelog);
el('changelog-back-btn').addEventListener('click', closeChangelog);
