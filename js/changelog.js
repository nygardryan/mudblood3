// Changelog data + screen wiring. Newest entry first.
// Each entry: { date: 'YYYY-MM-DD', title: optional heading, changes: [strings] }.
// Add a new object to the TOP of this array whenever you ship changes.
const CHANGELOG = [
  {
    date: '2026-07-23',
    title: 'New Faction: Imperial Japanese Army',
    changes: [
      'Endless runs now roll a foe: you face either the Wehrmacht or a brand-new Imperial Japanese Army.',
      'Nine new units with their own art: Arisaka riflemen, Nambu LMGs, nest snipers, knee mortars, sword officers, Type 100 flamethrowers, and the Chi-Ha tank.',
      'Banzai chargers sprint in and cut your men down with the bayonet — no ranged attack, so drop them before they close.',
      'Lunge-mine suicide men rush your armor and emplacements and detonate on contact.',
      'Japanese infantry are fanatics — they never hit the dirt, they only close the distance. Officers can scream a banzai charge that surges every soldier around them.',
      'New Japanese set-piece assaults (mass banzai, night infiltration, knee-mortar bombardment, and the gyokusai last charge).',
    ],
  },
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
