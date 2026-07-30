// Changelog data + screen wiring. Newest entry first.
// Each entry: { date: 'YYYY-MM-DD', title: optional heading, changes: [strings] }.
// Add a new object to the TOP of this array whenever you ship changes.
const CHANGELOG = [
  {
    date: '2026-07-29',
    title: 'Italian Armour Redrawn',
    changes: [
      'The three Regio Esercito vehicles are drawn from scratch, one silhouette each. Until now the tankette and the M13/40 were the same shape at two sizes — and they are the armour you meet on the same desert, in the same paint, often in the same wave, doing three completely different jobs to your line.',
      'The L3 Lf TOWS ITS FUEL. The flame tankette drags an armoured bowser on two wheels with a pair of hoses running forward to the projector, which is where the fire it hoses your trench with actually comes from. Nothing else on the field tows anything, so it is the one vehicle you can name from the far end of the map.',
      'The M13/40 is the one with the TURRET, and now looks it: a riveted faceted turret seated in a scribed ring, a commander\'s hatch off to one side, a stowage bin on the back, and a long thin 47mm with no muzzle brake — a different gun from anything the Germans or your own Shermans carry. Its hull machine gun sits on the driver\'s right, opposite where the Semovente carries its howitzer.',
      'The Semovente keeps its stub 75 hard over to one side and gains nothing round anywhere — it is still the one that aims by turning the whole tank. Riveted seams, mudguards and the sand-and-green disruptive scheme are common to all three, because they are one army.',
    ],
  },
  {
    date: '2026-07-29',
    title: 'High Explosive Toned Down',
    changes: [
      'HIGH EXPLOSIVE now widens the Sherman\'s cannon burst by half instead of doubling it. Blast is area, not width — doubling the radius was four times the ground covered, and half again is a little over twice. It is still a considerably bigger hole than the standard round.',
      'The mortarman\'s HEAVY SHELLS is untouched at twice the radius. He lobs into open ground at range and holds fire when your own men are near the impact point; the tank fires flat at whatever it is aimed at and has never checked. The two cards no longer pretend that is the same shell.',
    ],
  },
  {
    date: '2026-07-28',
    title: 'New Card: Forward Observer',
    changes: [
      'New unique EMPLACEMENTS card — FORWARD OBSERVER. A spotter works the top of every WATCH TOWER, and your men in the sector below him pick their targets straight through smoke.',
      'Smoke has always been something that happened to you. A canister goes up, the men either side of it stop being able to see anything, and there was nothing you could buy that answered it. Now there is, and it is a piece you can already build.',
      'The sector is the tower\'s second footprint and a far wider one than the range aura — about as far as a rifleman shoots, so one tower covers a stretch of your line and never the whole field. Smoke somewhere else is still smoke. An engineer widens the sector when he fortifies the tower, and widens it again when he hardens it.',
      'Every man on his feet under it sees: rifles, machine guns and the mortar crew. Not your armour and not the staked guns — the tower has never done anything for a buttoned-up crew, and a gunner stood at his own sights is not taking a call from a ladder he never climbed. It works one way only — the smoke goes on hiding your men from the enemy — and it dies with the tower, which is a frail thing that the enemy was already shelling first.',
    ],
  },
  {
    date: '2026-07-28',
    title: 'New Card: Ambush',
    changes: [
      'New unique EMPLACEMENTS card — AMBUSH. A man who opens fire out of a CAMO NEST while the enemy still cannot see him hits for double damage.',
      'It is the first card that pays you for holding fire. The nest has always hidden your men until they shot; now the shot they were hiding to take is worth twice as much, and the moment it goes out they are visible again like they always were.',
      'That makes the reveal timer the card\'s rhythm. Three seconds after his last shot the nest takes him back, and the next round out of it is another ambush — so a man in a running firefight never gets it, and a man picking his moment gets it every time. An engineer shortens the wait to a second and a half, and a hardened nest to half a second.',
      'Aimed fire and buckshot only. Grenades, rockets, mortar shells and flame give the position away without the bonus — a tube crew reloads slower than the nest can hide them, so every shell they fired would have been an ambush and the card would just have been more damage.',
    ],
  },
  {
    date: '2026-07-28',
    title: 'See Through The Info Panel',
    changes: [
      'The info panel is see-through again. It opens on top of the fight it is describing, and a solid box meant that pointing at a man to read him hid whatever was about to happen to him.',
      'The writing in it is not transparent — the panel got lighter, the text did not. It sits on its own shadow now, so a stat line stays just as sharp over a crater or a knot of troops as it did over the old solid backing.',
    ],
  },
  {
    date: '2026-07-28',
    title: 'Kamikaze',
    changes: [
      'The air raid is a different event when the Imperial Japanese Army is across from you. No bombers and no bomb sticks — kamikaze. Twice as many aircraft come over, and every one of them picks a man on your line and flies into him.',
      'A bomb released from altitude is a suggestion; a kamikaze is not. It goes off exactly where it lands, and the aircraft get bigger as the waves grind on, so a late attack is a handful of enormous holes punched precisely into your line instead of a dozen scattered ones punched roughly near it. A knot of men bunched together loses far more than a spread one.',
      'You can see this one coming, which you never could with a bomber — a bomber is only ever a shadow, but a kamikaze is drawn, and it shrinks as it drops toward the field. It also commits: past a certain point the pilot stops correcting and flies the line he has, so a man walked clear late can be missed by a body length and catch nothing but the edge of it. Going flat still halves the blast, exactly as it does under a bomb.',
      'Your AA gun is the answer, and it needs to be a better one now. A kamikaze is a much lighter airframe than a bomber, so the same gun breaks about the same share of an attack even though twice as much of it is coming — and one broken up in the air scatters its warhead short of your trench instead of driving it into the middle of your men.',
    ],
  },
  {
    date: '2026-07-28',
    title: 'New Card: Fire Mission',
    changes: [
      'New unique OFFICER card — FIRE MISSION. Every wave there is a 5% chance one of your officers gets a battery on the radio and brings six rounds of 60mm down on a random enemy out on the field, free.',
      'It is the officer\'s first offensive job. He is the one man on the field who never fires at anything — he pays for himself in TP and rallies men out of the dirt, and now he occasionally kills someone.',
      'The salvo is the same weight of shell as a MORTAR STRIKE off your own toolbar, but it comes down in a tighter box and finishes sooner. He is correcting onto a man he can see, rather than dropping rounds on a square you picked off the map.',
      'It takes an officer alive to make the call, and the rounds land on the enemy the field held when the order went out — men still marching in from the treeline are not on the target list.',
    ],
  },
  {
    date: '2026-07-28',
    title: 'The Ladder No Longer Picks Your Enemy',
    changes: [
      'ESCALATION rungs no longer pin the army you fight. Every run at every rung rolls the enemy the same way an unmodified endless run always has — Wehrmacht, Imperial Japanese Army, Horde or Regio Esercito.',
      'A rung is only cleared by putting a wave-100 boss down, which is a lot of attempts, and a pinned rung made every one of those attempts the same army on the same ground. Rotation is what keeps them distinct — even though it means a lucky roll can hand you your best matchup for the unlock.',
      'The roll never gives you the same army twice in a row, so a restart is always a change of front.',
      'One consequence worth knowing: a modifier now lands where the roll puts it. CASE-HARDENED doubles plate that the Regio Esercito wears a lot of and the dead wear none of, so some runs at that rung are harder than others.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'Point At Anything',
    changes: [
      'The info panel is no longer just for the enemy. Point at one of your own men, or at any emplacement on the field, and you get the same box: what it is, what it has left, what it is doing for you, and its codex blurb.',
      'Emplacements finally answer the questions you could only guess at before — how much of a bunker is still standing, whether a piece is STANDARD, FORTIFIED or HARDENED, exactly what dodge and cover radius that tier is buying, and how far along an engineer is on the next one. Italian field works read out too, garrison and all.',
      'A man always wins the pick over the emplacement he is standing on, since cover is only ever used by crowding troops onto it. Point at the edge of the piece — the dashed outline shows exactly what you have hold of — and you get the emplacement instead.',
      'On mobile, TAP an emplacement with nothing selected and its panel opens; the next touch anywhere puts it away. Tapping one while you have troops selected is still an order to move them into its cover — that reading of the tap is too useful to lose, so deselect first if you want to read the piece instead. The long-press is unchanged and still yours for the enemy and for box-select.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'The Ground Can Be Repainted Too',
    changes: [
      'The four battlefields — the Western Front mud, the Pacific ash, the blight and the North African desert — can now be replaced with hand-painted art the same way every man and vehicle already could. The sprite export has a new terrain folder holding each theatre as a single full-field image, plus the deploy trench laid over it.',
      'They are two images per theatre rather than one on purpose: repaint the field and keep the trench the game draws, or cut your own trench through ground that is still procedural. Leave a theatre out entirely and it fights on the ground it always did.',
      'One catch worth knowing. The ground is painted once when a run starts, and everything that happens to it afterwards — burnt-out wrecks, shell scorch, blown bunkers — is painted straight onto it and recorded nowhere else. So a pack that finishes loading after a run is already underway waits for the next one rather than wiping the field you have been fighting over. Turning ART OFF mid-run does repaint immediately, and does cost you those scars: it is the one case where you asked for it.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'Boss Health Bars, Sniper & Jeep',
    changes: [
      'Every boss now wears the same health bar. The Yamato\'s look — one wide bar in a black surround, the name in small type above it, tick marks where the phase breaks fall — is now what Der Schlächter, the Progenitor, the Treno Armato and the Alien Walker all use. Turrets, gun tubs, pus modules and wagons get the same treatment one size down, so you can read at a glance which part of the thing is nearly off.',
      'The tick marks are not decoration. On the bosses that fight in phases they mark exactly where the next break lands — where the Progenitor raises the dead and where the train sounds the AVANTI.',
      'SNIPER: reach out from 249 to 274. He now clearly outranges the German, Japanese and Italian marksmen who used to trade with him on almost even terms, which is what you are paying for.',
      'JEEP: the pintle .50 now fires twice as fast and holds twice the belt. It was a fast, fragile thing that did very little once it arrived; it now does real work in the seconds before something kills it.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'Performance: Long Runs Stay Smooth',
    changes: [
      'Blood, craters and the bodies of the dead no longer cost anything to draw. They used to be redrawn one by one every single frame, and a long run accumulates thousands of them — which is why a wave-60 field crawled while a wave-2 field flew. They are now painted once into the ground itself.',
      'Nothing about the field looks different: the same stains, the same craters, the same bodies, fading and clearing on the same two-minute timer. Measured on a heavily fought board, the frame cost of the whole ground layer dropped from 36 ms to under 3.',
      'The practical effect is that a deep endless run now ends because the line broke, not because the game got slow.',
    ],
  },
  {
    date: '2026-07-27',
    title: 'Sprite Packs & the Art Exporter',
    changes: [
      'The game\'s art can now be replaced. Settings has an ARTWORK section that exports every drawable in the game — 175 of them, every man, vehicle, emplacement, boss part and ground stain — as transparent PNGs in a single ZIP, with a manifest describing where each one anchors and where its barrel ends.',
      'Repaint any of them, load the pack back in, and the game draws yours instead. Anything you leave out simply falls back to the art that shipped, so a half-finished pack is perfectly playable.',
      'The trade is animation for art: a hand-painted man ships as one image, so his walk cycle, gun swivel and throw poses freeze into a single pose. Muzzle flashes, tracers, flame and smoke are separate layers and keep moving regardless.',
    ],
  },
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
    title: 'Wave 666: Something Else Entirely',
    changes: [
      'A run that will not end now ends itself. At wave 666 something walks out of the treeline that belongs to no army — a striding tripod that stops short of your line and sweeps a laser lance across the field. It turns up against all four factions.',
      'The lance is the whole fight. It burns through anything the arc crosses: men, sandbags, wire, and the Regio Esercito\'s own works alike. Running is a real answer if you start early — down by its feet the beam crawls, and out at the tip it moves faster than anyone can.',
      'It is not armored, it is simply out of reach. Standing where it does, it sits outside every rifle, BAR, grenade and bazooka on your roster; artillery, mortars and men you deliberately walk forward are what get to it. Killing it does not end the run and pays no ESCALATION progress — it just dies, and from wave 667 there is a growing chance of more than one.',
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
    date: '2026-07-27',
    title: 'ESCALATION',
    changes: [
      'Endless difficulty is now a ladder. Ten rungs, each one ADDING a permanent modifier on top of every rung below it, and each one unlocked by putting a wave-100 boss in the ground. At rung 0 the game is exactly what it was.',
      'I: enemy HP ramps half again as fast. II: income cut a fifth and the trickle slowed. III: no breather between waves. IV: enemy damage up a tenth. V: you start with nothing. VI: every enemy plate doubled. VII: events a third more often. VIII: bigger spawn floors. IX: no bounty for kills. X: the boss has to die twice.',
      'Each rung PINS the enemy faction, cycling Wehrmacht, Japanese, Horde, Regio Esercito — so a climb is not one army beaten ten times, it is proving the same line against all four. Rung VI\'s doubled steel is brutal against Italian armor and worth nothing at all against the dead.',
      'It pays. Medal payout rises 10% per rung, up to double at ESCALATION X, and never drops below the base rate.',
      'The endless panel is built around it: a strip of rung chips with every rung you have earned one tap away, a readout pairing the rung with what it pays, and a dossier holding all ten modifiers in full. The PLAY button on that block is now how you take the line.',
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

// reached from Settings (DEV TOOLS) rather than the front page — it is a thing
// you consult, not a thing you launch. It swaps whatever opened it out, so it
// has to put that screen back rather than assume the menu, the same shape
// openSettings/openCodex already use.
let changelogReturnTo = 'settings';

function openChangelog(from) {
  changelogReturnTo = from || 'settings';
  renderChangelog();
  el('changelog').classList.remove('hidden');
  el(changelogReturnTo).classList.add('hidden');
}

function closeChangelog() {
  el('changelog').classList.add('hidden');
  el(changelogReturnTo).classList.remove('hidden');
}

el('changelog-btn').addEventListener('click', () => openChangelog('settings'));
el('changelog-back-btn').addEventListener('click', closeChangelog);
