/* Dirt & Iron — axis research.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const RESEARCH_KEY = 'axisResearch';
const RESEARCH_VERSION = 1;

function defaultAxisResearch() {
  return { version: RESEARCH_VERSION, rp: 0, unlocked: AXIS_STARTER_UNITS.slice(), earned: {} };
}

function loadAxisResearch() {
  try {
    const raw = localStorage.getItem(RESEARCH_KEY);
    if (!raw) return migrateAxisResearch(defaultAxisResearch());
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== RESEARCH_VERSION) {
      return migrateAxisResearch(defaultAxisResearch());
    }
    data.unlocked = Array.isArray(data.unlocked) ? data.unlocked : AXIS_STARTER_UNITS.slice();
    data.earned = data.earned && typeof data.earned === 'object' ? data.earned : {};
    data.rp = Number.isFinite(data.rp) ? data.rp : 0;
    return migrateAxisResearch(data);
  } catch {
    return migrateAxisResearch(defaultAxisResearch());
  }
}

function saveAxisResearch(data) {
  localStorage.setItem(RESEARCH_KEY, JSON.stringify(data));
}

function migrateAxisResearch(data) {
  const progress = loadProgress();
  let changed = false;
  if (data.unlocked.includes('efall')) {
    data.unlocked = data.unlocked.filter(k => k !== 'efall');
    if (!data.unlocked.includes('eparadrop')) data.unlocked.push('eparadrop');
    changed = true;
  }
  for (let i = 1; i <= 13; i++) {
    const id = 'axis' + i;
    if (progress.completed[id] && !data.earned[id]) {
      const level = LEVELS[id];
      if (level) {
        data.rp += 12 + i * 8;
        data.earned[id] = true;
        changed = true;
      }
    }
  }
  if (changed) saveAxisResearch(data);
  return data;
}

function axisLevelNum(id) {
  const m = /^axis(\d+)$/.exec(id);
  return m ? parseInt(m[1], 10) : 0;
}

function axisCampaignTierReached() {
  let tier = 1;
  for (let i = 1; i <= 13; i++) {
    if (isLevelUnlocked('axis' + i, AXIS_CAMPAIGN)) tier = i;
  }
  return tier;
}

function allAxisResearchEntries() {
  return [...AXIS_PLACEABLES, ...Object.values(AXIS_CAMPAIGN_EXTRA_ENTRIES)];
}

function axisResearchEntry(key) {
  return allAxisResearchEntries().find(p => p.key === key);
}

function axisResearchCost(key) {
  if (AXIS_STARTER_UNITS.includes(key)) return 0;
  return AXIS_RESEARCH_COSTS[key] != null ? AXIS_RESEARCH_COSTS[key] : null;
}

function axisResearchTierGate(key) {
  return AXIS_RESEARCH_TIERS[key] || 0;
}

function axisResearchVisible(key) {
  const tier = axisResearchTierGate(key);
  return !tier || axisCampaignTierReached() >= tier;
}

function axisPlaceablesForResearch() {
  const { unlocked } = loadAxisResearch();
  const set = new Set(unlocked);
  return allAxisResearchEntries().filter(p => set.has(p.key));
}

function calcAxisRPAward(level, wiped, wave, axisWaves) {
  const n = axisLevelNum(level.id);
  let rp = 12 + n * 8;
  if (wiped) rp += 8;
  const unused = Math.max(0, axisWaves - wave);
  if (unused >= 2) rp += unused * 4;
  return rp;
}

function awardAxisRP(level, wiped, wave) {
  const data = loadAxisResearch();
  if (data.earned[level.id]) return 0;
  const rp = calcAxisRPAward(level, wiped, wave, level.axisWaves);
  data.rp += rp;
  data.earned[level.id] = true;
  saveAxisResearch(data);
  return rp;
}

function buyAxisResearch(key) {
  const data = loadAxisResearch();
  if (data.unlocked.includes(key)) return false;
  if (!axisResearchVisible(key)) return false;
  const cost = axisResearchCost(key);
  if (cost == null || cost > data.rp) return false;
  data.rp -= cost;
  data.unlocked.push(key);
  saveAxisResearch(data);
  return true;
}

function syncAxisRPDisplays() {
  const data = loadAxisResearch();
  const text = data.rp + ' RP';
  const bal = el('axis-rp-balance');
  const briefBal = el('axis-briefing-rp');
  const researchBal = el('axis-research-rp');
  if (bal) bal.textContent = text;
  if (briefBal) briefBal.textContent = text;
  if (researchBal) researchBal.textContent = text;
}

function buildAxisResearchUI() {
  const grid = el('axis-research-grid');
  if (!grid) return;
  const data = loadAxisResearch();
  const unlocked = new Set(data.unlocked);
  grid.replaceChildren();
  const keys = [
    ...AXIS_PLACEABLES.map(p => p.key),
    ...Object.keys(AXIS_CAMPAIGN_EXTRA_ENTRIES),
  ];
  for (const key of keys) {
    const entry = axisResearchEntry(key);
    if (!entry) continue;
    const cost = axisResearchCost(key);
    const owned = unlocked.has(key);
    const visible = axisResearchVisible(key);
    const tier = axisResearchTierGate(key);
    const card = document.createElement('div');
    card.className = 'research-card';
    if (owned) card.classList.add('owned');
    if (!visible) card.classList.add('locked');
    const title = document.createElement('div');
    title.className = 'research-card-title';
    title.textContent = AXIS_RESEARCH_LABELS[key] || entry.label;
    const stats = document.createElement('div');
    stats.className = 'research-card-stats';
    stats.textContent = owned
      ? 'OWNED · ' + entry.cost + ' TP per deploy'
      : (cost === 0 ? 'STARTER' : cost + ' RP') + ' · ' + entry.cost + ' TP';
    const desc = document.createElement('div');
    desc.className = 'research-card-desc';
    desc.textContent = entry.desc;
    card.appendChild(title);
    card.appendChild(stats);
    card.appendChild(desc);
    if (!visible) {
      const lock = document.createElement('div');
      lock.className = 'research-card-lock';
      lock.textContent = 'Reach Level ' + tier;
      card.appendChild(lock);
    } else if (!owned && cost > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'research-buy-btn';
      btn.textContent = 'BUY (' + cost + ' RP)';
      btn.disabled = data.rp < cost;
      btn.addEventListener('click', () => {
        if (buyAxisResearch(key)) {
          SFX.cash();
          buildAxisResearchUI();
          syncAxisRPDisplays();
        }
      });
      card.appendChild(btn);
    } else if (owned) {
      const badge = document.createElement('div');
      badge.className = 'research-card-owned';
      badge.textContent = 'OWNED';
      card.appendChild(badge);
    }
    grid.appendChild(card);
  }
  syncAxisRPDisplays();
}

function openAxisResearch() {
  buildAxisResearchUI();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-research').classList.remove('hidden');
}

function closeAxisResearch() {
  el('axis-research').classList.add('hidden');
  if (pendingAxisLevelId) {
    openAxisBriefing(pendingAxisLevelId);
  } else {
    buildAxisSelect();
    syncAxisRPDisplays();
    el('axis-select').classList.remove('hidden');
  }
}
