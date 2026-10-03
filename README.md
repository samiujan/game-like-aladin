# Silk & Steel — A Tale of the Silk Road

A 16-bit style side-scrolling action game in the spirit of Disney's *Aladdin* (Sega Genesis),
set in a Central Asian village in the 1500s. Raiders of the Warlord of the Iron Gate are
carrying off your village's harvest — chase them through the orchards, across the bazaar
rooftops, and up the mountain pass to end it.

Big floaty leaps, sandy dunes under a dithered desert sky, hand-placed sandstone blocks,
gems on a woven rug counter — action first, platforming second.

Every stage is a continuous place, not a gauntlet of platforms: a village street lined with
houses (roofs are fair game), a bazaar of tents and awnings, a mountain road through
fortress towers and the warlord's tent camp. There are **no bottomless pits** — the town
itself is the level, and the danger is blades, knives, and caltrops.

Everything — pixel art, music, sound — is generated in code. No assets, no dependencies.
Music starts **off**; press **M** any time to turn it on or off.

## How to play

The game is plain HTML5/JS (ES modules), so it needs to be served over HTTP
(browsers block module loading from `file://`). From this folder run any static server, e.g.:

```sh
python3 -m http.server 8410
```

then open <http://localhost:8410>.

### Controls

| Key | Action |
| --- | --- |
| ← → / A D | Run |
| SPACE / Z | Jump (hold for higher; ↓ + jump drops through platforms) |
| X / J | Sword — press again mid-swing for the 3-hit combo |
| C / K | Throw knife (limited ammo — smash pots for more) |
| ↓ / S | Crouch |
| ↑ / W | Climb a ledge (while falling next to one) |
| ENTER | Start / confirm / skip |
| P | Pause |
| M | Music on/off (starts off; sound effects always play) |

### Tips

- **Deflect:** a well-timed sword swing knocks enemy knives right back at them (+50).
- **Gems** (red rubies) are treasure — the counter sits on the little rug, bottom-right.
- Bandits sometimes **raise their guard** — jump past and hit them from behind.
- The spear **chargers** can't turn — jump over (or hop on a shelf) and punish the recovery.
- The **brute** blocks knives and swings hard — strike just after his slam.
- Market **awnings** are bounce pads. Dried apricots heal one heart.
- Banner posts are checkpoints and refill your hearts. Your leap is huge — use it.

## The run

1. **Chapter I — The Orchard Outskirts** (morning): learn the ropes among the apricot trees.
2. **Chapter II — Bazaar of the Red Domes** (noon): rooftops, awnings, and a brute in a walled arena.
3. **Chapter III — Pass of the Iron Gate** (dusk): cliff bridges, and the Warlord himself at the fortress gate.

3 lives, checkpoints along the way, hidden treasure chests, one very armored warlord.

## Project layout

```
index.html        page + canvas
js/
  main.js         game states, level loading, HUD, loop
  input.js        keyboard + per-frame edge detection
  physics.js      AABB vs tile grid (solid / one-way / awning / spikes)
  camera.js       follow camera with lookahead + shake
  sprites.js      palette, pixel-map sprites, micro pixel font, tiles
  art_bg.js       parallax backdrop painters per level
  levels.js       level builder DSL + the three chapters
  player.js       movement, sword combo, knives, deflects, ledge climbs
  enemies.js      bandit / knife thrower / spear charger / brute
  boss.js         the Warlord (2 phases) + ground shockwaves
  projectiles.js  knives (yours, theirs, and deflected ones)
  pickups.js      coins, apricots, knives, chests, pots, checkpoints, exit gate
  particles.js    dust, sparks, puffs, coin flies, floating text, ambient leaves/fireflies
  audio.js        WebAudio SFX + pattern music sequencer
tools/
  sheet.mjs       (dev) render the sprite pixel-maps to a PNG sheet, if you have node
```

### Dev shortcuts

- `?level=0|1|2` — jump straight to a chapter.
- `?sheet` — sprite-sheet debug view.

Press **Enter** and go get your harvest back.
