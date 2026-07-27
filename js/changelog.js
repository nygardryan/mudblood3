// Changelog data + screen wiring. Newest entry first.
// Each entry: { date: 'YYYY-MM-DD', title: optional heading, changes: [strings] }.
// Add a new object to the TOP of this array whenever you ship changes.
const CHANGELOG = [
  {
    date: '2026-07-27',
    title: 'New Card: Reinforced Plate',
    changes: [
      'New unique ARMOR card — REINFORCED PLATE. Heavier steel in the carrier: BODY ARMOR and FLAK ARMOR both fit 200 points of plate instead of 100, for the same 1 TP apiece.',
      'It is the cheapest thing in the game to leverage. A plate carrier already costs a single point and soaks a rifleman\'s whole health bar before the man under it is even scratched; the card buys a second bar on top of that, on every vest you fit, for the rest of the run.',
      'Plate already strapped on a man does not thicken by itself — re-buy his vest and it comes back at the new bar. An engineer with FIELD ARMORER patches the doubled plate back to full the same as he always did, just slower for the obvious reason.',
      'It does nothing about what goes THROUGH a vest. A bazooka carrying HEAT ROUNDS holes your own men\'s flak armor exactly as before, and the plate never stops what it was never rated for: bullets chip body armor, explosions chip flak, and neither bar looks at the other.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Beaten Zone',
    changes: [
      'New unique GUNNER card — BEATEN ZONE. Every BAR burst already beats the ground around whatever he fires on; now everything caught in it stays down twice as long, and a pinned man neither advances nor fires back.',
      'It buys the gunner the one thing his damage never did: time. A lane he is talking down stops moving, and it stays stopped for four or five seconds after he swings the gun onto something else instead of two.',
      'The pin is longer, not wider — the beaten zone covers the same ground it always did. Doubling the radius would have been four times the ground, and turned the gunner into the answer to a massed wave rather than a man holding one lane.',
      'The counter-play is unchanged and still works: veterans shrug the pin off faster, and an officer in aura rallies his men out of it three times as fast as it runs down. Both just cost the enemy twice as much. Japanese fanatics, the Horde, an Italian mid-AVANTI and every boss ignore suppression as they always have.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Counterattack',
    changes: [
      'New unique HQ card — COUNTERATTACK. Between assaults the reserve company moves up and takes back the ground you lost: every new wave scrubs one breach off the tally, down to none.',
      'It is the only card that heals the run itself instead of a man. A line that leaks a single breakthrough a wave now holds forever, and a bad wave that costs you three is something you can dig out of over the next three instead of carrying to the end of the run.',
      'It cannot save you mid-wave. The line still ends the run the instant the last breach lands — the reserves only ever arrive between assaults, and they only ever bring back one.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Canister Shot',
    changes: [
      'New unique AT GUN card — CANISTER SHOT. The 57mm carries a tin of lead balls that comes apart the moment it clears the muzzle. Enemy infantry inside 30% of the gun\'s reach catches the whole pattern, and canister rams faster than an AP round.',
      'It is the last thing the gun reaches for, not the first. Armor still wins the target list at full range, and a soft-skinned vehicle still wins after that — a piece that turns off a Panzer to shoot the riflemen walking beside it is not an AT gun any more. Only when nothing on wheels or tracks is in the cone does the crew load a tin.',
      'The band is a fraction of the gun\'s own reach, not a fixed number, so rank, a watch tower and Rangefinders stretch it exactly as far as they stretch the AP shell. The pale wedge on the range overlay marks the ground the pattern covers.',
      'The balls do nothing to armor at all — not reduced, skipped. There is a 403-point AP shell in the ready rack for that. And the crew ranks up off infantry now, which widens the traverse and shortens both reloads: a canister gun makes sergeant a great deal faster than one that only ever waits for tanks.',
      'The AT and AA gun toolbar blurbs no longer claim the guns fire at one thing only — both now have a card that says otherwise.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: HEAT Rounds',
    changes: [
      'New unique bazooka card — HEAT ROUNDS. Shaped-charge warheads. The rocket no longer grinds a flak vest down before it reaches the man inside it: the jet holes the plate and the whole blast lands on him, with the vest still on and unchipped.',
      'It is worth the most where a bazooka actually earns its keep — the ring at the edge of the crater. A rocket does 120 at the centre and about 36 at the rim, which is less than a wave-40 flak plate soaks, so the men standing at the edge of the blast used to walk out of it untouched. They do not now.',
      'The card grows with the run. Armor is a 5% curiosity at wave 1 and near-universal by wave 120, and ESCALATION VI doubles every plate on the field — this is the one clean answer to it. Tanks are unaffected: they wear no plate to hole, and the rocket already hits them at 2.75x.',
      'The jet does not ask whose vest it is. Your own men\'s flak armor stops none of it either, so a rocket dropped near your line now goes straight through the plate you bought them.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Pre-Hardened',
    changes: [
      'New unique EMPLACEMENTS card — PRE-HARDENED. Everything you place comes out of the ground already reinforced: sandbags, bunkers, watch towers, camo nests, ammo crates, wire and decoys all arrive at the FORTIFIED tier instead of standard.',
      'That is the full first tier, not a discount on it — the extra HP, the deeper cover, the tower\'s longer reach, the crate\'s faster reload, the wire\'s harder grip, all of it standing the moment you pay for the piece. A bunker goes down at 3,060 HP and 85% dodge rather than 2,040 and 75%.',
      'Your engineers get the six seconds back. With Hardened Works they spend it pushing pieces to the second tier instead; without it they have nothing left to build and go straight to repairing what the enemy knocks down. Minefields have no tier and are unaffected.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Ricochet',
    changes: [
      'New unique DUMMY card — RICOCHET. There is something hard under the burlap. Every bullet that strikes a decoy has a 15% chance to deflect straight back down its own flight path and hit the man who fired it.',
      'The deflected round carries the FULL damage it did to the scarecrow, so the card is only ever as strong as the gun pointed at it. A Kar98 round stings. A sustained MG42 burst into a decoy mauls the crew firing it.',
      'Small arms only. Flame flows over straw, a bayonet is not a round, and a shell that lands on a decoy just tears it apart — none of the three come back. Nobody is credited with a ricochet kill either: it counts, it pays the bounty, and it earns no man a promotion.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Cards: Headshot',
    changes: [
      'New unique sniper card — HEADSHOT. Every round he lands has a 40% chance to find the head and drop the man on the spot, whatever he had left. A sniper firing one round every five seconds now ends something better than a third of the times he pulls the trigger.',
      'New unique rifleman card — HEADSHOT. The same round, at 5%. It sounds like nothing next to the sniper\'s, and it is not: a rifleman fires six times as often, and you field him by the dozen. Read the two cards by how often they go off, not by the number printed on them.',
      'Enemy infantry only. There is no headshot on a Panzer, a halftrack, a Kübelwagen, a rocket battery, or any of the four wave-100 bosses and the gun tubs, batteries, pus modules and wagons that ride with them.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Cards: Heavy Shells & High Explosive',
    changes: [
      'New unique mortarman card — HEAVY SHELLS. Every round he drops bursts across twice the radius. The damage on the shell is unchanged, but a blast that wide catches four times the ground, and anything that used to be standing at the edge of the crater is now well inside it.',
      'New unique Sherman card — HIGH EXPLOSIVE. The 75mm loads HE and the cannon shell bursts across twice the radius, on the same terms.',
      'Neither blast knows whose side you are on. The mortarman already refuses a fire order with your men near the impact point, and he now keeps that distance at the wider margin — but the tank has never checked, and it still does not. A Sherman firing at something in among your infantry will bury them with it.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Field Armorer',
    changes: [
      'New unique engineer card — FIELD ARMORER. Body and flak armor used to be one-way: once a plate was chipped down, the only way back was paying for it again. An engineer standing with your men now patches their damaged plate, and will rebuild a fully broken bar from nothing.',
      'He works it at the same crawl he uses on a tank, and only when there is no emplacement or vehicle in front of him that needs repairing. Grease Monkey doubles the rate.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'New Card: Morphine Syrette',
    changes: [
      'New unique medic card — MORPHINE SYRETTE. A man the medic patches up takes 20% less damage from everything for a moment afterward, so a wounded soldier held together inside a medic\'s radius is harder to finish off.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'Every Faction Fights on Its Own Ground',
    changes: [
      'Each endless enemy now brings its own terrain, so you know which war you are in the moment the field paints.',
      'The Wehrmacht still holds the churned mud and patchy grass of the Western Front.',
      'The Imperial Japanese Army fights on a Pacific island: volcanic ash and coral grit underfoot, jungle scrub and fallen palm fronds scattered over it, and a bamboo-revetted trench.',
      'The Horde shambles across blighted ground — dead grey earth cracked open, pools of standing rot, and the bones of whatever came through before you.',
      'The Regio Esercito digs in out in the North African desert: open ochre sand, wind ripples, loose stone and dry scrub.',
    ],
  },
  {
    date: '2026-07-26',
    title: 'Italian Boss: The Treno Armato',
    changes: [
      'Every 100th Italian wave now belongs to the TRENO ARMATO — an armored war train that rolls straight down its rail lane from the north and PARKS at the bottom of your sector. The rails go down first: you can read exactly where it will stop.',
      'Five wagons: a very tanky engine with no weapons, two turret wagons that shell your line, an infantry wagon that unloads squads of fanteria beside the track, and a gun wagon crewed by four machine gunners, two per side.',
      'The engine is the boss — three health chunks, and every chunk you strip away makes the train sound its whistle and hurl the ENTIRE Italian army into an AVANTI charge. Kill it to derail the run\'s victory screen.',
      'Every wagon has its own health: knock out a turret and its gun stays silent (no damage control on this boss), kill the boxcar and the squads stop coming. Small arms only hurt the gun crews — the wagons want explosives.',
      'Anything you built on the rails is kindling: the train crushes sandbags, wire and emplacements under its wheels on the way down.',
    ],
  },
  {
    date: '2026-07-26',
    title: 'New Faction: The Regio Esercito',
    changes: [
      'Endless runs can now roll a fourth enemy — the Italians. They are the only foe that BUILDS: their assault sappers dig sandbag parapets, bunkers and watch towers out in the open, and the works are still standing next wave.',
      'The enemy front creeps. Each new work goes up a little further down the field than the last, until their line is sitting just short of the forward line — and their infantry moves in and fights from behind it.',
      'Your rifles can\'t touch a work. Bring explosives: grenadiers, bazookas, mortars, the Sherman, or a mortar/artillery strike. Rounds a parapet stops for its garrison do wear it down, so a rifle line grinds one away eventually.',
      'AVANTI SAVOIA! Every so often the whole army comes out of cover at once behind a banner — and for those few seconds nothing pins them. The banner is your warning; a mortar on a line that is still bunched up is the answer. Their officers bring the charge sooner just by being alive.',
      'Sixteen new units, including the Guastatore who builds their line, the Arditi demolition man who plants fused charges on YOUR emplacements, a Cecchino who outranges your line from a hardened watch tower, and the L3 Lf — the only flame-throwing tank on any front.',
      'Fixed: an Italian run could drop German Fallschirmjäger, report "German Wehrmacht" on the after-action report, and file its units under WEHRMACHT in the codex.',
      'Fixed: enemy shotgunners kept their muzzle flash drawn forever, and Italian dead wore German helmets.',
    ],
  },
  {
    date: '2026-07-26',
    title: 'Testing Mode: HORDE & ITALIAN Tabs',
    changes: [
      'Added a HORDE tab to testing mode — spawn the full undead roster on demand, from shamblers up to the Progenitor.',
      'Added an ITALIAN tab — the full Regio Esercito roster can now be placed on demand like every other faction, along with their field works.',
      'Infection now works whenever something bites: a man dropped while infected rises against his line, and medics cure the rot, even in a run that didn\'t roll the Horde.',
      'Fixed the Panzer IV missing from the testing GERMANS tab — the roster tabs now split by faction instead of by the first letter of the internal key.',
    ],
  },
  {
    date: '2026-07-24',
    title: 'Balance, Testing & UI Tweaks',
    changes: [
      'AT gun and AA gun cost increased from 20 to 21 TP.',
      'Added JAPANESE and ITALIAN tabs to testing mode — spawn the full Japanese and Italian enemy rosters on demand.',
      'Increased mobile long-press deselect threshold from 350ms to 3000ms — no more accidental selection clears.',
      'Reduced the inspector info panel background to 70% transparency — see the battlefield through it.',
      'Default music volume lowered to 10% for new players.',
    ],
  },
  {
    date: '2026-07-24',
    title: 'After-Action Report Redesign',
    changes: [
      'The recap now reads like a typed field document — aged paper, corner file marks, a file number, and the verdict stamp moved off the letterhead so it stops covering the header text.',
      'Headline figures are colour-coded: waves and time in gold, kills in olive, men lost in red.',
      'The tempo chart gained a scale — gridlines, wave markers at each end, and the heaviest wave called out in gold.',
      'The correspondent\'s closing line is now set as a pull-quote instead of a footnote, and the honor roll marks each name with a cross.',
      'The whole report resizes off the stage rather than the window, so the type is no longer oversized on desktop and the layout stacks properly on a phone.',
    ],
  },
  {
    date: '2026-07-24',
    title: 'New Event: Smokescreen',
    changes: [
      'New random event — a smoke round lands on the field and burns for 20-60 seconds, pumping out a screen that drifts downwind.',
      'Smoke blocks line of sight, not just aim: a man only sees a little way into it, so troops with a bank of smoke between them stay blind to each other even at close quarters. It can smother your firing line or cover an assault walking right into it.',
      'The battlefield now has WIND. It holds one direction all run but backs or veers a little every wave, so a screen never drifts quite the same way twice — a wind arrow shows which way while smoke is up.',
      'Smoke carries 75% further downwind than it first did, so a screen can now sweep most of the field.',
    ],
  },
  {
    date: '2026-07-24',
    title: 'July 24 Updates',
    changes: [
      'Body armor mechanic added — some units carry armour that reduces incoming damage until cracked.',
      'New cards: Frag Grenade, Armor Piercing, Brave, Shellshocked, Rangefinder, and Curtain.',
      'Flame Tank card now available.',
      'Dummy decoy unit for misdirection.',
      'Balance passes: health rebalancing, shotgun cone adjustments, armor tuning, and encampment placement updates.',
      'Zoom-to-fill view for mobile devices.',
      'Rendering improvements for defenses and vehicles.',
    ],
  },
  {
    date: '2026-07-23',
    title: 'New Faction: The Horde',
    changes: [
      'Endless runs can now roll a fourth foe — The Horde, a rising tide of the undead. No army, no armor, almost no gunfire: just the walking dead.',
      'Ten zombie types with their own art: shamblers, runners, crawlers, infected hounds, brutes, spitters, bloaters, screamers, gun-toting revenants, and the towering Abomination boss.',
      'New INFECTION mechanic: a zombie bite can infect your men. An infected soldier rots on a timer and, if he isn\'t cured, dies and RISES as a zombie against your own line.',
      'Keep a MEDIC near the line — he burns the infection out of the bitten before they turn. He\'s the hard counter to the horde.',
      'Spitters lob corrosive bile that burns and infects in a splash; bloaters burst into a cloud of infectious rot; screamers shriek nearby zombies into a frenzied sprint.',
      'New horde set-piece assaults (a horde surge, a hound pack, a bile bombardment, and the Abomination), and the paradrop becomes the dead clawing up out of the ground behind your line.',
    ],
  },
  {
    date: '2026-07-23',
    title: 'Japanese Army: More Units',
    changes: [
      'Six more Japanese unit types: SNLF SMG troopers, grenadiers, the Type 92 heavy MG, an 81mm mortar team, the fast Ha-Go light tank, and the heavy Chi-Nu.',
      'The Imperial Japanese Army now fields a full 15-unit roster, with armor arriving in tiers (Ha-Go, then Chi-Ha, then Chi-Nu).',
    ],
  },
  {
    date: '2026-07-23',
    title: 'New Faction: Imperial Japanese Army',
    changes: [
      'Endless runs now roll a foe: you face either the Wehrmacht or a brand-new Imperial Japanese Army.',
      'New units with their own art: Arisaka riflemen, Nambu LMGs, nest snipers, knee mortars, sword officers, Type 100 flamethrowers, and the Chi-Ha tank.',
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
